import api, { isMockMode } from './api'
import { mockMedicines, mockLabTests, mockBookings, mockAdditionalAdvice } from '../data/mockData'

export const prescriptionService = {
  /**
   * Fetch medicines list filtered by department or global search query.
   */
  async getMedicines({ department_id, search } = {}) {
    if (isMockMode()) {
      let list = [...mockMedicines]
      if (department_id && department_id !== 'all') {
        const dId = Number(department_id)
        list = list.filter((m) => m.department_id === dId)
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase()
        list = list.filter((m) => m.name.toLowerCase().includes(q))
      }
      return { data: list }
    }

    // Real API mode
    const params = new URLSearchParams()
    if (department_id && department_id !== 'all') params.append('department_id', department_id)
    if (search) params.append('search', search)
    const res = await api.get(`/medicines?${params.toString()}`)
    return res.data
  },

  /**
   * Add a new medicine to master DB catalog
   */
  async addMedicine(medData) {
    if (isMockMode()) {
      const exists = mockMedicines.some((ex) => ex.name.toLowerCase() === medData.name.toLowerCase())
      if (!exists) {
        const newItem = {
          id: Date.now() + Math.random(),
          department_id: medData.department_id ? Number(medData.department_id) : 1,
          name: medData.name,
          dosage_form: medData.dosage_form || 'Tab',
          default_dosage: medData.default_dosage || '1-0-1',
          default_frequency: medData.default_frequency || 'Twice daily',
          default_duration: medData.default_duration || '5 days',
        }
        mockMedicines.push(newItem)
        return { success: true, data: newItem }
      }
      return { success: true }
    }

    const res = await api.post('/medicines', medData)
    return res.data
  },

  /**
   * Fetch lab tests list filtered by department or global search query.
   */
  async getLabTests({ department_id, search } = {}) {
    if (isMockMode()) {
      let list = [...mockLabTests]
      if (department_id && department_id !== 'all') {
        const dId = Number(department_id)
        list = list.filter((t) => !t.department_id || t.department_id === dId)
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase()
        list = list.filter((t) => t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q))
      }
      return { data: list }
    }

    // Real API mode
    const params = new URLSearchParams()
    if (department_id && department_id !== 'all') params.append('department_id', department_id)
    if (search) params.append('search', search)
    const res = await api.get(`/lab-tests?${params.toString()}`)
    return res.data
  },

  /**
   * Add a new lab test to master DB catalog
   */
  async addLabTest(testData) {
    if (isMockMode()) {
      const exists = mockLabTests.some((ex) => ex.name.toLowerCase() === testData.name.toLowerCase())
      if (!exists) {
        const newItem = {
          id: Date.now() + Math.random(),
          department_id: testData.department_id ? Number(testData.department_id) : 1,
          name: testData.name,
          category: testData.category || 'General',
        }
        mockLabTests.push(newItem)
        return { success: true, data: newItem }
      }
      return { success: true }
    }

    const res = await api.post('/lab-tests', testData)
    return res.data
  },

  async updateMedicine(id, medData) {
    if (isMockMode()) return { success: true, data: { id, ...medData } }
    const res = await api.put(`/medicines/${id}`, medData)
    return res.data
  },
  async deleteMedicine(id) {
    if (isMockMode()) return { success: true }
    const res = await api.delete(`/medicines/${id}`)
    return res.data
  },
  async updateLabTest(id, testData) {
    if (isMockMode()) return { success: true, data: { id, ...testData } }
    const res = await api.put(`/lab-tests/${id}`, testData)
    return res.data
  },
  async deleteLabTest(id) {
    if (isMockMode()) return { success: true }
    const res = await api.delete(`/lab-tests/${id}`)
    return res.data
  },
  async getAdditionalAdvice({ department_id, search } = {}) {
    if (isMockMode()) {
      let list = [...mockAdditionalAdvice]
      if (department_id && department_id !== 'all') {
        const dId = Number(department_id)
        list = list.filter((a) => !a.department_id || a.department_id === dId)
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase()
        list = list.filter((a) => a.advice.toLowerCase().includes(q))
      }
      return { data: list }
    }
    const params = new URLSearchParams()
    if (department_id && department_id !== 'all') params.append('department_id', department_id)
    if (search) params.append('search', search)
    const res = await api.get(`/additional-advice?${params.toString()}`)
    return res.data
  },
  async addAdditionalAdvice(adviceData) {
    if (isMockMode()) {
      const exists = mockAdditionalAdvice.some((ex) => ex.advice.toLowerCase() === adviceData.advice.toLowerCase())
      if (!exists) {
        const newItem = {
          id: Date.now() + Math.random(),
          department_id: adviceData.department_id ? Number(adviceData.department_id) : 1,
          advice: adviceData.advice,
        }
        mockAdditionalAdvice.push(newItem)
        return { success: true, data: newItem }
      }
      return { success: true }
    }
    const res = await api.post('/additional-advice', adviceData)
    return res.data
  },
  async updateAdditionalAdvice(id, adviceData) {
    if (isMockMode()) return { success: true, data: { id, ...adviceData } }
    const res = await api.put(`/additional-advice/${id}`, adviceData)
    return res.data
  },
  async deleteAdditionalAdvice(id) {
    if (isMockMode()) return { success: true }
    const res = await api.delete(`/additional-advice/${id}`)
    return res.data
  },
}
