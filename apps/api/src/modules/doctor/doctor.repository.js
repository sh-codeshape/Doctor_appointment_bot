import sql from '../../config/database.js'
import { toObjectIdString } from '../../utils/registration.js'

function prepareDoctorData(data) {
  const payload = { ...data }

  // qualification absorbs qualifications
  if (!payload.qualification && payload.qualifications) {
    payload.qualification = payload.qualifications
  }
  delete payload.qualifications

  // specialty absorbs AOF
  if (!payload.specialty && payload.AOF) {
    payload.specialty = payload.AOF
  }
  delete payload.AOF

  // image absorbs ImageUrl / imageUrl
  const img = payload.image || payload.imageUrl || payload.ImageUrl
  if (img) payload.image = img
  delete payload.imageUrl
  delete payload.ImageUrl

  if (payload.oldPatientFee === undefined && payload.old_patient_fee !== undefined) {
    payload.oldPatientFee = payload.old_patient_fee
  }
  if (payload.emergencyFee === undefined && payload.emergency_fee !== undefined) {
    payload.emergencyFee = payload.emergency_fee
  }
  if (payload.maxPatientsPerDay === undefined && payload.max_patients_per_day !== undefined) {
    payload.maxPatientsPerDay = payload.max_patients_per_day
  }

  return payload
}

function mapDoctor(row) {
  if (!row) return null
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    qualification: row.qualification || '',
    qualifications: row.qualification || '',
    specialty: row.specialty || '',
    specialization: row.specialization || row.specialty || '',
    AOF: row.specialty || '',
    experienceYears: row.experience_years || 0,
    consultationFee: Number(row.consultation_fee || 0),
    consultation_fee: Number(row.consultation_fee || 0),
    oldPatientFee: Number(row.old_patient_fee || 0),
    old_patient_fee: Number(row.old_patient_fee || 0),
    emergencyFee: Number(row.emergency_fee || 0),
    emergency_fee: Number(row.emergency_fee || 0),
    maxPatientsPerDay: row.max_patients_per_day !== undefined && row.max_patients_per_day !== null ? Number(row.max_patients_per_day) : 30,
    max_patients_per_day: row.max_patients_per_day !== undefined && row.max_patients_per_day !== null ? Number(row.max_patients_per_day) : 30,
    isActive: row.is_active,
    image: row.image_url || '',
    imageUrl: row.image_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    departmentId: row.department_id ? {
      id: row.department_id,
      _id: row.department_id,
      name: row.department_name || '',
    } : null,
  }
}

class DoctorRepository {
  async findAll(filter = {}) {
    let rows
    const deptId = toObjectIdString(filter.departmentId)
    if (deptId) {
      rows = await sql`
        SELECT d.*, dep.name as department_name
        FROM doctors d
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.department_id = ${deptId}
        ORDER BY d.name ASC
      `
    } else {
      rows = await sql`
        SELECT d.*, dep.name as department_name
        FROM doctors d
        LEFT JOIN departments dep ON d.department_id = dep.id
        ORDER BY d.name ASC
      `
    }
    return rows.map(mapDoctor)
  }

  async findActive() {
    const rows = await sql`
      SELECT d.*, dep.name as department_name
      FROM doctors d
      LEFT JOIN departments dep ON d.department_id = dep.id
      WHERE d.is_active = true
      ORDER BY d.name ASC
    `
    return rows.map(mapDoctor)
  }

  async findByDepartment(departmentId, { activeOnly = true } = {}) {
    const deptId = toObjectIdString(departmentId)
    if (!deptId) return []
    let rows
    if (activeOnly) {
      rows = await sql`
        SELECT d.*, dep.name as department_name
        FROM doctors d
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.department_id = ${deptId} AND d.is_active = true
        ORDER BY d.name ASC
      `
    } else {
      rows = await sql`
        SELECT d.*, dep.name as department_name
        FROM doctors d
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.department_id = ${deptId}
        ORDER BY d.name ASC
      `
    }
    return rows.map(mapDoctor)
  }

  async findById(id) {
    const coercedId = toObjectIdString(id)
    if (!coercedId) return null
    const [row] = await sql`
      SELECT d.*, dep.name as department_name
      FROM doctors d
      LEFT JOIN departments dep ON d.department_id = dep.id
      WHERE d.id = ${coercedId}
    `
    return mapDoctor(row)
  }

  async create(data) {
    const payload = prepareDoctorData(data)
    const [row] = await sql`
      INSERT INTO doctors (
        name, department_id, qualification, specialization, specialty,
        experience_years, consultation_fee, old_patient_fee, emergency_fee, max_patients_per_day, is_active, image_url
      ) VALUES (
        ${payload.name},
        ${payload.departmentId || null},
        ${payload.qualification || ''},
        ${payload.specialization || payload.specialty || 'General'},
        ${payload.specialty || ''},
        ${payload.experienceYears || 0},
        ${payload.consultationFee || 0},
        ${payload.oldPatientFee || 0},
        ${payload.emergencyFee || 0},
        ${payload.maxPatientsPerDay !== undefined ? Number(payload.maxPatientsPerDay) : 30},
        ${payload.isActive !== undefined ? payload.isActive : true},
        ${payload.image || ''}
      )
      RETURNING *
    `
    return this.findById(row.id)
  }

  async update(id, data) {
    const payload = prepareDoctorData(data)
    const [row] = await sql`
      UPDATE doctors
      SET
        name = COALESCE(${payload.name ?? null}, name),
        department_id = COALESCE(${payload.departmentId ?? null}, department_id),
        qualification = COALESCE(${payload.qualification ?? null}, qualification),
        specialization = COALESCE(${payload.specialization ?? null}, specialization),
        specialty = COALESCE(${payload.specialty ?? null}, specialty),
        experience_years = COALESCE(${payload.experienceYears ?? null}, experience_years),
        consultation_fee = COALESCE(${payload.consultationFee ?? null}, consultation_fee),
        old_patient_fee = COALESCE(${payload.oldPatientFee ?? null}, old_patient_fee),
        emergency_fee = COALESCE(${payload.emergencyFee ?? null}, emergency_fee),
        max_patients_per_day = COALESCE(${payload.maxPatientsPerDay ? Number(payload.maxPatientsPerDay) : null}, max_patients_per_day),
        is_active = COALESCE(${payload.isActive ?? null}, is_active),
        image_url = COALESCE(${payload.image ?? null}, image_url),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    if (!row) return null
    return this.findById(row.id)
  }

  async delete(id) {
    const doc = await this.findById(id)
    if (!doc) return null
    await sql`DELETE FROM doctors WHERE id = ${id}`
    return doc
  }

  async toggleActive(id) {
    const [row] = await sql`
      UPDATE doctors
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    if (!row) return null
    return this.findById(row.id)
  }

  async countActive() {
    const [row] = await sql`SELECT count(*) FROM doctors WHERE is_active = true`
    return Number(row.count)
  }

  async countAll() {
    const [row] = await sql`SELECT count(*) FROM doctors`
    return Number(row.count)
  }
}

export default new DoctorRepository()
