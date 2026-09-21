import patientService from './patient.service.js'
import bookingRepo from '../booking/booking.repository.js'
import medOrderRepo from '../medicine/medicineOrder.repository.js'

export const patientController = {
  async search(req, res, next) {
    try {
      // Doctors see only their assigned patients (derived from their bookings).
      if (req.admin?.role === 'doctor') {
        if (!req.admin.doctorId) {
          return res.status(403).json({ success: false, message: 'No doctor profile linked to this login' })
        }
        const patients = await patientService.getDoctorPatients(req.admin.doctorId)
        const q = (req.query.search || '').toLowerCase()
        const filtered = q
          ? patients.filter((p) => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q))
          : patients
        return res.json({
          data: filtered,
          total: filtered.length,
          page: 1,
          limit: filtered.length || 10,
          totalPages: 1
        })
      }
      const filters = {
        isOld: req.query.isOld,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
      }
      const paginated = await patientService.searchPatients(req.query.search, filters)
      
      // Pharmacy sees only patients linked to medicine orders.
      let scoped = paginated.data
      if (req.admin?.role === 'pharmacy') {
        const { data: orders } = await medOrderRepo.findAll({}, { limit: 10000 })
        const linked = new Set(orders.map(o => String(o.patientId?.id || o.patientId || '')).filter(Boolean))
        scoped = paginated.data.filter((p) => linked.has(String(p.id)))
      }
      // Enrich with booking count + last visit using a single query
      const patientIds = scoped.map(p => p.id)
      const summaries = await bookingRepo.getPatientSummaries(patientIds)
      const summaryMap = new Map(summaries.map(s => [String(s.patient_id), s]))

      const enriched = scoped.map((p) => {
        const pData = { ...p }
        const s = summaryMap.get(String(p.id)) || { total_bookings: 0, last_visit: null }
        pData.totalBookings = Number(s.total_bookings) || 0
        pData.lastVisit = s.last_visit || p.lastVisited || null
        return pData
      })

      res.json({ ...paginated, data: enriched })
    } catch (err) { next(err) }
  },

  async getById(req, res, next) {
    try {
      const patient = await patientService.getPatientById(req.params.id)
      if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' })

      // Get their bookings
      const bookings = await bookingRepo.findAll({ patientId: patient.id }, { page: 1, limit: 50 })

      res.json({ ...patient, bookings: bookings.data })
    } catch (err) { next(err) }
  },

  /**
   * POST /api/patients/register — receptionist offline registration.
   */
  async register(req, res, next) {
    try {
      const source = req.admin?.role === 'receptionist' ? 'offline' : 'admin'
      const { patient, booking } = await patientService.registerPatientWithBooking(
        req.body,
        {
          source,
          createdBy: req.admin?.id || null,
          createdByRole: req.admin?.role || null,
        }
      )
      res.status(201).json({ success: true, patient, booking })
    } catch (err) { next(err) }
  },

  /**
   * GET /api/patients/mine — doctor's assigned patients (scoped from JWT).
   */
  async getMine(req, res, next) {
    try {
      if (!req.admin?.doctorId) {
        return res.status(403).json({ success: false, message: 'No doctor profile linked to this login' })
      }
      const patients = await patientService.getDoctorPatients(req.admin.doctorId)
      res.json(patients)
    } catch (err) { next(err) }
  },
}
