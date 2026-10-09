import api from './api'

export const medicineMasterService = {
  getMedicines: async (search = '') => {
    let url = '/medicines'
    if (search) {
      url += `?search=${encodeURIComponent(search)}`
    }
    const response = await api.get(url)
    return response.data
  },

  createMedicine: async (medicineData) => {
    const response = await api.post('/medicines', medicineData)
    return response.data
  },

  updateMedicine: async (id, medicineData) => {
    const response = await api.put(`/medicines/${id}`, medicineData)
    return response.data
  },

  deleteMedicine: async (id) => {
    const response = await api.delete(`/medicines/${id}`)
    return response.data
  },

  getMedicineRemarks: async () => {
    const response = await api.get('/medicine-remarks')
    return response.data
  },

  getMedicineDosages: async () => {
    const response = await api.get('/medicine-dosages')
    return response.data
  }
}
