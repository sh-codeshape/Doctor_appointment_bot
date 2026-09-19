import sql from '../../config/database.js'
import patientRepo from './patient.repository.js'
import bookingService from '../booking/booking.service.js'
import bookingRepo from '../booking/booking.repository.js'
import idsService from '../ids/ids.service.js'
import { normalizePhone } from '../../utils/phone.js'
import { toGender, validateRegistration, toObjectIdString } from '../../utils/registration.js'
import { AppError } from '../../middleware/errorHandler.js'
import logger from '../../utils/logger.js'

class PatientService {
  async findByPhone(phone) {
    return patientRepo.findByPhone(phone)
  }

  async findAllByPhone(phone) {
    return patientRepo.findAllByPhone(phone)
  }

  async findOrCreateByPhone(phone, data = {}) {
    let patient = await patientRepo.findOrCreate(phone, data)
    if (!patient.uhid && patient.name && patient.name.toLowerCase() !== 'unknown') {
      const uhid = await idsService.ensureUhidForPhone(phone, patient.name)
      patient = await patientRepo.update(patient.id, { uhid })
    }
    return patient
  }

  async getPatientById(id) {
    return patientRepo.findById(id)
  }

  async searchPatients(query, filters = {}) {
    return patientRepo.search(query, filters)
  }

  async updatePatient(id, data) {
    return patientRepo.update(id, data)
  }

  /**
   * Patients assigned to a doctor = distinct patients from that
   * doctor's bookings.
   */
  async getDoctorPatients(doctorId) {
    const { default: bookingRepo } = await import('../booking/booking.repository.js')
    const patientIds = await bookingRepo.findDistinctPatientIdsByDoctor(doctorId)
    if (!patientIds.length) return []
    const rows = await sql`
      SELECT * FROM patients
      WHERE id IN ${sql(patientIds)}
      ORDER BY name ASC
    `
    return rows.map(r => ({
      id: r.id,
      _id: r.id,
      uhid: r.uhid !== null ? String(r.uhid) : null,
      phone: r.phone || '',
      name: r.name || '',
      age: r.age || null,
      gender: r.gender || null,
      isOld: Boolean(r.is_old),
      lastVisited: r.last_visited || null,
      createdAt: r.created_at,
    }))
  }

  /**
   * Shared registration core — mirrors the WhatsApp `handleReview` flow.
   */
  async registerPatientWithBooking(data, meta = {}, opts = {}) {
    const { source = 'whatsapp', createdBy = null, createdByRole = null } = meta
    const { validate = true } = opts
    if (validate) {
      const errors = validateRegistration(data)
      if (errors.length) throw new AppError(errors.join('; '), 400)
    }

    const phone = normalizePhone(data.phone)
    const preferredDate = data.preferredDate ? new Date(data.preferredDate) : new Date()

    const isOld = data.isOld !== undefined && data.isOld !== null
      ? (data.isOld === true || data.isOld === 'true')
      : false

    let patient = await patientRepo.findOrCreate(phone, {
      name: String(data.name).trim(),
      age: parseInt(data.age, 10),
      gender: toGender(data.gender),
      district: data.district || '',
      address: data.address || '',
      pinCode: data.pinCode || '',
      isOld,
      lastVisited: preferredDate,
    })

    if (patient.isOld !== isOld || !patient.lastVisited) {
      patient = await patientRepo.update(patient.id, { isOld, lastVisited: preferredDate })
    }

    // One UHID per phone + patient name combination.
    if (!patient.uhid) {
      const uhid = await idsService.ensureUhidForPhone(phone, patient.name)
      patient = await patientRepo.update(patient.id, { uhid })
    }

    // At most 1 booking request per patient/UHID per day (preferredDate)
    const hasExisting = await bookingRepo.hasBookingForPatientOnDate(patient.id, preferredDate)
    if (hasExisting) {
      const uhidMsg = patient.uhid ? ` (UHID: ${patient.uhid})` : ''
      throw new AppError(`Patient${uhidMsg} already has a booking for this appointment date. Maximum 1 request per day is allowed.`, 400)
    }

    const type = data.type === 'HOSPITALIZATION' ? 'HOSPITALIZATION' : 'OPD'

    let doctorId = toObjectIdString(data.doctorId)
    let departmentId = toObjectIdString(data.departmentId)
    let serviceId = toObjectIdString(data.serviceId)

    if (doctorId && !departmentId) {
      try {
        const { default: doctorRepo } = await import('../doctor/doctor.repository.js')
        const doc = await doctorRepo.findById(doctorId)
        if (doc && doc.departmentId) {
          const docDeptId = doc.departmentId._id || doc.departmentId.id || doc.departmentId
          const coerced = toObjectIdString(docDeptId)
          if (coerced) {
            departmentId = coerced
          }
        }
      } catch (err) {
        // ignore lookup error
      }
    }

    const tokenNumber = await idsService.generateToken(type, doctorId, preferredDate)

    const booking = await bookingService.createBooking({
      doctorId,
      departmentId,
      patientId: patient.id,
      serviceId,
      preferredDate,
      problemDescription: data.problemDescription || '',
      type,
      source,
      tokenNumber,
      createdBy,
      createdByRole,
      category: data.category || '',
      visitNumber: data.visitNumber || null,
    })

    logger.info(`Registered ${type} booking ${booking.bookingId} for phone ${phone} (source: ${source})`)
    return { patient, booking }
  }
}

export default new PatientService()
