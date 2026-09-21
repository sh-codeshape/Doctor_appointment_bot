import api, { isMockMode } from './api'
import { mockPatients, mockBookings } from '../data/mockData'

const MOCK_DELAY = 300

/**
 * Normalize a patient from backend → UI shape.
 * Backend returns: { id, name, phone, age, gender, totalBookings, lastVisit }
 */
function normalizePatient(p) {
  return {
    id: p.id || p._id,
    name: p.name,
    uhid: p.uhid || '',
    mobile: p.phone || p.mobile || '',
    age: p.age || null,
    gender: p.gender || null,
    district: p.district || '',
    address: p.address || '',
    pinCode: p.pinCode || '',
    is_old: p.isOld ?? p.is_old ?? false,
    total_bookings: p.totalBookings ?? p.total_bookings ?? 0,
    last_visit: p.lastVisit || p.last_visit || p.lastVisited || null,
    created_at: p.createdAt || p.created_at,
  }
}

/**
 * Normalize a booking (for patient detail/history view).
 */
function normalizeBookingForHistory(b) {
  return {
    id: b.id || b._id,
    booking_id: b.bookingId || b.booking_id,
    doctor_name: (typeof b.doctorId === 'object' && b.doctorId?.name) ? b.doctorId.name : (b.doctor_name || b.doctorName || '—'),
    date: b.preferredDate || b.date || b.slotId?.date || b.createdAt,
    time_slot: b.slotId
      ? `${b.slotId.startTime} - ${b.slotId.endTime}`
      : b.time_slot || '—',
    status: b.status,
  }
}

/**
 * Patient Service — read-only operations (patients come from bookings)
 */
export const patientService = {
  async getPatients(search = '', isOld = '', sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      let result = [...mockPatients]

      if (isOld !== '' && isOld !== null && isOld !== undefined) {
        const targetOld = String(isOld) === 'true'
        result = result.filter((p) => Boolean(p.is_old) === targetOld)
      }

      if (search) {
        const q = search.toLowerCase()
        result = result.filter(
          (p) => p.name.toLowerCase().includes(q) || p.mobile.includes(q)
        )
      }

      result.sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        }
        if (sortBy === 'lastVisit' || sortBy === 'last_visit') {
          const dA = new Date(a.last_visit || 0)
          const dB = new Date(b.last_visit || 0)
          return sortOrder === 'asc' ? dA - dB : dB - dA
        }
        if (sortBy === 'isOld') {
          return sortOrder === 'asc' ? (a.is_old ? 1 : -1) : (b.is_old ? 1 : -1)
        }
        return sortOrder === 'asc' ? a.id - b.id : b.id - a.id
      })

      const total = result.length
      const paginatedResult = result.slice((page - 1) * limit, page * limit)
      return {
        data: paginatedResult,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
    const { data } = await api.get('/patients', { params: { search, isOld, sortBy, sortOrder, page, limit } })
    return {
      ...data,
      data: (data.data || []).map(normalizePatient)
    }
  },

  async getPatient(id) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 200))
      const patient = mockPatients.find((p) => p.id === Number(id))
      const history = mockBookings.filter((b) => b.mobile === patient?.mobile)
      return { ...patient, bookings: history }
    }
    const { data } = await api.get(`/patients/${id}`)
    const normalized = normalizePatient(data)
    normalized.bookings = (data.bookings || []).map(normalizeBookingForHistory)
    return normalized
  },
}
