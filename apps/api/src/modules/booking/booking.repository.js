import sql from '../../config/database.js'
import patientRepo from '../patient/patient.repository.js'
import { toObjectIdString } from '../../utils/registration.js'

function mapBooking(row) {
  if (!row) return null
  const meta = row.meta || {}
  const isOld = Boolean(row.patient_is_old)
  const baseFee = row.doctor_fee !== undefined && row.doctor_fee !== null ? Number(row.doctor_fee) : 0
  const oldFee = row.doctor_old_patient_fee !== undefined && row.doctor_old_patient_fee !== null ? Number(row.doctor_old_patient_fee) : 0
  const emergencyFee = row.doctor_emergency_fee !== undefined && row.doctor_emergency_fee !== null ? Number(row.doctor_emergency_fee) : 0
  
  const doctorFee = (isOld && oldFee > 0) ? oldFee : baseFee

  return {
    id: row.id,
    _id: row.id,
    bookingId: row.booking_id,
    booking_id: row.booking_id,
    preferredDate: row.appointment_date,
    appointmentDate: row.appointment_date,
    date: row.appointment_date,
    status: row.status,
    tokenNumber: row.token_number,
    token_number: row.token_number,
    tokenIssued: Boolean(meta.tokenIssued),
    notes: row.problem_description || '',
    problemDescription: row.problem_description || '',
    visitType: row.type || 'OPD',
    type: row.type || 'OPD',
    vitalBp: meta.vitalBp || '',
    vitalPulse: meta.vitalPulse || '',
    vitalTemp: meta.vitalTemp || '',
    vitalWeight: meta.vitalWeight || '',
    vitalSpo2: meta.vitalSpo2 || '',
    category: meta.category || '',
    visitNumber: meta.visitNumber || null,
    prescription: meta.prescription || null,
    meta: meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    address: row.patient_address || '',
    district: row.patient_district || '',
    pinCode: row.patient_pin_code || '',
    patient_name: row.patient_name || '',
    patient_phone: row.patient_phone || '',
    mobile: row.patient_phone || '',
    patient_uhid: row.patient_uhid !== null && row.patient_uhid !== undefined ? String(row.patient_uhid) : '',
    uhid: row.patient_uhid !== null && row.patient_uhid !== undefined ? String(row.patient_uhid) : '',
    doctor_name: row.doctor_name || '',
    doctor_specialization: row.department_name || '',
    consultation_fee: doctorFee,
    doctor_fee: doctorFee,
    consultationFee: doctorFee,
    old_patient_fee: oldFee,
    emergency_fee: emergencyFee,
    doctorId: row.doctor_id ? {
      id: row.doctor_id,
      _id: row.doctor_id,
      name: row.doctor_name || '',
      department: row.department_name || '',
      role: 'doctor',
      consultationFee: baseFee,
      oldPatientFee: oldFee,
      emergencyFee: emergencyFee,
    } : null,
    patientId: row.patient_id ? {
      id: row.patient_id,
      _id: row.patient_id,
      name: row.patient_name || '',
      phone: row.patient_phone || '',
      uhid: row.patient_uhid !== null && row.patient_uhid !== undefined ? String(row.patient_uhid) : null,
      age: row.patient_age || null,
      gender: row.patient_gender || null,
      address: row.patient_address || '',
      district: row.patient_district || '',
      pinCode: row.patient_pin_code || '',
      isOld: Boolean(row.patient_is_old),
    } : null,
    serviceId: row.service_id ? {
      id: row.service_id,
      _id: row.service_id,
      name: row.service_name || '',
      price: Number(row.service_price || 0),
      duration: row.service_duration || 30,
    } : null,
    slotId: row.slot_id ? {
      id: row.slot_id,
      _id: row.slot_id,
      date: row.slot_date,
      startTime: row.slot_start_time,
      endTime: row.slot_end_time,
    } : null,
  }
}

const SELECT_BOOKING_WITH_JOINS = sql`
  SELECT
    b.*,
    d.name AS doctor_name,
    d.consultation_fee AS doctor_fee,
    d.old_patient_fee AS doctor_old_patient_fee,
    d.emergency_fee AS doctor_emergency_fee,
    dep.name AS department_name,
    p.name AS patient_name,
    p.phone AS patient_phone,
    p.uhid AS patient_uhid,
    p.age AS patient_age,
    p.gender AS patient_gender,
    p.is_old AS patient_is_old,
    p.address AS patient_address,
    p.district AS patient_district,
    p.pin_code AS patient_pin_code,
    s.name AS service_name,
    s.price AS service_price,
    s.duration_minutes AS service_duration,
    ts.slot_date,
    ts.start_time AS slot_start_time,
    ts.end_time AS slot_end_time
  FROM bookings b
  LEFT JOIN doctors d ON b.doctor_id = d.id
  LEFT JOIN departments dep ON d.department_id = dep.id
  LEFT JOIN patients p ON b.patient_id = p.id
  LEFT JOIN services s ON b.service_id = s.id
  LEFT JOIN time_slots ts ON b.slot_id = ts.id
`

class BookingRepository {
  async findAll(filter = {}, { page = 1, limit = 10, sortBy = 'preferredDate', sortOrder = 'desc' } = {}) {
    page = parseInt(page, 10) || 1
    limit = parseInt(limit, 10) || 10
    limit = Math.min(Math.max(limit, 1), 200)
    const offset = (page - 1) * limit

    const conditions = []
    if (filter.doctorId) conditions.push(sql`b.doctor_id = ${filter.doctorId}`)
    if (filter.patientId) conditions.push(sql`b.patient_id = ${filter.patientId}`)
    if (filter.status) conditions.push(sql`b.status = ${filter.status}`)
    if (filter.visitType || filter.type) conditions.push(sql`b.type = ${filter.visitType || filter.type}`)
    if (filter.preferredDate || filter.appointmentDate) {
      conditions.push(sql`b.appointment_date = ${filter.preferredDate || filter.appointmentDate}`)
    }
    if (filter.isOld !== undefined && filter.isOld !== null && filter.isOld !== '') {
      const isOldBool = (filter.isOld === 'true' || filter.isOld === true)
      conditions.push(sql`p.is_old = ${isOldBool}`)
    }
    if (filter.search) {
      const q = `%${filter.search}%`
      conditions.push(sql`(
        p.name ILIKE ${q}
        OR p.phone ILIKE ${q}
        OR p.uhid ILIKE ${q}
        OR p.uhid::text ILIKE ${q}
        OR b.booking_id ILIKE ${q}
        OR b.token_number ILIKE ${q}
      )`)
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``

    const sortCol = (sortBy === 'createdAt' || sortBy === 'created_at') ? sql`b.created_at` : sql`b.appointment_date`
    const orderDir = (sortOrder === 'asc' || sortOrder === '1' || sortOrder === 1) ? sql`ASC` : sql`DESC`

    const rows = await sql`
      ${SELECT_BOOKING_WITH_JOINS}
      ${whereClause}
      ORDER BY ${sortCol} ${orderDir}, b.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [totalRow] = await sql`SELECT count(*) FROM bookings b LEFT JOIN patients p ON b.patient_id = p.id ${whereClause}`
    const [confirmedRow] = await sql`SELECT count(*) FROM bookings b LEFT JOIN patients p ON b.patient_id = p.id ${whereClause ? sql`${whereClause} AND b.status = 'confirmed'` : sql`WHERE b.status = 'confirmed'`}`
    const [pendingRow] = await sql`SELECT count(*) FROM bookings b LEFT JOIN patients p ON b.patient_id = p.id ${whereClause ? sql`${whereClause} AND b.status = 'pending'` : sql`WHERE b.status = 'pending'`}`
    const [cancelledRow] = await sql`SELECT count(*) FROM bookings b LEFT JOIN patients p ON b.patient_id = p.id ${whereClause ? sql`${whereClause} AND b.status = 'cancelled'` : sql`WHERE b.status = 'cancelled'`}`
    const [completedRow] = await sql`SELECT count(*) FROM bookings b LEFT JOIN patients p ON b.patient_id = p.id ${whereClause ? sql`${whereClause} AND b.status = 'completed'` : sql`WHERE b.status = 'completed'`}`
    const [oldRow] = await sql`SELECT count(*) FROM bookings b LEFT JOIN patients p ON b.patient_id = p.id ${whereClause ? sql`${whereClause} AND p.is_old = true` : sql`WHERE p.is_old = true`}`
    const [newRow] = await sql`SELECT count(*) FROM bookings b LEFT JOIN patients p ON b.patient_id = p.id ${whereClause ? sql`${whereClause} AND p.is_old = false` : sql`WHERE p.is_old = false`}`

    const total = Number(totalRow.count)

    return {
      data: rows.map(mapBooking),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalBookings: total,
        confirmedCount: Number(confirmedRow.count),
        pendingCount: Number(pendingRow.count),
        cancelledCount: Number(cancelledRow.count),
        completedCount: Number(completedRow.count),
        oldPatientCount: Number(oldRow.count),
        newPatientCount: Number(newRow.count),
      },
    }
  }

  async findById(id) {
    const coercedId = toObjectIdString(id)
    if (!coercedId) return null
    const [row] = await sql`
      ${SELECT_BOOKING_WITH_JOINS}
      WHERE b.id = ${coercedId}
    `
    return mapBooking(row)
  }

  async findDistinctPatientIdsByDoctor(doctorId) {
    const coercedDoctorId = toObjectIdString(doctorId)
    if (!coercedDoctorId) return []
    const rows = await sql`
      SELECT DISTINCT patient_id
      FROM bookings
      WHERE doctor_id = ${coercedDoctorId} AND status != 'cancelled'
    `
    return rows.map(r => r.patient_id)
  }

  async findByPatientPhone(phone) {
    const patient = await patientRepo.findByPhone(phone)
    if (!patient) return []

    const rows = await sql`
      ${SELECT_BOOKING_WITH_JOINS}
      WHERE b.patient_id = ${patient.id} AND b.status != 'cancelled'
      ORDER BY b.created_at DESC
    `
    return rows.map(mapBooking)
  }

  async create(data) {
    const meta = {
      vitalBp: data.vitalBp || '',
      vitalPulse: data.vitalPulse || '',
      vitalTemp: data.vitalTemp || '',
      vitalWeight: data.vitalWeight || '',
      vitalSpo2: data.vitalSpo2 || '',
      tokenIssued: Boolean(data.tokenIssued),
      category: data.category || '',
      visitNumber: data.visitNumber || null,
    }

    const [row] = await sql`
      INSERT INTO bookings (
        booking_id, doctor_id, patient_id, department_id, service_id, slot_id,
        appointment_date, type, status, token_number, problem_description,
        contact_phone, meta
      ) VALUES (
        ${data.bookingId},
        ${data.doctorId || null},
        ${data.patientId || null},
        ${data.departmentId || null},
        ${data.serviceId || null},
        ${data.slotId || null},
        ${data.preferredDate || data.appointmentDate || null},
        ${data.visitType || data.type || 'OPD'},
        ${data.status || 'pending'},
        ${data.tokenNumber || null},
        ${data.notes || data.problemDescription || ''},
        ${data.phone || data.contactPhone || ''},
        ${sql.json(meta)}
      )
      RETURNING id
    `
    return this.findById(row.id)
  }

  async updateStatus(id, status) {
    const [row] = await sql`
      UPDATE bookings
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    if (!row) return null
    return this.findById(row.id)
  }

  async updateBooking(id, data) {
    const coercedId = toObjectIdString(id)
    if (!coercedId) return null

    const [existing] = await sql`SELECT patient_id FROM bookings WHERE id = ${coercedId}`
    if (!existing) return null

    if (existing.patient_id) {
      await sql`
        UPDATE patients
        SET
          name = COALESCE(${data.name || data.patientName || null}, name),
          phone = COALESCE(${data.phone || data.mobile || null}, phone),
          age = COALESCE(${data.age !== undefined && data.age !== '' ? parseInt(data.age, 10) : null}, age),
          gender = COALESCE(${data.gender || null}, gender),
          address = COALESCE(${data.address || null}, address),
          district = COALESCE(${data.district || null}, district),
          pin_code = COALESCE(${data.pinCode || null}, pin_code)
        WHERE id = ${existing.patient_id}
      `
    }

    await sql`
      UPDATE bookings
      SET
        doctor_id = COALESCE(${data.doctorId || null}, doctor_id),
        department_id = COALESCE(${data.departmentId || null}, department_id),
        appointment_date = COALESCE(${data.preferredDate || data.appointmentDate || null}, appointment_date),
        type = COALESCE(${data.visitType || data.type || null}, type),
        problem_description = COALESCE(${data.notes || data.problemDescription || null}, problem_description),
        status = COALESCE(${data.status || null}, status),
        updated_at = NOW()
      WHERE id = ${coercedId}
    `

    return this.findById(coercedId)
  }

  async updateVitals(id, vitals) {
    const [existing] = await sql`SELECT meta FROM bookings WHERE id = ${id}`
    const currentMeta = existing?.meta || {}
    const newMeta = {
      ...currentMeta,
      vitalBp: vitals.vitalBp !== undefined ? vitals.vitalBp : currentMeta.vitalBp,
      vitalPulse: vitals.vitalPulse !== undefined ? vitals.vitalPulse : currentMeta.vitalPulse,
      vitalTemp: vitals.vitalTemp !== undefined ? vitals.vitalTemp : currentMeta.vitalTemp,
      vitalWeight: vitals.vitalWeight !== undefined ? vitals.vitalWeight : currentMeta.vitalWeight,
      vitalSpo2: vitals.vitalSpo2 !== undefined ? vitals.vitalSpo2 : currentMeta.vitalSpo2,
    }

    const [row] = await sql`
      UPDATE bookings
      SET
        meta = ${sql.json(newMeta)},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    if (!row) return null
    return this.findById(row.id)
  }

  async updatePrescription(id, prescriptionData) {
    const [existing] = await sql`SELECT meta, department_id FROM bookings WHERE id = ${id}`
    const currentMeta = existing?.meta || {}
    const deptId = existing?.department_id || null
    const rxPayload = prescriptionData.prescription || prescriptionData

    const medicinesList = rxPayload.medicines || []
    const testsList = rxPayload.tests || []

    // 1. Auto-insert new medicines into master 'medicines' table if not exists
    for (const med of medicinesList) {
      if (!med.name || !med.name.trim()) continue
      const nameTrimmed = med.name.trim()
      try {
        const [found] = await sql`
          SELECT id FROM medicines 
          WHERE LOWER(name) = LOWER(${nameTrimmed})
            AND (department_id IS NULL OR department_id = ${deptId})
          LIMIT 1
        `
        if (!found) {
          await sql`
            INSERT INTO medicines (department_id, name, default_dosage, default_frequency, default_duration, is_active)
            VALUES (${deptId}, ${nameTrimmed}, ${med.dosage || ''}, ${med.frequency || ''}, ${med.duration || ''}, true)
          `
        }
      } catch (err) {
        // Ignore duplicate insert errors gracefully
      }
    }

    // 2. Auto-insert new lab tests into master 'lab_tests' table if not exists
    for (const t of testsList) {
      if (!t.name || !t.name.trim()) continue
      const testTrimmed = t.name.trim()
      try {
        const [found] = await sql`
          SELECT id FROM lab_tests 
          WHERE LOWER(name) = LOWER(${testTrimmed})
          LIMIT 1
        `
        if (!found) {
          await sql`
            INSERT INTO lab_tests (department_id, name, category, is_active)
            VALUES (${deptId}, ${testTrimmed}, 'General', true)
          `
        }
      } catch (err) {
        // Ignore duplicate insert errors gracefully
      }
    }

    // 3. Store lightweight prescription payload on booking
    const newMeta = {
      ...currentMeta,
      prescription: {
        vitals: rxPayload.vitals || {},
        doctor_notes: rxPayload.doctor_notes || '',
        medicines: medicinesList.map(m => ({
          name: m.name,
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          duration: m.duration || '',
          remarks: m.remarks || '',
        })),
        tests: testsList.map(t => ({
          name: t.name,
          remarks: t.remarks || '',
        })),
        updated_at: new Date().toISOString(),
      },
    }

    const [row] = await sql`
      UPDATE bookings
      SET
        meta = ${sql.json(newMeta)},
        status = 'completed',
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    if (!row) return null
    return this.findById(row.id)
  }

  async delete(id) {
    const booking = await this.findById(id)
    if (!booking) return null
    await sql`DELETE FROM bookings WHERE id = ${id}`
    return booking
  }

  async countByDatePrefix(prefix) {
    const pattern = `${prefix}%`
    const [row] = await sql`
      SELECT count(*) FROM bookings
      WHERE booking_id LIKE ${pattern}
    `
    return Number(row.count)
  }

  async getStats() {
    try {
      const [summary] = await sql`SELECT * FROM total_analytics_summary WHERE id = 1`
      if (summary) {
        const [todayRow] = await sql`SELECT count(*) AS today_count FROM bookings WHERE created_at >= CURRENT_DATE`
        return {
          total: Number(summary.total_bookings),
          todayCount: Number(todayRow?.today_count || 0),
          confirmed: Number(summary.total_confirmed_bookings),
          cancelled: Number(summary.total_cancelled_bookings),
        }
      }
    } catch {
      // Fallback if summary table does not exist
    }

    const [row] = await sql`
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE created_at >= CURRENT_DATE) AS today_count,
        count(*) FILTER (WHERE status = 'confirmed') AS confirmed,
        count(*) FILTER (WHERE status = 'cancelled') AS cancelled
      FROM bookings
    `
    return {
      total: Number(row.total),
      todayCount: Number(row.today_count),
      confirmed: Number(row.confirmed),
      cancelled: Number(row.cancelled),
    }
  }

  async getRecent(limit = 5) {
    const rows = await sql`
      ${SELECT_BOOKING_WITH_JOINS}
      ORDER BY b.created_at DESC
      LIMIT ${limit}
    `
    return rows.map(mapBooking)
  }

  async getChartData(daysBack = 7) {
    const rows = await sql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') AS _id,
        count(*)::int AS bookings,
        count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
        count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM bookings
      WHERE created_at >= CURRENT_DATE - (INTERVAL '1 day' * ${daysBack})
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY _id ASC
    `
    return rows
  }

  async getDoctorReportStats() {
    const rows = await sql`
      SELECT
        d.name AS doctor,
        count(b.id)::int AS bookings,
        COALESCE(SUM(d.consultation_fee), 0)::numeric AS revenue,
        count(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))::int AS completed,
        CASE
          WHEN count(b.id) > 0 THEN
            ROUND((count(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))::numeric / count(b.id)::numeric) * 100)
          ELSE 0
        END AS completion_rate
      FROM bookings b
      JOIN doctors d ON b.doctor_id = d.id
      GROUP BY d.id, d.name
      ORDER BY bookings DESC
    `
    return rows.map(r => ({
      doctor: r.doctor,
      bookings: Number(r.bookings),
      revenue: Number(r.revenue),
      completion_rate: Number(r.completion_rate),
    }))
  }

  async getStatusDistribution() {
    const rows = await sql`
      SELECT
        INITCAP(status::text) AS name,
        count(*)::int AS value
      FROM bookings
      GROUP BY status
      ORDER BY name ASC
    `
    return rows
  }

  async getRevenueStats() {
    const [row] = await sql`
      SELECT
        COALESCE(SUM(d.consultation_fee), 0)::numeric AS total,
        count(b.id)::int AS count,
        MIN(b.created_at) AS oldest_booking
      FROM bookings b
      JOIN doctors d ON b.doctor_id = d.id
      WHERE b.status != 'cancelled'
    `
    const total = Number(row?.total || 0)
    const oldest = row?.oldest_booking ? new Date(row.oldest_booking) : new Date()
    const daySpan = Math.max(1, Math.ceil((Date.now() - oldest.getTime()) / 86400000))

    return {
      total,
      average_per_day: Math.round(total / daySpan),
      growth: 0,
    }
  }

  async getLatestInfertilityVisitCount(patientId) {
    const coercedPatientId = toObjectIdString(patientId)
    if (!coercedPatientId) return 0
    try {
      const [row] = await sql`
        SELECT COUNT(*)::int AS count
        FROM bookings
        WHERE patient_id = ${coercedPatientId}
          AND status != 'cancelled'
          AND (
            meta->>'category' = 'Infertility'
            OR problem_description ILIKE '%infertility%'
            OR problem_description ILIKE '%बांझपन%'
            OR problem_description ILIKE '%निःसंतानता%'
          )
      `
      return Number(row?.count || 0)
    } catch (e) {
      return 0
    }
  }

  async hasBookingForPatientOnDate(patientId, targetDate) {
    const coercedPatientId = toObjectIdString(patientId)
    if (!coercedPatientId || !targetDate) return false
    const d = new Date(targetDate)
    if (isNaN(d.getTime())) return false
    const dateStr = d.toISOString().slice(0, 10)
    try {
      const [row] = await sql`
        SELECT id FROM bookings
        WHERE patient_id = ${coercedPatientId}
          AND status != 'cancelled'
          AND appointment_date::date = ${dateStr}::date
        LIMIT 1
      `
      return Boolean(row)
    } catch (e) {
      return false
    }
  }

  async countBookingsForDoctorOnDate(doctorId, targetDate) {
    const coercedDoctorId = toObjectIdString(doctorId)
    if (!coercedDoctorId || !targetDate) return 0
    const d = new Date(targetDate)
    if (isNaN(d.getTime())) return 0
    const dateStr = d.toISOString().slice(0, 10)
    try {
      const [row] = await sql`
        SELECT COUNT(*)::int AS count
        FROM bookings
        WHERE doctor_id = ${coercedDoctorId}
          AND status != 'cancelled'
          AND appointment_date::date = ${dateStr}::date
      `
      return Number(row?.count || 0)
    } catch (e) {
      return 0
    }
  }

  async getPatientSummaries(patientIds) {
    if (!patientIds || !patientIds.length) return []
    const rows = await sql`
      SELECT patient_id, count(*) as total_bookings, max(created_at) as last_visit
      FROM bookings
      WHERE patient_id IN ${sql(patientIds)}
      GROUP BY patient_id
    `
    return rows
  }
}

export default new BookingRepository()
