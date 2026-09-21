import bookingRepo from "./booking.repository.js";
import slotRepo from "./timeslot.repository.js";
import patientRepo from "../patient/patient.repository.js";
import doctorRepo from "../doctor/doctor.repository.js";
import { cache } from "../../config/redis.js";
import logger from "../../utils/logger.js";
import { AppError } from "../../middleware/errorHandler.js";
import { formatDateDisplay, parseAnyDate } from "../../utils/dateHelpers.js";

class BookingService {
  /**
   * Get paginated bookings with optional filters.
   */
  async getBookings({
    page = 1,
    limit = 10,
    status,
    doctor_id,
    search,
    type,
    date,
    isOld,
    startDate,
    endDate,
    sortBy = 'preferredDate',
    sortOrder = 'desc',
  } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;
    limit = Math.min(Math.max(limit, 1), 200);

    const filter = {};
    if (status) filter.status = status;
    if (doctor_id) filter.doctorId = doctor_id;
    if (type) filter.visitType = type;
    if (search) filter.search = String(search).trim();
    if (isOld !== undefined && isOld !== null && isOld !== '') filter.isOld = isOld;

    if (date) {
      const parsed = parseAnyDate(date);
      if (parsed) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        filter.preferredDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    if (startDate) {
      const parsed = parseAnyDate(startDate);
      if (parsed) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        filter.startDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    if (endDate) {
      const parsed = parseAnyDate(endDate);
      if (parsed) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        filter.endDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    return bookingRepo.findAll(filter, { page, limit, sortBy, sortOrder });
  }

  async getBookingById(id) {
    return bookingRepo.findById(id);
  }

  /**
   * Create a booking — marks slot as unavailable if slotId provided.
   */
  async createBooking({
    doctorId,
    departmentId,
    patientId,
    serviceId,
    slotId,
    source = "whatsapp",
    type = "OPD",
    problemDescription,
    tokenNumber,
    preferredDate,
    createdBy = null,
    createdByRole = null,
  }) {
    if (doctorId) {
      const doctor = await doctorRepo.findById(doctorId);
      if (doctor && doctor.isActive === false) {
        throw new AppError(
          "The selected doctor is currently offline or inactive",
          400,
        );
      }
    }

    if (slotId) {
      const slot = await slotRepo.findById(slotId);
      if (!slot || !slot.isAvailable) {
        throw new AppError("Time slot is no longer available", 400);
      }
    }

    const bookingId = await this.generateBookingId();
    const parsedPreferredDate = parseAnyDate(preferredDate) || new Date();

    const booking = await bookingRepo.create({
      bookingId,
      tokenNumber,
      visitType: type,
      doctorId,
      departmentId,
      patientId,
      serviceId,
      slotId,
      preferredDate: parsedPreferredDate,
      notes: problemDescription,
      status: "pending",
      bookingSource: source,
      createdBy,
      createdByRole,
    });

    if (slotId) {
      await slotRepo.setAvailability(slotId, false);
    }

    await cache.invalidate("dashboard:*");
    logger.info(`Booking created: ${bookingId}`);
    return booking;
  }

  async updateBookingStatus(id, status) {
    const booking = await bookingRepo.findById(id);
    if (!booking) throw new AppError("Booking not found", 404);

    if (status === "cancelled" && booking.slotId) {
      const slotId = booking.slotId.id || booking.slotId._id || booking.slotId;
      await slotRepo.setAvailability(slotId, true);
    }

    const updated = await bookingRepo.updateStatus(id, status);
    await cache.invalidate("dashboard:*");
    return updated;
  }

  async updateBooking(id, data) {
    const booking = await bookingRepo.findById(id);
    if (!booking) throw new AppError("Booking not found", 404);

    const updated = await bookingRepo.updateBooking(id, data);
    await cache.invalidate("dashboard:*");
    return updated;
  }

  async deleteBooking(id) {
    const booking = await bookingRepo.findById(id);
    if (booking?.slotId) {
      const slotId = booking.slotId.id || booking.slotId._id || booking.slotId;
      await slotRepo.setAvailability(slotId, true);
    }
    await bookingRepo.delete(id);
    await cache.invalidate("dashboard:*");
    return { success: true };
  }

  async getAvailableSlots(doctorId, date) {
    const exists = await slotRepo.existsForDate(doctorId, date);
    if (!exists) {
      await this.generateDefaultSlots(doctorId, date);
    }
    return slotRepo.findAvailable(doctorId, date);
  }

  async generateDefaultSlots(doctorId, date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const slots = [
      { startTime: "10:00", endTime: "11:00" },
      { startTime: "11:00", endTime: "12:00" },
      { startTime: "12:00", endTime: "13:00" },
      { startTime: "14:00", endTime: "15:00" },
      { startTime: "15:00", endTime: "16:00" },
      { startTime: "16:00", endTime: "17:00" },
    ];

    const docs = slots.map((s) => ({
      doctorId,
      date: d,
      startTime: s.startTime,
      endTime: s.endTime,
      isAvailable: true,
    }));

    await slotRepo.createMany(docs);
    logger.info(
      `Generated ${docs.length} default slots for doctor ${doctorId} on ${formatDateDisplay(d)}`,
    );
  }

  async generateBookingId() {
    const { default: idsService } = await import("../ids/ids.service.js");
    return idsService.generateBookingId();
  }

  async getStats() {
    return cache.wrap(
      "dashboard:stats",
      async () => {
        const bookingStats = await bookingRepo.getStats();
        const totalDoctors = await doctorRepo.countAll();
        const activeDoctors = await doctorRepo.countActive();
        const totalPatients = await patientRepo.countAll();

        return {
          totalBookings: bookingStats.total,
          todayBookings: bookingStats.todayCount,
          confirmed: bookingStats.confirmed,
          cancelled: bookingStats.cancelled,
          totalDoctors,
          activeDoctors,
          totalPatients,
        };
      },
      120,
    );
  }

  async getRecentBookings(limit = 5) {
    return bookingRepo.getRecent(limit);
  }

  async getChartData(range = "7d") {
    const days = range === "30d" ? 30 : range === "90d" ? 90 : 7;
    const cacheKey = `dashboard:chart:${days}`;
    return cache.wrap(cacheKey, () => bookingRepo.getChartData(days), 120);
  }

  async getBookingsByPhone(phone) {
    return bookingRepo.findByPatientPhone(phone);
  }

  async updatePrescription(id, prescriptionData) {
    return bookingRepo.updatePrescription(id, prescriptionData);
  }
}

export default new BookingService();
