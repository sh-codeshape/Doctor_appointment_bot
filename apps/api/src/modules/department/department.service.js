import departmentRepo from './department.repository.js'

class DepartmentService {
  async getActiveDepartments() {
    return departmentRepo.findActive()
  }

  async getOpdWhatsAppDepartments() {
    const deps = await this.getActiveDepartments()
    // Using ^ to ensure we only match departments starting with these words
    // e.g., avoids removing "Laparoscopic & General Surgery"
    const excluded = [/^general consultant/i, /^general surgery/i, /^rmo\b/i]
    return deps.filter(d => {
      const name = d.name || ''
      return !excluded.some(pattern => pattern.test(name))
    })
  }

  async getIpdWhatsAppDepartments() {
    const deps = await this.getActiveDepartments()
    // Same logic for IPD, ready for future updates
    const excluded = [/^general consultant/i, /^general surgery/i, /^rmo\b/i]
    return deps.filter(d => {
      const name = d.name || ''
      return !excluded.some(pattern => pattern.test(name))
    })
  }

  async createDepartment(data) {
    return departmentRepo.create(data)
  }
}

export default new DepartmentService()
