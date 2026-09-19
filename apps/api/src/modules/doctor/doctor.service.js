import doctorRepo from "./doctor.repository.js";
import { cache } from "../../config/redis.js";
import { uploadDoctorImage } from "../../utils/cloudinary.js";

const CACHE_KEY = "doctors:all";
const CACHE_ACTIVE = "doctors:active";
const CACHE_TTL = 300; // 5 min

class DoctorService {
  async getAllDoctors() {
    return cache.wrap(CACHE_KEY, () => doctorRepo.findAll(), CACHE_TTL);
  }

  async getActiveDoctors() {
    return cache.wrap(CACHE_ACTIVE, () => doctorRepo.findActive(), CACHE_TTL);
  }

  async getDoctorsByDepartment(departmentId, { activeOnly = true } = {}) {
    return doctorRepo.findByDepartment(departmentId, { activeOnly });
  }

  async getDoctorById(id) {
    return doctorRepo.findById(id);
  }

  async createDoctor(data) {
    const rawImage = data.image || data.avatar || data.imageUrl || "";
    if (
      rawImage &&
      (rawImage.startsWith("data:image/") || rawImage.length > 500)
    ) {
      data.image = await uploadDoctorImage(rawImage);
    } else if (rawImage) {
      data.image = rawImage;
    }
    const doctor = await doctorRepo.create(data);
    await cache.invalidate("doctors:*");
    return doctor;
  }

  // /fix /work see i need it enforce this change on redis as instant
  async updateDoctor(id, data) {
    const rawImage = data.image || data.avatar || data.imageUrl || "";
    if (
      rawImage &&
      (rawImage.startsWith("data:image/") || rawImage.length > 500)
    ) {
      data.image = await uploadDoctorImage(rawImage);
    } else if (rawImage) {
      data.image = rawImage;
    }
    const doctor = await doctorRepo.update(id, data);
    await cache.invalidate("doctors:*");
    return doctor;
  }

  // /fix /work see i need it enforce this change on redis as instant
  async deleteDoctor(id) {
    await doctorRepo.delete(id);
    await cache.invalidate("doctors:*");
    return { success: true };
  }

  // /fix /work see i need it enforce this change on redis as instant
  async toggleActive(id) {
    const doctor = await doctorRepo.toggleActive(id);
    await cache.invalidate("doctors:*");
    return doctor;
  }
}

export default new DoctorService();
