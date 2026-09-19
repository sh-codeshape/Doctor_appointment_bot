import api, { isMockMode } from './api'
import { mockBookings, mockPatients, mockDoctors, mockDepartments, mockIdentityState } from '../data/mockData'
import { parseAnyDate } from '../utils/formatters'

const MOCK_DELAY = 400

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits
}

function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '')
}

/**
 * Validate with the SAME rules as the WhatsApp bot + backend
 * validateRegistration, so offline and online capture identical data.
 */
export function validateRegistrationForm(data) {
  const errors = []
  if (!data.name || String(data.name).trim().length < 2) errors.push('Patient name must be at least 2 characters')
  const phoneDigits = digitsOnly(data.phone)
  if (phoneDigits.length < 10) errors.push('Valid 10-digit mobile number is required')
  const age = parseInt(data.age, 10)
  if (data.age === '' || data.age == null || isNaN(age) || age < 1 || age > 120) errors.push('Age must be between 1 and 120')
  const validGenders = ['Male', 'Female', 'Other', 'male', 'female', 'other']
  if (!data.gender || !validGenders.includes(String(data.gender).trim())) errors.push('Gender must be Male, Female or Other')
  if (!data.district || !String(data.district).trim()) errors.push('District is required')
  if (!data.address || !String(data.address).trim()) errors.push('Address is required')
  if (data.type === 'OPD' && !data.doctorId) errors.push('Doctor is required for OPD booking')
  if (data.preferredDate) {
    const d = parseAnyDate(data.preferredDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (!d || d < today) errors.push('Preferred date must be today or a future date')
  } else {
    errors.push('Preferred date is required')
  }
  return errors
}

function mockUhidForPhoneAndName(phoneDigits, patientName = '') {
  const phoneKey = digitsOnly(phoneDigits).slice(-10)
  const nameKey = String(patientName || '').trim().toLowerCase()
  const comboKey = nameKey ? `${phoneKey}:${nameKey}` : phoneKey

  if (!mockIdentityState.uhidByPhoneAndName) {
    mockIdentityState.uhidByPhoneAndName = {}
  }

  if (!mockIdentityState.uhidByPhoneAndName[comboKey]) {
    mockIdentityState.uhidByPhoneAndName[comboKey] = `KGN-2026-${String(mockIdentityState.nextUhidSeq++).padStart(5, '0')}`
  }
  return mockIdentityState.uhidByPhoneAndName[comboKey]
}

function mockTokenFor(doctorId, dateStr) {
  const key = `${doctorId}:${dateStr}`
  const seq = (mockIdentityState.tokenSeqByDoctorDay[key] || 0) + 1
  mockIdentityState.tokenSeqByDoctorDay[key] = seq
  return `T-${String(seq).padStart(3, '0')}`
}

/**
 * Registration Service — receptionist offline entry.
 * Mock mode implements D2/D3 (UHID per phone+name, token per doctor+day) in-memory
 * so the demo behaves exactly like the backend will.
 */
export const registrationService = {
  validate: validateRegistrationForm,

  getDepartments() {
    return [...mockDepartments]
  },

  getDoctorsByDepartment(departmentId) {
    return mockDoctors.filter((d) => d.department_id === Number(departmentId) && d.is_active)
  },

  async register(data, meta = {}) {
    const errors = validateRegistrationForm(data)
    if (errors.length) throw new Error(errors.join('; '))

    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const phoneDigits = digitsOnly(data.phone).slice(-10)
      const uhid = mockUhidForPhoneAndName(phoneDigits, data.name)

      const existingBooking = mockBookings.find(
        (b) => b.uhid === uhid && b.date === data.preferredDate && b.status !== 'cancelled'
      )
      if (existingBooking) {
        throw new Error(`Patient (UHID: ${uhid}) already has a booking for this appointment date (${data.preferredDate}). Maximum 1 request per day is allowed.`)
      }
      const doctor = mockDoctors.find((d) => d.id === Number(data.doctorId))
      const type = data.type === 'HOSPITALIZATION' ? 'HOSPITALIZATION' : 'OPD'
      const token = type === 'OPD' ? mockTokenFor(data.doctorId, data.preferredDate) : null
      const newId = Math.max(...mockBookings.map((b) => b.id)) + 1
      const booking = {
        id: newId,
        booking_id: `BK-${data.preferredDate.replace(/-/g, '')}-${String(newId).padStart(3, '0')}`,
        doctor_id: type === 'OPD' ? Number(data.doctorId) : null,
        doctor_name: doctor ? doctor.name : '—',
        service_id: null,
        service_name: type === 'OPD' ? 'General Consultation' : 'Hospitalization',
        patient_name: String(data.name).trim(),
        mobile: phoneDigits,
        uhid,
        token_number: token,
        type,
        date: data.preferredDate,
        time_slot: '—',
        status: 'pending',
        problem: data.problemDescription || '',
        created_by: meta.staffCode || 'KGN_RC_001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockBookings.unshift(booking)

      // Upsert patient row (same phone shares the UHID — D2)
      let patient = mockPatients.find((p) => digitsOnly(p.mobile).slice(-10) === phoneDigits && p.name === booking.patient_name)
      if (!patient) {
        patient = {
          id: Math.max(...mockPatients.map((p) => p.id)) + 1,
          name: booking.patient_name,
          mobile: phoneDigits,
          uhid,
          is_old: Boolean(data.isOld),
          total_bookings: 0,
          last_visit: data.preferredDate,
        }
        mockPatients.push(patient)
      }
      patient.is_old = Boolean(data.isOld)
      patient.total_bookings += 1
      patient.last_visit = data.preferredDate

      return { patient, booking }
    }

    const payload = {
      name: data.name,
      phone: data.phone,
      age: Number(data.age),
      gender: data.gender,
      isOld: Boolean(data.isOld),
      district: data.district,
      address: data.address,
      pinCode: data.pinCode || '',
      type: data.type || 'OPD',
      preferredDate: data.preferredDate,
      problemDescription: data.problemDescription || '',
      doctorId: data.doctorId || null,
      departmentId: data.departmentId || null,
    }

    const { data: res } = await api.post('/patients/register', payload)
    return res
  },
}
