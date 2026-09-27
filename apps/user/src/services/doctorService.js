import api, { isMockMode } from './api'
import { mockDoctors } from '../data/mockData'

const MOCK_DELAY = 300

function matchesId(d, id) {
  return String(d.id || d._id) === String(id)
}

/**
 * Normalize a doctor from backend → UI shape.
 * Backend now uses canonical fields; aliases provided by toJSON for compat.
 */
function normalizeDoctor(d) {
  const imgUrl = d.image || d.avatar || d.ImageUrl || d.imageUrl || ''
  return {
    id: d.id || d._id,
    name: d.name || '',
    role: d.role || '',
    department: d.department || d.departmentId?.name || '',
    qualification: d.qualification || d.qualifications || '',
    specialization: d.specialization || d.department || '',
    specialty: d.specialty || d.AOF || '',
    consultation_fee: d.consultationFee ?? d.consultation_fee ?? 0,
    consultationFee: d.consultationFee ?? d.consultation_fee ?? 0,
    old_patient_fee: d.oldPatientFee ?? d.old_patient_fee ?? 0,
    oldPatientFee: d.oldPatientFee ?? d.old_patient_fee ?? 0,
    emergency_fee: d.emergencyFee ?? d.emergency_fee ?? 0,
    emergencyFee: d.emergencyFee ?? d.emergency_fee ?? 0,
    experience: d.experience ?? '0',
    displaySchedule: d.displaySchedule || '',
    phone: d.phone || '',
    email: d.email || '',
    image: imgUrl,
    avatar: imgUrl,
    gender: d.gender || null,
    address: d.address || '',
    is_active: d.isActive ?? d.is_active ?? true,
    maxNewPatients: d.maxNewPatients ?? d.max_new_patients ?? 40,
    maxOldPatients: d.maxOldPatients ?? d.max_old_patients ?? 30,
    created_at: d.createdAt || d.created_at,
  }
}

/**
 * Convert UI form data → backend shape (canonical fields only)
 */
function toBackendDoctor(formData) {
  return {
    name: formData.name,
    role: formData.role || formData.specialization,
    department: formData.department || formData.specialization,
    qualification: formData.qualification || formData.qualifications,
    specialization: formData.specialization || formData.department,
    specialty: formData.specialty || formData.AOF,
    consultationFee: Number(formData.consultation_fee || formData.consultationFee || 0),
    oldPatientFee: Number(formData.old_patient_fee || formData.oldPatientFee || 0),
    emergencyFee: Number(formData.emergency_fee || formData.emergencyFee || 0),
    experience: formData.experience,
    displaySchedule: formData.displaySchedule || '',
    phone: formData.phone || '',
    email: formData.email || '',
    image: formData.image || formData.avatar || formData.ImageUrl || formData.imageUrl || '',
    gender: formData.gender ? String(formData.gender).toLowerCase() : undefined,
    address: formData.address || '',
    maxNewPatients: Number(formData.maxNewPatients || 40),
    maxOldPatients: Number(formData.maxOldPatients || 30),
  }
}

/**
 * Doctor Service — CRUD operations for doctors
 */
export const doctorService = {
  async getDoctors() {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      return mockDoctors.map(normalizeDoctor)
    }
    const { data } = await api.get('/doctors')
    return data.map(normalizeDoctor)
  },

  async getDoctor(id) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 200))
      const doc = mockDoctors.find((d) => matchesId(d, id))
      return doc ? normalizeDoctor(doc) : null
    }
    const { data } = await api.get(`/doctors/${id}`)
    return normalizeDoctor(data)
  },

  async createDoctor(doctorData) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const normalizedInput = normalizeDoctor(doctorData)
      const newDoctor = {
        ...normalizedInput,
        id: `doc-${Date.now()}`,
        is_active: true,
        created_at: new Date().toISOString(),
      }
      mockDoctors.push(newDoctor)
      return newDoctor
    }
    const { data } = await api.post('/doctors', toBackendDoctor(doctorData))
    return normalizeDoctor(data)
  },

  async updateDoctor(id, doctorData) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const idx = mockDoctors.findIndex((d) => matchesId(d, id))
      if (idx > -1) {
        const updated = normalizeDoctor({ ...mockDoctors[idx], ...doctorData, id })
        mockDoctors[idx] = updated
        return updated
      }
      throw new Error('Doctor not found')
    }
    const { data } = await api.put(`/doctors/${id}`, toBackendDoctor(doctorData))
    return normalizeDoctor(data)
  },

  async deleteDoctor(id) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const idx = mockDoctors.findIndex((d) => matchesId(d, id))
      if (idx > -1) mockDoctors.splice(idx, 1)
      return { success: true }
    }
    const { data } = await api.delete(`/doctors/${id}`)
    return data
  },

  async toggleActive(id) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const doctor = mockDoctors.find((d) => matchesId(d, id))
      if (doctor) {
        doctor.is_active = !doctor.is_active
        return normalizeDoctor(doctor)
      }
    }
    const { data } = await api.patch(`/doctors/${id}/toggle`)
    return normalizeDoctor(data)
  },
}
