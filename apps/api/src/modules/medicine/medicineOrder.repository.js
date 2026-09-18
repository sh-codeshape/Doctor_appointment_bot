import sql from '../../config/database.js'
import { toObjectIdString } from '../../utils/registration.js'

function mapMedicineOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    _id: row.id,
    orderId: row.order_id,
    deliveryAddress: row.delivery_address || '',
    prescriptionUrl: row.prescription_url || '',
    customerNotes: row.customer_notes || '',
    staffNotes: row.staff_notes || '',
    status: row.status,
    source: row.source || 'whatsapp',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patientId: row.patient_id ? {
      id: row.patient_id,
      _id: row.patient_id,
      name: row.patient_name || '',
      phone: row.patient_phone || '',
      uhid: row.patient_uhid !== null && row.patient_uhid !== undefined ? String(row.patient_uhid) : null,
    } : null,
  }
}

const SELECT_ORDER_WITH_PATIENT = sql`
  SELECT
    mo.*,
    p.name AS patient_name,
    p.phone AS patient_phone,
    p.uhid AS patient_uhid
  FROM medicine_orders mo
  LEFT JOIN patients p ON mo.patient_id = p.id
`

class MedicineOrderRepository {
  async findAll(filter = {}, { page = 1, limit = 10 } = {}) {
    page = parseInt(page, 10) || 1
    limit = parseInt(limit, 10) || 10
    const offset = (page - 1) * limit

    const conditions = []
    if (filter.status) conditions.push(sql`mo.status = ${filter.status}`)
    if (filter.search) {
      const q = `%${filter.search}%`
      conditions.push(sql`(mo.order_id ILIKE ${q} OR p.name ILIKE ${q} OR p.phone ILIKE ${q})`)
    }
    if (filter.patientIds && Array.isArray(filter.patientIds) && filter.patientIds.length > 0) {
      conditions.push(sql`mo.patient_id IN ${sql(filter.patientIds)}`)
    } else if (filter.patientIds && Array.isArray(filter.patientIds) && filter.patientIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 }
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``

    const rows = await sql`
      ${SELECT_ORDER_WITH_PATIENT}
      ${whereClause}
      ORDER BY mo.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const [totalRow] = await sql`SELECT count(*) FROM medicine_orders mo LEFT JOIN patients p ON mo.patient_id = p.id ${whereClause}`
    const total = Number(totalRow.count)

    return {
      data: rows.map(mapMedicineOrder),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findById(id) {
    const coercedId = toObjectIdString(id)
    if (!coercedId) return null
    const [row] = await sql`
      ${SELECT_ORDER_WITH_PATIENT}
      WHERE mo.id = ${coercedId}
    `
    return mapMedicineOrder(row)
  }

  async create(data) {
    const deliveryAddress = data.deliveryAddress || data.address || 'N/A'
    const fullAddress = data.pinCode ? `${deliveryAddress} — ${data.pinCode}` : deliveryAddress
    const [row] = await sql`
      INSERT INTO medicine_orders (
        order_id, patient_id, delivery_address, prescription_url, customer_notes, staff_notes, status, source
      ) VALUES (
        ${data.orderId},
        ${data.patientId || null},
        ${fullAddress},
        ${data.prescriptionUrl || ''},
        ${data.customerNotes || ''},
        ${data.staffNotes || ''},
        ${data.status || 'pending'},
        ${data.source || 'whatsapp'}
      )
      RETURNING id
    `
    return this.findById(row.id)
  }

  async updateStatus(id, { status, staffNotes }) {
    const [row] = await sql`
      UPDATE medicine_orders
      SET
        status = COALESCE(${status}, status),
        staff_notes = COALESCE(${staffNotes}, staff_notes)
      WHERE id = ${id}
      RETURNING id
    `
    if (!row) return null
    return this.findById(row.id)
  }
}

export default new MedicineOrderRepository()
