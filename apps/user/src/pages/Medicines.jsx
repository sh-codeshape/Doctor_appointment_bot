import { useState, useEffect, useCallback, useMemo } from 'react'
import { medicineMasterService } from '../services/medicineMasterService'
import { Pill, Search, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react'
import styles from './Medicines.module.css'

export default function Medicines() {
  const [medicines, setMedicines] = useState([])
  const [remarks, setRemarks] = useState([])
  const [dosages, setDosages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    dosage_form: 'Tab',
    default_dosage: '',
    default_frequency: '',
    default_duration: '',
    remarks: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1) // Reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [medsRes, remarksRes, dosagesRes] = await Promise.all([
        medicineMasterService.getMedicines(debouncedSearch),
        medicineMasterService.getMedicineRemarks(),
        medicineMasterService.getMedicineDosages()
      ])
      
      setMedicines(medsRes.data || [])
      setRemarks(remarksRes.data || [])
      setDosages(dosagesRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Failed to load medicines. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Pagination logic
  const totalPages = Math.ceil(medicines.length / itemsPerPage)
  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return medicines.slice(start, start + itemsPerPage)
  }, [medicines, currentPage])

  const handleOpenModal = (medicine = null) => {
    if (medicine) {
      setEditingMedicine(medicine)
      setFormData({
        name: medicine.name || '',
        dosage_form: medicine.dosage_form || 'Tab',
        default_dosage: medicine.default_dosage || '',
        default_frequency: medicine.default_frequency || '',
        default_duration: medicine.default_duration || '',
        remarks: medicine.remarks || ''
      })
    } else {
      setEditingMedicine(null)
      setFormData({
        name: '',
        dosage_form: 'Tab',
        default_dosage: '',
        default_frequency: '',
        default_duration: '',
        remarks: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingMedicine(null)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingMedicine) {
        await medicineMasterService.updateMedicine(editingMedicine.id, formData)
      } else {
        await medicineMasterService.createMedicine(formData)
      }
      handleCloseModal()
      fetchData() // Refresh list
    } catch (error) {
      console.error('Error saving medicine:', error)
      alert(error.response?.data?.message || 'Failed to save medicine.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return

    try {
      await medicineMasterService.deleteMedicine(id)
      fetchData()
    } catch (error) {
      console.error('Error deleting medicine:', error)
      alert('Failed to delete medicine.')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>
            <Pill size={28} />
            Medicine Master
          </h1>
          <p>Manage medicines, dosages, and remarks for prescriptions.</p>
        </div>
        <button onClick={() => handleOpenModal()} className={styles.addButton}>
          <Plus size={20} />
          Add Medicine
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search medicines by name or dosage form..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner}></div>
            <p>Loading medicines...</p>
          </div>
        ) : medicines.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={48} />
            <h3>No medicines found</h3>
            <p>Try adjusting your search or add a new medicine to get started.</p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMedicines.map((med) => (
                  <tr key={med.id}>
                    <td className={styles.medicineName}>{med.name}</td>
                    <td><span className={`${styles.badge} ${styles.primary}`}>{med.dosage_form}</span></td>
                    <td>{med.default_dosage || '-'}</td>
                    <td>{med.default_frequency || '-'}</td>
                    <td>{med.default_duration || '-'}</td>
                    <td>{med.remarks || '-'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => handleOpenModal(med)} className={`${styles.actionBtn} ${styles.editBtn}`} title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(med.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.pageInfo}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, medicines.length)} of {medicines.length} entries
                </span>
                <div className={styles.pageControls}>
                  <button 
                    className={styles.pageBtn}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button 
                    className={styles.pageBtn}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}</h2>
              <button onClick={handleCloseModal} className={styles.closeBtn}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className={styles.modalContent}>
                <div className={styles.formGrid}>
                  
                  <div className={styles.formGroup}>
                    <label>Medicine Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Paracetamol 500mg"
                      value={formData.name}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Dosage Form</label>
                    <input
                      list="dosage-forms"
                      name="dosage_form"
                      placeholder="e.g. Tab, Syr, Cap"
                      value={formData.dosage_form}
                      onChange={handleFormChange}
                    />
                    <datalist id="dosage-forms">
                      <option value="Tab" />
                      <option value="Cap" />
                      <option value="Syr" />
                      <option value="Inj" />
                      <option value="Oint" />
                      <option value="Drops" />
                      <option value="Lotion" />
                      <option value="Sachet" />
                    </datalist>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Default Dosage</label>
                    <input
                      list="default-dosages"
                      name="default_dosage"
                      placeholder="e.g. 1-0-1 or 5ml"
                      value={formData.default_dosage}
                      onChange={handleFormChange}
                    />
                    <datalist id="default-dosages">
                      {dosages.map(d => (
                        <option key={d.id} value={d.dosage} />
                      ))}
                    </datalist>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Default Frequency</label>
                    <input
                      list="default-frequencies"
                      name="default_frequency"
                      placeholder="e.g. BD, TDS, OD"
                      value={formData.default_frequency}
                      onChange={handleFormChange}
                    />
                    <datalist id="default-frequencies">
                      <option value="OD" />
                      <option value="BD" />
                      <option value="TDS" />
                      <option value="QID" />
                      <option value="SOS" />
                    </datalist>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Default Duration</label>
                    <input
                      list="default-durations"
                      name="default_duration"
                      placeholder="e.g. 3 Days, 1 Week"
                      value={formData.default_duration}
                      onChange={handleFormChange}
                    />
                    <datalist id="default-durations">
                      <option value="1 Day" />
                      <option value="3 Days" />
                      <option value="5 Days" />
                      <option value="7 Days" />
                      <option value="10 Days" />
                      <option value="14 Days" />
                      <option value="1 Month" />
                    </datalist>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Remarks</label>
                    <input
                      list="medicine-remarks"
                      name="remarks"
                      placeholder="e.g. After food"
                      value={formData.remarks}
                      onChange={handleFormChange}
                    />
                    <datalist id="medicine-remarks">
                      {remarks.map(r => (
                        <option key={r.id} value={r.remark} />
                      ))}
                    </datalist>
                  </div>

                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                  {isSubmitting ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

