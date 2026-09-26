import api, { isMockMode } from './api'
import { bookingService } from './bookingService'
import { patientService } from './patientService'
import { doctorService } from './doctorService'
import { mockPatients, mockDoctors } from '../data/mockData'

const digitsOnly = (v) => String(v || '').replace(/\D/g, '')

/** Channel labels for the SOURCE box — matches bookingSource enum. */
export const SOURCE_LABELS = {
  whatsapp: 'WhatsApp Bot',
  admin: 'Admin Panel',
  offline: 'Front Desk',
  website: 'Website',
}

export function sourceLabel(booking = {}) {
  const src = booking.booking_source || booking.bookingSource
  if (src && SOURCE_LABELS[src]) return SOURCE_LABELS[src]
  return null
}

function resolveFee(row, doctorFee, dObj, isOld, doctorObj) {
  if (isOld) {
    const oldFeeCandidates = [
      row?.old_patient_fee,
      dObj?.oldPatientFee,
      dObj?.old_patient_fee,
      doctorObj?.old_patient_fee,
      doctorObj?.oldPatientFee,
    ]
    for (const f of oldFeeCandidates) {
      if (f !== undefined && f !== null && f !== '' && Number(f) > 0) {
        return Number(f)
      }
    }
  }
  const feeCandidates = [
    row?.consultation_fee,
    row?.doctor_fee,
    row?.consultationFee,
    dObj?.consultationFee,
    dObj?.consultation_fee,
    doctorObj?.consultation_fee,
    doctorObj?.consultationFee,
    doctorFee,
    500,
  ]
  for (const f of feeCandidates) {
    if (f !== undefined && f !== null && f !== '' && Number(f) > 0) {
      return Number(f)
    }
  }
  return 500
}

function mergeSlipFields(row, patient, doctorSpec, doctorFee, doctorObj) {
  // Channel defaults to whatsapp unless the row says otherwise; a staff
  // code without a channel means the offline front desk.
  const source = row.booking_source || row.bookingSource || (row.created_by ? 'offline' : 'whatsapp')
  const pObj = (row.patientId && typeof row.patientId === 'object') ? row.patientId : {}
  const dObj = (row.doctorId && typeof row.doctorId === 'object') ? row.doctorId : {}
  const rx = row.prescription || row.meta?.prescription || null
  const isOld = Boolean(row.isOld || row.is_old || pObj.isOld || patient?.isOld || patient?.is_old)
  const fee = resolveFee(row, doctorFee, dObj, isOld, doctorObj)
  const oldFeeVal = row.old_patient_fee || dObj.oldPatientFee || dObj.old_patient_fee || doctorObj?.old_patient_fee || doctorObj?.oldPatientFee || 0

  return {
    ...row,
    booking_source: source,
    patient_name: row.patient_name || pObj.name || row.name || patient?.name || '',
    mobile: row.mobile || row.patient_phone || pObj.phone || patient?.phone || '',
    age: row.age ?? pObj.age ?? patient?.age ?? null,
    gender: row.gender || pObj.gender || patient?.gender || '',
    address: row.address || pObj.address || patient?.address || '',
    district: row.district || pObj.district || patient?.district || '',
    pinCode: row.pinCode || pObj.pinCode || patient?.pinCode || patient?.pin_code || '',
    uhid: row.uhid || pObj.uhid || patient?.uhid || 'KGN-PENDING',
    isOld,
    old_patient_fee: oldFeeVal,
    oldPatientFee: oldFeeVal,
    doctor_name: row.doctor_name || dObj.name || '',
    doctor_specialization: row.doctor_specialization || dObj.department || doctorSpec || '',
    consultation_fee: fee,
    doctor_fee: fee,
    prescription: rx,
    source_label: SOURCE_LABELS[source] || '—',
  }
}

/**
 * Print data service — builds the complete object PatientPrintSlip needs.
 * List rows only carry names; age/gender/address/UHID/doctor-specialization
 * come from the booking detail + patient record (real mode) or the mock
 * patients/doctors tables (mock mode).
 */
export const printService = {
  async getSlipData(booking) {
    if (!booking) throw new Error('No booking provided')

    if (isMockMode()) {
      const key = digitsOnly(booking.mobile).slice(-10)
      const patient = mockPatients.find((p) => digitsOnly(p.mobile).slice(-10) === key) || null
      const doctorId = booking.doctor_id || booking.doctorId?.id || booking.doctorId
      const doctor = mockDoctors.find((d) => Number(d.id) === Number(doctorId)) || mockDoctors.find((d) => d.name === booking.doctor_name) || null
      const isOld = Boolean(booking.isOld || booking.is_old || patient?.is_old || patient?.isOld)
      const docFee = isOld && (doctor?.old_patient_fee || doctor?.oldPatientFee) > 0
        ? (doctor.old_patient_fee || doctor.oldPatientFee)
        : (doctor?.consultation_fee || doctor?.consultationFee || booking.consultation_fee || booking.doctor_fee)
      return mergeSlipFields(booking, patient, doctor?.specialization, docFee, doctor)
    }

    // Real mode: booking detail (populated doctor + patient age/gender/address) …
    const detail = await bookingService.getBooking(booking.id)
    // … plus the patient record and doctor record — fetch in parallel.
    const targetPatientId = detail.patient_id || detail.patientId?.id || (typeof detail.patientId === 'number' ? detail.patientId : null)
    const targetDoctorId = detail.doctor_id || detail.doctorId?.id || (typeof detail.doctorId === 'number' ? detail.doctorId : null)

    const [patient, doctor] = await Promise.all([
      targetPatientId ? patientService.getPatient(targetPatientId).catch(() => null) : Promise.resolve(null),
      targetDoctorId ? doctorService.getDoctor(targetDoctorId).catch(() => null) : Promise.resolve(null),
    ])

    const isOld = Boolean(detail.isOld || detail.is_old || patient?.isOld || patient?.is_old)
    const oldPtFee = doctor?.old_patient_fee || doctor?.oldPatientFee || detail.old_patient_fee || detail.doctorId?.oldPatientFee
    const docFee = (isOld && oldPtFee > 0) ? oldPtFee : (detail.consultation_fee || detail.doctor_fee || detail.doctorId?.consultationFee || doctor?.consultation_fee || doctor?.consultationFee)
    const merged = mergeSlipFields(detail, patient, detail.doctor_specialization || detail.doctorId?.department || doctor?.specialization, docFee, doctor)
    // patient detail nests bookings; keep the slip flat
    delete merged.bookings
    return merged
  },
}
