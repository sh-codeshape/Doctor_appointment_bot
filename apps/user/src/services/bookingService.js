import api, { isMockMode } from './api'
import { mockBookings, mockPatients } from '../data/mockData'
import { parseAnyDate } from '../utils/formatters'

const MOCK_DELAY = 300

/**
 * Normalize a booking from backend populated shape → flat UI shape.
 * Carries the extra fields the print slip needs (age/gender/doctor spec).
 */
function normalizeBooking(b) {
  const resolvedDate = b.preferredDate || b.date || b.slotId?.date || b.createdAt
  const patObj = typeof b.patientId === 'object' ? b.patientId : {}
  const docObj = typeof b.doctorId === 'object' ? b.doctorId : {}
  return {
    id: b.id || b._id,
    booking_id: b.bookingId,
    patient_id: patObj?.id || patObj?._id || b.patient_id || null,
    patient_name: patObj?.name || b.patient_name || 'Unknown',
    mobile: patObj?.phone || b.patient_phone || b.mobile || '',
    age: patObj?.age ?? b.age ?? null,
    gender: patObj?.gender || b.gender || '',
    address: patObj?.address || b.patient_address || b.address || '',
    district: patObj?.district || b.patient_district || b.district || '',
    pinCode: patObj?.pinCode || patObj?.pin_code || b.patient_pin_code || b.pinCode || '',
    doctor_id: docObj?.id || docObj?._id || b.doctor_id || b.doctorId,
    doctor_name: docObj?.name || b.doctor_name || 'Unknown',
    doctor_specialization: docObj?.specialization || b.doctor_specialization || b.department_name || '',
    departmentId: b.departmentId?.id || b.departmentId?._id || b.departmentId || b.department_id || docObj?.departmentId || null,
    department_id: b.departmentId?.id || b.departmentId?._id || b.departmentId || b.department_id || docObj?.departmentId || null,
    service_name: b.serviceId?.name || b.service_name || '—',
    date: resolvedDate,
    preferredDate: resolvedDate,
    time_slot: b.slotId ? `${b.slotId.startTime} - ${b.slotId.endTime}` : '—',
    status: b.status,
    booking_source: b.bookingSource || 'whatsapp',
    problemDescription: b.problemDescription || b.notes || '',
    uhid: patObj?.uhid || b.uhid || null,
    token_number: b.tokenNumber || b.token_number || null,
    type: b.type || 'OPD',
    is_old: patObj?.isOld !== undefined ? patObj.isOld : (b.isOld ?? b.is_old ?? false),
    isOld: patObj?.isOld !== undefined ? patObj.isOld : (b.isOld ?? b.is_old ?? false),
    created_by: b.createdBy || b.created_by || null,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  }
}

/**
 * Booking Service
 * 
 * Full CRUD for bookings with filtering and pagination support.
 * Mock mode simulates filter/search/pagination in-memory.
 */
export const bookingService = {
  /**
   * Get paginated bookings with optional filters
   * @param {Object} params - { page, limit, status, doctor_id, search, date_from, date_to }
   */
  async getBookings(params = {}) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      let filtered = [...mockBookings]
      
      // Apply filters
      if (params.status) {
        filtered = filtered.filter((b) => b.status === params.status)
      }
      if (params.type) {
        filtered = filtered.filter((b) => (b.type || 'OPD') === params.type)
      }
      if (params.doctor_id) {
        filtered = filtered.filter((b) => b.doctor_id === Number(params.doctor_id))
      }
      if (params.isOld !== undefined && params.isOld !== null && params.isOld !== '') {
        const targetOld = String(params.isOld) === 'true'
        filtered = filtered.filter((b) => {
          let bIsOld = b.isOld ?? b.is_old
          if (bIsOld === undefined) {
            const foundPatient = mockPatients.find((p) => p.mobile === b.mobile || p.id === b.patient_id)
            if (foundPatient) bIsOld = foundPatient.isOld ?? foundPatient.is_old
          }
          return Boolean(bIsOld) === targetOld
        })
      }
      if (params.search) {
        const q = params.search.toLowerCase()
        filtered = filtered.filter(
          (b) =>
            (b.patient_name || '').toLowerCase().includes(q) ||
            (b.booking_id || '').toLowerCase().includes(q) ||
            (b.mobile || '').includes(q) ||
            (b.uhid || b.patient_uhid || '').toLowerCase().includes(q) ||
            (b.token_number || b.tokenNumber || '').toLowerCase().includes(q)
        )
      }
      if (params.date) {
        filtered = filtered.filter((b) => {
          const prefDate = b.preferredDate || b.date
          if (!prefDate) return false
          const d = parseAnyDate(prefDate)
          if (!d) return false
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          const formattedPrefDate = `${yyyy}-${mm}-${dd}`
          return formattedPrefDate === params.date
        })
      }
      const startDate = params.startDate || params.date_from
      const endDate = params.endDate || params.date_to
      if (startDate || endDate) {
        filtered = filtered.filter((b) => {
          const prefDate = b.preferredDate || b.date
          if (!prefDate) return false
          const d = parseAnyDate(prefDate)
          if (!d) return false
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          const formattedPrefDate = `${yyyy}-${mm}-${dd}`
          if (startDate && formattedPrefDate < startDate) return false
          if (endDate && formattedPrefDate > endDate) return false
          return true
        })
      }

      // Sorting in mock mode — newest first (matches server: preferredDate desc, createdAt desc)
      const sortBy = params.sortBy || 'preferredDate'
      const sortOrder = params.sortOrder || 'desc'
      filtered.sort((a, b) => {
        let valA, valB
        if (sortBy === 'createdAt' || sortBy === 'created_at') {
          valA = a.created_at ? new Date(a.created_at).getTime() : 0
          valB = b.created_at ? new Date(b.created_at).getTime() : 0
        } else {
          valA = a.preferredDate || a.date ? new Date(a.preferredDate || a.date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0)
          valB = b.preferredDate || b.date ? new Date(b.preferredDate || b.date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0)
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA
      })

      // Pagination
      const page = params.page || 1
      const limit = params.limit || 10
      const total = filtered.length
      const start = (page - 1) * limit
      const data = filtered.slice(start, start + limit)

      const confirmedCount = filtered.filter((b) => b.status === 'confirmed').length
      const pendingCount = filtered.filter((b) => b.status === 'pending').length
      const cancelledCount = filtered.filter((b) => b.status === 'cancelled').length
      const completedCount = filtered.filter((b) => b.status === 'completed').length

      const oldPatientCount = filtered.filter((b) => {
        let bIsOld = b.isOld ?? b.is_old
        if (bIsOld === undefined) {
          const foundPatient = mockPatients.find((p) => p.mobile === b.mobile || p.id === b.patient_id)
          if (foundPatient) bIsOld = foundPatient.isOld ?? foundPatient.is_old
        }
        return Boolean(bIsOld) === true
      }).length

      const newPatientCount = filtered.filter((b) => {
        let bIsOld = b.isOld ?? b.is_old
        if (bIsOld === undefined) {
          const foundPatient = mockPatients.find((p) => p.mobile === b.mobile || p.id === b.patient_id)
          if (foundPatient) bIsOld = foundPatient.isOld ?? foundPatient.is_old
        }
        return Boolean(bIsOld) === false
      }).length

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary: {
          totalBookings: total,
          confirmedCount,
          pendingCount,
          cancelledCount,
          completedCount,
          oldPatientCount,
          newPatientCount,
        },
      }
    }
    const { data } = await api.get('/bookings', { params })
    const normalizedData = (data.data || []).map(normalizeBooking)

    // Server already returns newest-first order + summary — trust it, no client re-sort.
    return {
      ...data,
      data: normalizedData,
      summary: data.summary || {
        totalBookings: data.total || normalizedData.length,
        confirmedCount: normalizedData.filter((b) => b.status === 'confirmed').length,
        pendingCount: normalizedData.filter((b) => b.status === 'pending').length,
        cancelledCount: normalizedData.filter((b) => b.status === 'cancelled').length,
        completedCount: normalizedData.filter((b) => b.status === 'completed').length,
        oldPatientCount: normalizedData.filter((b) => b.is_old || b.isOld).length,
        newPatientCount: normalizedData.filter((b) => !(b.is_old || b.isOld)).length,
      },
    }
  },

  /**
   * Get single booking by ID
   */
  async getBooking(id) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 200))
      return mockBookings.find((b) => b.id === Number(id)) || null
    }
    const { data } = await api.get(`/bookings/${id}`)
    return normalizeBooking(data)
  },

  /**
   * Update booking status
   * @param {string} id 
   * @param {string} status - 'confirmed', 'cancelled', 'completed'
   */
  async updateStatus(id, status) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const booking = mockBookings.find((b) => b.id === Number(id))
      if (booking) booking.status = status
      return { success: true, booking }
    }
    const { data } = await api.patch(`/bookings/${id}/status`, { status })
    return data
  },

  /**
   * Update full booking details
   * @param {string|number} id 
   * @param {Object} payload 
   */
  async updateBooking(id, payload) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const booking = mockBookings.find((b) => b.id === Number(id))
      if (booking) {
        if (payload.name) booking.patient_name = payload.name
        if (payload.phone) booking.mobile = payload.phone
        if (payload.age) booking.age = payload.age
        if (payload.gender) booking.gender = payload.gender
        if (payload.doctorId) booking.doctor_id = Number(payload.doctorId)
        if (payload.preferredDate) booking.date = payload.preferredDate
        if (payload.problemDescription) booking.problemDescription = payload.problemDescription
        if (payload.type) booking.type = payload.type
        if (payload.status) booking.status = payload.status
      }
      return { success: true, booking }
    }
    const { data } = await api.patch(`/bookings/${id}`, payload)
    return data
  },

  /**
   * Delete a booking
   */
  async deleteBooking(id) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const idx = mockBookings.findIndex((b) => b.id === Number(id))
      if (idx > -1) mockBookings.splice(idx, 1)
      return { success: true }
    }
    const { data } = await api.delete(`/bookings/${id}`)
    return data
  },
}
