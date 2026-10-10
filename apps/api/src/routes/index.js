import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { requireRole, ROLES } from '../middleware/rbac.middleware.js'
import doctorRoutes from '../modules/doctor/doctor.routes.js'
import bookingRoutes from '../modules/booking/booking.routes.js'
import { doctorController } from '../modules/doctor/doctor.controller.js'
import { bookingController } from '../modules/booking/booking.controller.js'
import { reportController } from '../modules/booking/report.controller.js'
import { serviceController } from '../modules/service/service.controller.js'
import { patientController } from '../modules/patient/patient.controller.js'
import { settingsController } from '../modules/settings/settings.controller.js'
import authRoutes from './auth.routes.js'
import medicineOrderRoutes from '../modules/medicine/medicineOrder.routes.js'
import userRoutes from '../modules/user/user.routes.js'
import invoiceRoutes from '../modules/invoices/invoice.route.js'
import { parseAnyDate } from '../utils/dateHelpers.js'
import sql from '../config/database.js'
import redis from '../config/redis.js'

const { SUPERADMIN, ADMIN, DOCTOR, RECEPTIONIST, PHARMACY, ASSISTANT_DOCTOR } = ROLES
const STAFF = [SUPERADMIN, ADMIN, RECEPTIONIST, PHARMACY, ASSISTANT_DOCTOR]

const router = Router()

// ─── Public routes (Unprotected - Website Visitors) ───────
router.use('/auth', authRoutes)

// Public Doctor Listings for website frontend (Team.jsx & BookAppointment.jsx)
router.get('/doctors', doctorController.getAll)
router.get('/doctors/:id', doctorController.getById)

// Public Appointment Booking Submission for website frontend
router.post('/bookings', async (req, res, next) => {
  try {
    const doctorRepo = (await import('../modules/doctor/doctor.repository.js')).default
    const patientService = (await import('../modules/patient/patient.service.js')).default

    let doctorId = req.body.doctorId
    let doctorName = req.body.doctor || req.body.doctorName

    // Find doctor by name if doctorId not passed directly
    if (!doctorId && doctorName) {
      const doctors = await doctorRepo.findAll()
      const docObj = doctors.find(d => d.name.toLowerCase().includes(String(doctorName).toLowerCase()))
      if (docObj) doctorId = docObj.id
    }

    const registrationData = {
      name: req.body.fullName || req.body.patientName || req.body.name || 'Patient',
      phone: req.body.phone || req.body.patientPhone || req.body.mobile || '',
      age: req.body.age ? parseInt(req.body.age, 10) : 30,
      gender: req.body.gender || 'Male',
      district: req.body.district || 'Chandauli',
      address: req.body.address || 'Chandauli',
      department: req.body.department || '',
      doctorId: doctorId || null,
      preferredDate: parseAnyDate(req.body.preferredDate || req.body.appointmentDate) || new Date(),
      problemDescription: req.body.message || req.body.problemDescription || '',
      type: req.body.type || 'OPD',
    }

    const source = req.body.source || req.body.bookingSource || 'website'

    const { patient, booking } = await patientService.registerPatientWithBooking(
      registrationData,
      { source },
      { validate: false }
    )

    res.status(201).json({
      success: true,
      bookingId: booking.bookingId,
      tokenNumber: booking.tokenNumber,
      uhid: patient?.uhid,
      patient,
      booking,
    })
  } catch (err) {
    next(err)
  }
})

// ─── All routes below require JWT (Staff & Dashboard) ──────
router.use(authMiddleware)

// Doctors — staff dashboard management
router.use('/doctors', requireRole(SUPERADMIN, ADMIN, DOCTOR, RECEPTIONIST, ASSISTANT_DOCTOR), doctorRoutes)

// Bookings (OPD + hospitalization) — staff dashboard management
router.use('/bookings', requireRole(SUPERADMIN, ADMIN, DOCTOR, RECEPTIONIST, ASSISTANT_DOCTOR), bookingRoutes)

// Medicine orders — pharmacy full, receptionist read-only
router.use('/medicine-orders', requireRole(SUPERADMIN, ADMIN, PHARMACY, RECEPTIONIST, DOCTOR), medicineOrderRoutes)

// Invoices — patient & booking details auto-fill lookup (Superadmin, Admin, Receptionist)
router.use('/invoices', requireRole(SUPERADMIN, ADMIN, RECEPTIONIST), invoiceRoutes)

// Medicines master list
router.get('/medicines', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { department_id, search } = req.query
    let rows = []
    if (search) {
      const q = `%${search}%`
      if (department_id) {
        rows = await sql`
          SELECT m.*, r.remark as remarks, d.dosage as default_dosage 
          FROM medicines m 
          LEFT JOIN medicine_remarks r ON m.remark_id = r.id 
          LEFT JOIN medicine_dosages d ON m.dosage_id = d.id 
          WHERE m.is_active = true AND m.department_id = ${department_id} AND (m.name ILIKE ${q} OR m.dosage_form ILIKE ${q}) 
          ORDER BY m.name ASC
        `
      } else {
        rows = await sql`
          SELECT m.*, r.remark as remarks, d.dosage as default_dosage 
          FROM medicines m 
          LEFT JOIN medicine_remarks r ON m.remark_id = r.id 
          LEFT JOIN medicine_dosages d ON m.dosage_id = d.id 
          WHERE m.is_active = true AND (m.name ILIKE ${q} OR m.dosage_form ILIKE ${q}) 
          ORDER BY m.name ASC
        `
      }
    } else if (department_id) {
      rows = await sql`
        SELECT m.*, r.remark as remarks, d.dosage as default_dosage 
        FROM medicines m 
        LEFT JOIN medicine_remarks r ON m.remark_id = r.id 
        LEFT JOIN medicine_dosages d ON m.dosage_id = d.id 
        WHERE m.is_active = true AND m.department_id = ${department_id} 
        ORDER BY m.name ASC
      `
    } else {
      rows = await sql`
        SELECT m.*, r.remark as remarks, d.dosage as default_dosage 
        FROM medicines m 
        LEFT JOIN medicine_remarks r ON m.remark_id = r.id 
        LEFT JOIN medicine_dosages d ON m.dosage_id = d.id 
        WHERE m.is_active = true 
        ORDER BY m.name ASC
      `
    }
    
    // Fetch frequency scores from Redis
    const scoreMap = {}
    try {
      const zrevrange = await redis.zrevrange('medicine_frequency', 0, -1, 'WITHSCORES')
      for (let i = 0; i < zrevrange.length; i += 2) {
        scoreMap[zrevrange[i]] = parseInt(zrevrange[i + 1], 10)
      }
    } catch (redisErr) {
      console.error('Redis error while fetching medicine frequency:', redisErr.message)
    }

    // Sort by frequency (descending), then alphabetically
    rows.sort((a, b) => {
      const scoreA = scoreMap[a.id] || 0
      const scoreB = scoreMap[b.id] || 0
      if (scoreA !== scoreB) {
        return scoreB - scoreA // higher score first
      }
      return a.name.localeCompare(b.name)
    })

    res.json({ data: rows })
  } catch (err) { next(err) }
})

const saveMedicineHandler = async (req, res, next) => {
  try {
    const { name, department_id, dosage_form, default_dosage, default_frequency, default_duration, remarks } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Medicine name is required' })
    }
    const nameTrimmed = name.trim()
    const dId = department_id ? Number(department_id) : null

    // Handle medicine_remarks logic
    let rId = null
    if (remarks && remarks.trim()) {
      const rmTrimmed = remarks.trim()
      const [exRm] = await sql`SELECT id FROM medicine_remarks WHERE LOWER(remark) = LOWER(${rmTrimmed}) LIMIT 1`
      if (exRm) {
        rId = exRm.id
      } else {
        const [newRm] = await sql`INSERT INTO medicine_remarks (remark, is_active) VALUES (${rmTrimmed}, true) RETURNING id`
        rId = newRm.id
      }
    }

    // Handle medicine_dosages logic
    let dsgId = null
    if (default_dosage && default_dosage.trim()) {
      const dsgTrimmed = default_dosage.trim()
      const [exDsg] = await sql`SELECT id FROM medicine_dosages WHERE LOWER(dosage) = LOWER(${dsgTrimmed}) LIMIT 1`
      if (exDsg) {
        dsgId = exDsg.id
      } else {
        const [newDsg] = await sql`INSERT INTO medicine_dosages (dosage, is_active) VALUES (${dsgTrimmed}, true) RETURNING id`
        dsgId = newDsg.id
      }
    }

    const [existing] = await sql`
      SELECT m.*, r.remark as remarks, d.dosage as default_dosage FROM medicines m
      LEFT JOIN medicine_remarks r ON m.remark_id = r.id
      LEFT JOIN medicine_dosages d ON m.dosage_id = d.id
      WHERE LOWER(m.name) = LOWER(${nameTrimmed})
        AND (m.department_id IS NULL OR m.department_id = ${dId})
      LIMIT 1
    `
    if (existing) {
      const updates = {}
      if (rId && existing.remark_id !== rId) updates.remark_id = rId
      if (dsgId && existing.dosage_id !== dsgId) updates.dosage_id = dsgId

      // Always increment frequency when a medicine is saved/prescribed
      try {
        await redis.zincrby('medicine_frequency', 1, existing.id)
      } catch (redisErr) {
        console.error('Redis error while incrementing frequency:', redisErr.message)
      }

      if (Object.keys(updates).length > 0) {
        const [updated] = await sql`
          UPDATE medicines SET ${sql(updates)} WHERE id = ${existing.id} RETURNING *
        `
        return res.json({ 
          success: true, 
          data: { ...updated, remarks: remarks ? remarks.trim() : null, default_dosage: default_dosage ? default_dosage.trim() : null }, 
          created: false 
        })
      }
      return res.json({ success: true, data: existing, created: false })
    }

    const [created] = await sql`
      INSERT INTO medicines (department_id, name, dosage_form, default_frequency, default_duration, is_active, remark_id, dosage_id)
      VALUES (${dId}, ${nameTrimmed}, ${dosage_form || 'Tab'}, ${default_frequency || ''}, ${default_duration || ''}, true, ${rId}, ${dsgId})
      RETURNING *
    `
    // Initial frequency for new medicine
    try {
      await redis.zincrby('medicine_frequency', 1, created.id)
    } catch (redisErr) {
      console.error('Redis error while incrementing frequency:', redisErr.message)
    }
    
    const dataEnriched = { 
      ...created, 
      remarks: remarks ? remarks.trim() : null,
      default_dosage: default_dosage ? default_dosage.trim() : null
    }
    res.status(201).json({ success: true, data: dataEnriched, created: true })
  } catch (err) { next(err) }
}

router.post('/medicines', requireRole(...STAFF, DOCTOR), saveMedicineHandler)
router.post('/save-medicine', requireRole(...STAFF, DOCTOR), saveMedicineHandler)
router.post('/savemedicine', requireRole(...STAFF, DOCTOR), saveMedicineHandler)

// PUT to update existing medicine's remark and dosage
router.put('/medicines/:id', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, remarks, default_dosage, dosage_form, default_frequency, default_duration } = req.body
    
    let rId = null
    if (remarks && remarks.trim()) {
      const rmTrimmed = remarks.trim()
      const [exRm] = await sql`SELECT id FROM medicine_remarks WHERE LOWER(remark) = LOWER(${rmTrimmed}) LIMIT 1`
      if (exRm) {
        rId = exRm.id
      } else {
        const [newRm] = await sql`INSERT INTO medicine_remarks (remark, is_active) VALUES (${rmTrimmed}, true) RETURNING id`
        rId = newRm.id
      }
    }

    let dsgId = null
    if (default_dosage && default_dosage.trim()) {
      const dsgTrimmed = default_dosage.trim()
      const [exDsg] = await sql`SELECT id FROM medicine_dosages WHERE LOWER(dosage) = LOWER(${dsgTrimmed}) LIMIT 1`
      if (exDsg) {
        dsgId = exDsg.id
      } else {
        const [newDsg] = await sql`INSERT INTO medicine_dosages (dosage, is_active) VALUES (${dsgTrimmed}, true) RETURNING id`
        dsgId = newDsg.id
      }
    }
    
    const updates = {}
    if (name !== undefined && name.trim() !== '') updates.name = name.trim()
    if (rId !== null) updates.remark_id = rId
    if (dsgId !== null) updates.dosage_id = dsgId
    if (dosage_form) updates.dosage_form = dosage_form
    if (default_frequency !== undefined) updates.default_frequency = default_frequency
    if (default_duration !== undefined) updates.default_duration = default_duration

    if (Object.keys(updates).length > 0) {
      const [updated] = await sql`
        UPDATE medicines SET ${sql(updates)} WHERE id = ${id} RETURNING *
      `
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Medicine not found' })
      }
      
      // Increment frequency
      try {
        await redis.zincrby('medicine_frequency', 1, id)
      } catch (redisErr) {
        console.error('Redis error while incrementing frequency:', redisErr.message)
      }

      return res.json({ success: true, data: { ...updated, remarks: remarks ? remarks.trim() : null, default_dosage: default_dosage ? default_dosage.trim() : null } })
    }
    
    const [existing] = await sql`SELECT * FROM medicines WHERE id = ${id} LIMIT 1`
    if (existing) {
      try {
        await redis.zincrby('medicine_frequency', 1, id)
      } catch (redisErr) {
        console.error('Redis error while incrementing frequency:', redisErr.message)
      }
    }
    res.json({ success: true, data: existing })
  } catch (err) { next(err) }
})

router.delete('/medicines/:id', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const id = req.params.id
    const [deleted] = await sql`DELETE FROM medicines WHERE id = ${id} RETURNING *`
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Medicine not found' })
    }
    res.json({ success: true, data: deleted })
  } catch (err) { next(err) }
})

// Medicine Remarks API
router.get('/medicine-remarks', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const rows = await sql`SELECT * FROM medicine_remarks WHERE is_active = true ORDER BY remark ASC`
    res.json({ data: rows })
  } catch (err) { next(err) }
})

// Medicine Dosages API
router.get('/medicine-dosages', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const rows = await sql`SELECT * FROM medicine_dosages WHERE is_active = true ORDER BY dosage ASC`
    res.json({ data: rows })
  } catch (err) { next(err) }
})

// Lab tests master list
router.get('/lab-tests', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { department_id, search } = req.query
    let rows = []
    if (search) {
      const q = `%${search}%`
      rows = await sql`SELECT * FROM lab_tests WHERE is_active = true AND name ILIKE ${q} ORDER BY name ASC`
    } else if (department_id) {
      rows = await sql`SELECT * FROM lab_tests WHERE is_active = true AND (department_id IS NULL OR department_id = ${department_id}) ORDER BY name ASC`
    } else {
      rows = await sql`SELECT * FROM lab_tests WHERE is_active = true ORDER BY name ASC`
    }
    res.json({ data: rows })
  } catch (err) { next(err) }
})

const saveLabTestHandler = async (req, res, next) => {
  try {
    const { name, department_id, category } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Test name is required' })
    }
    const testTrimmed = name.trim()
    const dId = department_id ? Number(department_id) : null

    const [existing] = await sql`
      SELECT * FROM lab_tests 
      WHERE LOWER(name) = LOWER(${testTrimmed})
      LIMIT 1
    `
    if (existing) {
      return res.json({ success: true, data: existing, created: false })
    }

    const [created] = await sql`
      INSERT INTO lab_tests (department_id, name, category, is_active)
      VALUES (${dId}, ${testTrimmed}, ${category || 'General'}, true)
      RETURNING *
    `
    res.status(201).json({ success: true, data: created, created: true })
  } catch (err) { next(err) }
}

router.post('/lab-tests', requireRole(...STAFF, DOCTOR), saveLabTestHandler)
router.post('/save-lab-test', requireRole(...STAFF, DOCTOR), saveLabTestHandler)
router.post('/savelabtest', requireRole(...STAFF, DOCTOR), saveLabTestHandler)

router.put('/lab-tests/:id', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { id } = req.params
    const { category } = req.body
    
    const [updated] = await sql`
      UPDATE lab_tests 
      SET 
        category = COALESCE(${category === undefined ? null : category}, category)
      WHERE id = ${id}
      RETURNING *
    `
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lab test not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

router.delete('/lab-tests/:id', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { id } = req.params
    const [deleted] = await sql`
      DELETE FROM lab_tests 
      WHERE id = ${id}
      RETURNING *
    `
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Lab test not found' })
    }
    res.json({ success: true, data: deleted })
  } catch (err) { next(err) }
})

// Additional Advice master list
router.get('/additional-advice', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { department_id, search } = req.query
    let rows = []
    if (search) {
      const q = `%${search}%`
      rows = await sql`SELECT * FROM additional_advice WHERE is_active = true AND advice ILIKE ${q} ORDER BY advice ASC`
    } else if (department_id) {
      rows = await sql`SELECT * FROM additional_advice WHERE is_active = true AND (department_id IS NULL OR department_id = ${department_id}) ORDER BY advice ASC`
    } else {
      rows = await sql`SELECT * FROM additional_advice WHERE is_active = true ORDER BY advice ASC`
    }
    res.json({ data: rows })
  } catch (err) { next(err) }
})

const saveAdviceHandler = async (req, res, next) => {
  try {
    const { advice, department_id } = req.body
    if (!advice || !advice.trim()) {
      return res.status(400).json({ success: false, message: 'Advice text is required' })
    }
    const adviceTrimmed = advice.trim()
    const dId = department_id ? Number(department_id) : null

    const [existing] = await sql`
      SELECT * FROM additional_advice 
      WHERE LOWER(advice) = LOWER(${adviceTrimmed})
      LIMIT 1
    `
    if (existing) {
      return res.json({ success: true, data: existing, created: false })
    }

    const [created] = await sql`
      INSERT INTO additional_advice (department_id, advice, is_active)
      VALUES (${dId}, ${adviceTrimmed}, true)
      RETURNING *
    `
    res.status(201).json({ success: true, data: created, created: true })
  } catch (err) { next(err) }
}

router.post('/additional-advice', requireRole(...STAFF, DOCTOR), saveAdviceHandler)

router.put('/additional-advice/:id', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { id } = req.params
    const { advice } = req.body
    
    const [updated] = await sql`
      UPDATE additional_advice 
      SET 
        advice = COALESCE(${advice === undefined ? null : advice}, advice)
      WHERE id = ${id}
      RETURNING *
    `
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Advice not found' })
    }
    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
})

router.delete('/additional-advice/:id', requireRole(...STAFF, DOCTOR), async (req, res, next) => {
  try {
    const { id } = req.params
    const [deleted] = await sql`
      DELETE FROM additional_advice 
      WHERE id = ${id}
      RETURNING *
    `
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Advice not found' })
    }
    res.json({ success: true, data: deleted })
  } catch (err) { next(err) }
})

// Staff management — superadmin + admin
router.use('/users', requireRole(SUPERADMIN, ADMIN), userRoutes)

// Services catalogue
router.get('/services',       requireRole(...STAFF, DOCTOR), serviceController.getAll)
router.get('/services/:id',   requireRole(...STAFF, DOCTOR), serviceController.getById)
router.post('/services',      requireRole(SUPERADMIN, ADMIN), serviceController.create)
router.put('/services/:id',   requireRole(SUPERADMIN, ADMIN), serviceController.update)
router.delete('/services/:id', requireRole(SUPERADMIN, ADMIN), serviceController.delete)

// Time Slots — disabled (replaced by maxPatientsPerDay on Doctor model)
// router.get('/timeslots',          requireRole(...STAFF, DOCTOR), bookingController.getSlots)
// router.post('/timeslots',         requireRole(SUPERADMIN, ADMIN), bookingController.createSlot)
// router.delete('/timeslots/:id',   requireRole(SUPERADMIN, ADMIN), bookingController.deleteSlot)
// router.patch('/timeslots/:id/toggle', requireRole(SUPERADMIN, ADMIN), bookingController.toggleSlot)

// Patients — doctor sees own only
router.get('/patients/mine',  requireRole(DOCTOR), patientController.getMine)
router.post('/patients/register', requireRole(SUPERADMIN, ADMIN, RECEPTIONIST, ASSISTANT_DOCTOR), patientController.register)
router.get('/patients',       requireRole(SUPERADMIN, ADMIN, DOCTOR, RECEPTIONIST, PHARMACY, ASSISTANT_DOCTOR), patientController.search)
router.get('/patients/:id',   requireRole(SUPERADMIN, ADMIN, DOCTOR, RECEPTIONIST, PHARMACY, ASSISTANT_DOCTOR), patientController.getById)
router.put('/patients/:id',   requireRole(SUPERADMIN, ADMIN, RECEPTIONIST, ASSISTANT_DOCTOR), patientController.update)

// Settings — superadmin only
router.get('/settings', requireRole(SUPERADMIN), settingsController.get)
router.put('/settings', requireRole(SUPERADMIN), settingsController.update)

// Dashboard
router.get('/dashboard/stats',  requireRole(SUPERADMIN, ADMIN), bookingController.getStats)
router.get('/dashboard/recent', requireRole(SUPERADMIN, ADMIN), bookingController.getRecent)
router.get('/dashboard/chart',  requireRole(SUPERADMIN, ADMIN), bookingController.getChart)

// Reports
router.get('/reports/bookings',             requireRole(SUPERADMIN, ADMIN), reportController.getBookingTrends)
router.get('/reports/doctors',              requireRole(SUPERADMIN, ADMIN), reportController.getDoctorStats)
router.get('/reports/status-distribution',  requireRole(SUPERADMIN, ADMIN), reportController.getStatusDistribution)
router.get('/reports/revenue',              requireRole(SUPERADMIN, ADMIN), reportController.getRevenue)

export default router
