import api, { isMockMode } from './api'
import { mockMedicineOrders } from '../data/mockData'

const MOCK_DELAY = 300

function normalizeOrder(o) {
  return {
    id: o._id || o.id,
    order_id: o.orderId,
    patient_name: o.patientId?.name || 'Unknown',
    mobile: o.patientId?.phone || '',
    address: o.deliveryAddress || '',
    prescription_url: o.prescriptionUrl || '',
    customer_notes: o.customerNotes || '',
    status: o.status || 'pending',
    staff_notes: o.staffNotes || '',
    created_at: o.createdAt,
  }
}

export const medicineOrderService = {
  async getOrders(params = {}) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      let list = [...mockMedicineOrders]
      if (params.search) {
        const q = params.search.toLowerCase()
        list = list.filter(
          (o) =>
            o.patient_name?.toLowerCase().includes(q) ||
            o.order_id?.toLowerCase().includes(q) ||
            o.mobile?.toLowerCase().includes(q)
        )
      }
      if (params.status) {
        list = list.filter((o) => o.status === params.status)
      }
      if (params.startDate) {
        list = list.filter((o) => {
          const d = o.createdAt || o.created_at
          return d ? d.substring(0,10) >= params.startDate : true
        })
      }
      if (params.endDate) {
        list = list.filter((o) => {
          const d = o.createdAt || o.created_at
          return d ? d.substring(0,10) <= params.endDate : true
        })
      }
      const page = Number(params.page) || 1
      const limit = Number(params.limit) || 10
      const total = list.length
      const totalPages = Math.ceil(total / limit) || 1
      const paginatedList = list.slice((page - 1) * limit, page * limit)
      return { data: paginatedList, total, page, limit, totalPages }
    }
    const { data } = await api.get('/medicine-orders', { params })
    return {
      ...data,
      data: (data.data || []).map(normalizeOrder),
    }
  },

  async updateStatus(id, status, staffNotes = undefined, mobile = undefined) {
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, MOCK_DELAY))
      const order = mockMedicineOrders.find((o) => o.id === Number(id))
      if (!order) throw new Error('Order not found')
      order.status = status
      if (staffNotes !== undefined) order.staff_notes = staffNotes
      return { success: true, order }
    }
    const payload = { status }
    if (staffNotes !== undefined) payload.staffNotes = staffNotes
    if (mobile) payload.mobile = mobile
    const { data } = await api.patch(`/medicine-orders/${id}/status`, payload)
    return data
  },
}
