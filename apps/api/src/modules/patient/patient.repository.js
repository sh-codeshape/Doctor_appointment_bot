import sql from '../../config/database.js'
import { toObjectIdString } from '../../utils/registration.js'

function mapPatient(row) {
  if (!row) return null
  return {
    id: row.id,
    _id: row.id,
    uhid: row.uhid !== null && row.uhid !== undefined ? String(row.uhid) : null,
    phone: row.phone || '',
    name: row.name || '',
    age: row.age || null,
    gender: row.gender || null,
    district: row.district || '',
    address: row.address || '',
    pinCode: row.pin_code || '',
    identityKey: row.identity_key || null,
    isOld: Boolean(row.is_old),
    lastVisited: row.last_visited || null,
    createdAt: row.created_at,
  }
}

function buildIdentityKey(phone, name) {
  const p = String(phone || '').trim()
  const n = String(name || 'unknown').trim().toLowerCase()
  return `${p}:${n}`
}

class PatientRepository {
  async findByPhone(phone) {
    if (!phone) return null
    const phoneStr = typeof phone === 'object' ? (phone.phone || phone.mobile || String(phone)) : String(phone)
    const [row] = await sql`
      SELECT * FROM patients
      WHERE phone = ${phoneStr}
      LIMIT 1
    `
    return mapPatient(row)
  }

  async findAllByPhone(phone) {
    if (!phone) return []
    const rows = await sql`
      SELECT * FROM patients
      WHERE phone = ${phone} AND LOWER(name) != 'unknown'
      ORDER BY created_at ASC
    `
    return rows.map(mapPatient)
  }

  async findOrCreate(phone, data = {}) {
    const name = data.name ? String(data.name).trim() : ''

    if (name && name.toLowerCase() !== 'unknown') {
      // 1. Try to find existing patient with same phone and name (case-insensitive)
      const [existing] = await sql`
        SELECT * FROM patients
        WHERE phone = ${phone} AND LOWER(name) = ${name.toLowerCase()}
        LIMIT 1
      `
      if (existing) {
        let needsUpdate = false
        let isOld = existing.is_old
        let lastVisited = existing.last_visited
        let district = existing.district || ''
        let address = existing.address || ''
        let pinCode = existing.pin_code || ''

        if (data.isOld !== undefined && existing.is_old !== Boolean(data.isOld)) {
          isOld = Boolean(data.isOld)
          needsUpdate = true
        }
        if (data.lastVisited) {
          lastVisited = data.lastVisited
          needsUpdate = true
        }
        if (data.district && data.district !== existing.district) {
          district = data.district
          needsUpdate = true
        }
        if (data.address && data.address !== existing.address) {
          address = data.address
          needsUpdate = true
        }
        if (data.pinCode && data.pinCode !== existing.pin_code) {
          pinCode = data.pinCode
          needsUpdate = true
        }

        if (needsUpdate) {
          const [updated] = await sql`
            UPDATE patients
            SET is_old = ${isOld}, last_visited = ${lastVisited},
                district = ${district}, address = ${address}, pin_code = ${pinCode}
            WHERE id = ${existing.id}
            RETURNING *
          `
          return mapPatient(updated)
        }
        return mapPatient(existing)
      }

      // 2. Check if an 'Unknown' placeholder exists for this phone to upgrade it
      const [unknownPatient] = await sql`
        SELECT * FROM patients
        WHERE phone = ${phone} AND LOWER(name) = 'unknown'
        LIMIT 1
      `
      if (unknownPatient) {
        const [upgraded] = await sql`
          UPDATE patients
          SET
            name = ${name},
            age = COALESCE(${data.age}, age),
            gender = COALESCE(${data.gender}, gender),
            district = COALESCE(${data.district || null}, district),
            address = COALESCE(${data.address || null}, address),
            pin_code = COALESCE(${data.pinCode || null}, pin_code),
            is_old = COALESCE(${data.isOld}, is_old),
            last_visited = COALESCE(${data.lastVisited}, last_visited)
          WHERE id = ${unknownPatient.id}
          RETURNING *
        `
        return mapPatient(upgraded)
      }

      // 3. Create a distinct patient record
      const [newPatient] = await sql`
        INSERT INTO patients (
          phone, name, age, gender, district, address, pin_code, is_old, last_visited
        ) VALUES (
          ${phone},
          ${name},
          ${data.age || null},
          ${data.gender || null},
          ${data.district || ''},
          ${data.address || ''},
          ${data.pinCode || ''},
          ${data.isOld !== undefined ? Boolean(data.isOld) : false},
          ${data.lastVisited || null}
        )
        ON CONFLICT (identity_key) DO UPDATE SET
          is_old = EXCLUDED.is_old,
          last_visited = COALESCE(EXCLUDED.last_visited, patients.last_visited),
          district = CASE WHEN EXCLUDED.district != '' THEN EXCLUDED.district ELSE patients.district END,
          address = CASE WHEN EXCLUDED.address != '' THEN EXCLUDED.address ELSE patients.address END,
          pin_code = CASE WHEN EXCLUDED.pin_code != '' THEN EXCLUDED.pin_code ELSE patients.pin_code END
        RETURNING *
      `
      return mapPatient(newPatient)
    }

    // 4. Default fallback when name is 'Unknown' or not provided
    const [patient] = await sql`
      SELECT * FROM patients
      WHERE phone = ${phone}
      LIMIT 1
    `
    if (patient) return mapPatient(patient)

    const [created] = await sql`
      INSERT INTO patients (
        phone, name, age, gender, district, address, pin_code, is_old, last_visited
      ) VALUES (
        ${phone},
        'Unknown',
        ${data.age || null},
        ${data.gender || null},
        ${data.district || ''},
        ${data.address || ''},
        ${data.pinCode || ''},
        ${data.isOld !== undefined ? Boolean(data.isOld) : false},
        ${data.lastVisited || null}
      )
      ON CONFLICT (identity_key) DO UPDATE SET phone = EXCLUDED.phone
      RETURNING *
    `
    return mapPatient(created)
  }

  async findById(id) {
    const coercedId = toObjectIdString(id)
    if (!coercedId) return null
    const [row] = await sql`
      SELECT * FROM patients
      WHERE id = ${coercedId}
    `
    return mapPatient(row)
  }

  async findByUhid(uhid) {
    if (!uhid) return null
    const uhidStr = String(uhid).trim()
    const [row] = await sql`
      SELECT * FROM patients
      WHERE uhid = ${uhidStr} OR uhid ILIKE ${uhidStr}
      LIMIT 1
    `
    return mapPatient(row)
  }

  async search(query, filters = {}) {
    const { isOld, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = filters
    const q = query ? `%${query}%` : null
    const isOldBool = isOld !== undefined && isOld !== null && isOld !== '' ? (isOld === 'true' || isOld === true) : null
    const offset = (page - 1) * limit

    const conditions = []
    if (q) {
      conditions.push(sql`(name ILIKE ${q} OR phone ILIKE ${q} OR uhid ILIKE ${q} OR uhid::text ILIKE ${q})`)
    }
    if (isOldBool !== null) {
      conditions.push(sql`is_old = ${isOldBool}`)
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``

    const sortCol = (sortBy === 'name') ? sql`name` : (sortBy === 'isOld' ? sql`is_old` : (sortBy === 'lastVisit' ? sql`last_visited` : sql`created_at`))
    const orderDir = (sortOrder === 'asc' || sortOrder === '1' || sortOrder === 1) ? sql`ASC` : sql`DESC`

    const rows = await sql`
      SELECT * FROM patients
      ${whereClause}
      ORDER BY ${sortCol} ${orderDir} NULLS LAST, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [countResult] = await sql`SELECT count(*) FROM patients ${whereClause}`
    const total = Number(countResult.count)

    return {
      data: rows.map(mapPatient),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async update(id, data) {
    const current = await this.findById(id)
    if (!current) return null

    const name = data.name !== undefined ? data.name : current.name
    const phone = data.phone !== undefined ? data.phone : current.phone
    const age = data.age !== undefined ? data.age : current.age
    const gender = data.gender !== undefined ? data.gender : current.gender
    const district = data.district !== undefined ? data.district : (current.district || '')
    const address = data.address !== undefined ? data.address : (current.address || '')
    const pinCode = data.pinCode !== undefined ? data.pinCode : (current.pinCode || '')
    const isOld = data.isOld !== undefined ? Boolean(data.isOld) : current.isOld
    const lastVisited = data.lastVisited !== undefined ? data.lastVisited : current.lastVisited
    const uhid = data.uhid !== undefined ? data.uhid : current.uhid

    const [row] = await sql`
      UPDATE patients
      SET
        name = ${name},
        phone = ${phone},
        age = ${age},
        gender = ${gender},
        district = ${district},
        address = ${address},
        pin_code = ${pinCode},
        is_old = ${isOld},
        last_visited = ${lastVisited},
        uhid = ${uhid}
      WHERE id = ${id}
      RETURNING *
    `
    return mapPatient(row)
  }

  async countAll() {
    try {
      const [summary] = await sql`SELECT total_patients FROM total_analytics_summary WHERE id = 1`
      if (summary) return Number(summary.total_patients)
    } catch {}
    const [row] = await sql`SELECT count(*) FROM patients`
    return Number(row.count)
  }
}

export default new PatientRepository()
