import bookingService from './booking.service.js'
import slotRepo from './timeslot.repository.js'

export const bookingController = {
  async getAll(req, res, next) {
    try {
      const query = { ...req.query }
      // Doctors see only their own bookings — identity comes from the JWT, never the query string.
      if (req.admin?.role === 'doctor') {
        if (!req.admin.doctorId) {
          return res.status(403).json({ success: false, message: 'No doctor profile linked to this login' })
        }
        query.doctor_id = req.admin.doctorId
      }
      const result = await bookingService.getBookings(query)
      res.json(result)
    } catch (err) { next(err) }
  },

  async getById(req, res, next) {
    try {
      const booking = await bookingService.getBookingById(req.params.id)
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' })
      res.json(booking)
    } catch (err) { next(err) }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body
      if (status === 'pending') {
        const existing = await bookingService.getBookingById(req.params.id)
        if (existing && existing.status === 'cancelled') {
          const role = req.admin?.role?.toLowerCase()
          if (req.admin && role && role !== 'admin' && role !== 'superadmin' && role !== 'super') {
            return res.status(403).json({ success: false, message: 'Only admin can reopen cancelled bookings' })
          }
        }
      }
      const booking = await bookingService.updateBookingStatus(req.params.id, status)
      res.json({ success: true, booking })
    } catch (err) { next(err) }
  },

  async update(req, res, next) {
    try {
      const booking = await bookingService.updateBooking(req.params.id, req.body)
      res.json({ success: true, booking })
    } catch (err) { next(err) }
  },

  async updatePrescription(req, res, next) {
    try {
      const booking = await bookingService.updatePrescription(req.params.id, req.body)
      res.json({ success: true, booking })
    } catch (err) { next(err) }
  },

  async getDraft(req, res, next) {
    try {
      const draft = await bookingService.getDraft(req.params.id)
      res.json({ success: true, draft })
    } catch (err) { next(err) }
  },

  async saveDraft(req, res, next) {
    try {
      const booking = await bookingService.saveDraft(req.params.id, req.body)
      res.json({ success: true, booking })
    } catch (err) { next(err) }
  },

  async delete(req, res, next) {
    try {
      await bookingService.deleteBooking(req.params.id)
      res.json({ success: true })
    } catch (err) { next(err) }
  },

  // ─── Time Slot endpoints (live alongside bookings) ─────

  async getSlots(req, res, next) {
    try {
      const { doctor_id, date } = req.query
      if (!doctor_id) return res.status(400).json({ success: false, message: 'doctor_id is required' })

      if (date) {
        const slots = await bookingService.getAvailableSlots(doctor_id, date)
        return res.json(slots)
      }
      const slots = await slotRepo.findByDoctor(doctor_id)
      res.json(slots)
    } catch (err) { next(err) }
  },

  async createSlot(req, res, next) {
    try {
      const slot = await slotRepo.create(req.body)
      res.status(201).json(slot)
    } catch (err) { next(err) }
  },

  async deleteSlot(req, res, next) {
    try {
      await slotRepo.delete(req.params.id)
      res.json({ success: true })
    } catch (err) { next(err) }
  },

  async toggleSlot(req, res, next) {
    try {
      const slot = await slotRepo.findById(req.params.id)
      if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' })
      const updated = await slotRepo.setAvailability(req.params.id, !slot.isAvailable)
      res.json(updated)
    } catch (err) { next(err) }
  },

  // ─── Dashboard endpoints ───────────────────────────────

  async getStats(req, res, next) {
    try {
      const stats = await bookingService.getStats()
      res.json(stats)
    } catch (err) { next(err) }
  },

  async getRecent(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 5
      const bookings = await bookingService.getRecentBookings(limit)
      res.json(bookings)
    } catch (err) { next(err) }
  },

  async getChart(req, res, next) {
    try {
      const chartData = await bookingService.getChartData(req.query.range)
      res.json(chartData)
    } catch (err) { next(err) }
  },
}
