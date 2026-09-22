import departmentRepo from './department.repository.js'

class DepartmentService {
  async getActiveDepartments() {
    return departmentRepo.findActive()
  }

  async getOpdWhatsAppDepartments() {
    const deps = await this.getActiveDepartments()
    const excluded = [/general consult/i, /general surgery/i, /^rmo$/i]
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
