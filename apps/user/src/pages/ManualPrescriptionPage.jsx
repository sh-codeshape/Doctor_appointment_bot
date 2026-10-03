import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Printer, Save, Pill, Activity, TestTube, ArrowLeft, Stethoscope, CheckCircle, ChevronDown } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card from '../components/common/Card'
import { Loader } from '../components/common/Loader'
import { bookingService } from '../services/bookingService'
import { prescriptionService } from '../services/prescriptionService'
import { doctorService } from '../services/doctorService'
import { printService } from '../services/printService'
import { DoctorPrescriptionPrintHandler } from '../services/DoctorPrescriptionPrintHandler'
import { mockDepartments } from '../data/mockData'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import styles from './PrescriptionPage.module.css'

export default function ManualPrescriptionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => bookingService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Visit marked as completed!')
      navigate('/my-patients')
    },
    onError: () => toast.error('Failed to update patient status'),
  })

  const [patientDetails, setPatientDetails] = useState({
    patient_name: '',
    age: '',
    gender: 'M',
    mobile: '',
    place: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  // Local state for prescription
  const [vitals, setVitals] = useState({
    bp: '',
    pulse: '',
    temp: '',
    weight: '',
    spo2: '',
  })
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [doctorNotes, setDoctorNotes] = useState('')
  const [selectedMeds, setSelectedMeds] = useState([])
  const [selectedTests, setSelectedTests] = useState([])
  const [selectedAdvice, setSelectedAdvice] = useState([])

  // Search & Filters
  const [deptFilter, setDeptFilter] = useState('all')
  const [medSearch, setMedSearch] = useState('')
  const [availableMeds, setAvailableMeds] = useState([])

  const [testSearch, setTestSearch] = useState('')
  const [availableTests, setAvailableTests] = useState([])

  const [adviceSearch, setAdviceSearch] = useState('')
  const [availableAdvice, setAvailableAdvice] = useState([])
  const [availableRemarks, setAvailableRemarks] = useState([])
  const [availableDosages, setAvailableDosages] = useState([])


  const [customMedDosageForm, setCustomMedDosageForm] = useState('TAB')
  const [customTestName, setCustomTestName] = useState('')
  const [customAdviceName, setCustomAdviceName] = useState('')
  const [addTarget, setAddTarget] = useState('Female Partner') // 'General' | 'Female Partner' | 'Male Partner'

  // Load catalogs in parallel
  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        setIsLoading(true)
        const deptId = deptFilter === 'all' ? null : deptFilter
        const catalogParams = { department_id: deptId, search: '' }

        const [medsRes, testsRes, adviceRes, remarksRes, dosagesRes, docsRes] = await Promise.all([
          prescriptionService.getMedicines(catalogParams).catch(() => ({ data: [] })),
          prescriptionService.getLabTests(catalogParams).catch(() => ({ data: [] })),
          prescriptionService.getAdditionalAdvice(catalogParams).catch(() => ({ data: [] })),
          prescriptionService.getMedicineRemarks().catch(() => ({ data: [] })),
          prescriptionService.getMedicineDosages().catch(() => ({ data: [] })),
          doctorService.getDoctors().catch(() => []),
        ])

        if (!active) return

        setAvailableMeds(medsRes.data || [])
        setAvailableTests(testsRes.data || [])
        setAvailableAdvice(adviceRes.data || [])
        setAvailableRemarks(remarksRes.data || [])
        setAvailableDosages(dosagesRes.data || [])
        
        const docsList = Array.isArray(docsRes) ? docsRes : (docsRes.data || [])
        setDoctors(docsList)
        
        // Auto-select logged-in user if they are a doctor
        if (user?.role === 'doctor') {
          const me = docsList.find(d => String(d.id || d._id) === String(user.doctor_id || user.doctorId || user.id))
          if (me) setSelectedDoctorId(String(me.id || me._id))
        }
      } catch (err) {
        toast.error('Failed to load catalog data')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      active = false
    }
  }, [])

  // Ref to track if initial catalog load is done (handled in the main useEffect above)
  const catalogLoaded = React.useRef(false)

  // Re-fetch catalogs only when the user changes search/filter AFTER initial load
  const fetchMedicines = () => {
    prescriptionService
      .getMedicines({ department_id: deptFilter === 'all' ? null : deptFilter, search: medSearch })
      .then((res) => setAvailableMeds(res.data || []))
  }
  const fetchTests = () => {
    prescriptionService
      .getLabTests({ department_id: deptFilter === 'all' ? null : deptFilter, search: testSearch })
      .then((res) => setAvailableTests(res.data || []))
  }
  const fetchAdvice = () => {
    prescriptionService
      .getAdditionalAdvice({ department_id: deptFilter === 'all' ? null : deptFilter, search: adviceSearch })
      .then((res) => setAvailableAdvice(res.data || []))
  }

  useEffect(() => {
    if (!catalogLoaded.current) { catalogLoaded.current = true; return }
    fetchMedicines()
  }, [deptFilter, medSearch])

  useEffect(() => {
    if (!catalogLoaded.current) return
    fetchTests()
  }, [deptFilter, testSearch])

  useEffect(() => {
    if (!catalogLoaded.current) return
    fetchAdvice()
  }, [deptFilter, adviceSearch])

  // Handlers for adding medicine
  const handleAddMedicine = (medObj) => {
    if (selectedMeds.length >= 60) {
      toast.error('Maximum 60 medicines allowed per slip')
      return
    }
    if (selectedMeds.some((m) => m.name.toLowerCase() === medObj.name.toLowerCase() && m.target === addTarget)) {
      toast.error(`Medicine already added for ${addTarget}`)
      return
    }
    const newItem = {
      id: medObj.id || Date.now(),
      name: medObj.name,
      dosage_form: medObj.dosage_form,
      dosage: medObj.default_dosage || '1-0-1',
      frequency: medObj.default_frequency || 'Twice daily',
      duration: medObj.default_duration || '5 days',
      remarks: medObj.remarks || '',
      target: addTarget,
    }
    setSelectedMeds([...selectedMeds, newItem])
  }

  const handleAddCustomMedicine = async () => {
    if (!medSearch.trim()) return
    const medData = {
      name: medSearch.trim(),
      dosage_form: customMedDosageForm,
      default_dosage: '1-0-1',
      default_frequency: 'Twice daily',
      default_duration: '30 days',
    }
    
    try {
      const res = await prescriptionService.addMedicine(medData)
      if (res && res.data) {
        handleAddMedicine(res.data)
      } else {
        handleAddMedicine(medData)
      }
      
      const dId = deptFilter === 'all' ? null : deptFilter
      prescriptionService.getMedicines({ department_id: dId, search: medSearch })
        .then(r => { if (r.data) setAvailableMeds(r.data) })
        .catch(console.error)
        
    } catch(err) {
      console.error(err)
      handleAddMedicine(medData)
    }
    
    setMedSearch('')
    setCustomMedDosageForm('TAB')
  }

  const handleUpdateMed = (index, field, val) => {
    const updated = [...selectedMeds]
    updated[index] = { ...updated[index], [field]: val }
    setSelectedMeds(updated)
  }

  const handleRemoveMed = (index) => {
    setSelectedMeds(selectedMeds.filter((_, i) => i !== index))
  }

  // Handlers for adding test
  const handleAddTest = (testObj) => {
    if (selectedTests.length >= 10) {
      toast.error('Maximum 10 lab tests allowed per slip')
      return
    }
    if (selectedTests.some((t) => t.name.toLowerCase() === testObj.name.toLowerCase() && t.target === addTarget)) {
      toast.error(`Test already added for ${addTarget}`)
      return
    }
    const newItem = {
      id: testObj.id || Date.now(),
      name: testObj.name,
      remarks: '',
      target: addTarget,
    }
    setSelectedTests([...selectedTests, newItem])
  }

  const handleAddCustomTest = () => {
    if (!customTestName.trim()) return
    handleAddTest({ name: customTestName.trim() })
    setCustomTestName('')
  }

  const handleUpdateTest = (index, field, val) => {
    const updated = [...selectedTests]
    updated[index] = { ...updated[index], [field]: val }
    setSelectedTests(updated)
  }

  const handleRemoveTest = (index) => {
    setSelectedTests(selectedTests.filter((_, i) => i !== index))
  }

  // Handlers for adding advice
  const handleAddAdvice = (adviceObj) => {
    if (selectedAdvice.length >= 10) {
      toast.error('Maximum 10 advice items allowed per slip')
      return
    }
    if (selectedAdvice.some((a) => a.advice.toLowerCase() === adviceObj.advice.toLowerCase())) {
      toast.error('Advice already added')
      return
    }
    const newItem = {
      id: adviceObj.id || Date.now(),
      advice: adviceObj.advice,
    }
    setSelectedAdvice([...selectedAdvice, newItem])
  }

  const handleAddCustomAdvice = () => {
    if (!customAdviceName.trim()) return
    handleAddAdvice({ advice: customAdviceName.trim() })
    setCustomAdviceName('')
  }

  const handleUpdateAdvice = (index, field, val) => {
    const updated = [...selectedAdvice]
    updated[index] = { ...updated[index], [field]: val }
    setSelectedAdvice(updated)
  }

  const handleRemoveAdvice = (index) => {
    setSelectedAdvice(selectedAdvice.filter((_, i) => i !== index))
  }

  const handleDeleteCatalogMed = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this medicine from the catalog?')) return
    try {
      await prescriptionService.deleteMedicine(id)
      toast.success('Medicine deleted from catalog')
      fetchMedicines()
    } catch (err) {
      toast.error('Failed to delete medicine')
    }
  }

  const handleDeleteCatalogTest = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this test from the catalog?')) return
    try {
      await prescriptionService.deleteLabTest(id)
      toast.success('Test deleted from catalog')
      fetchTests()
    } catch (err) {
      toast.error('Failed to delete lab test')
    }
  }

  const handleDeleteCatalogAdvice = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this advice from the catalog?')) return
    try {
      await prescriptionService.deleteAdditionalAdvice(id)
      toast.success('Advice deleted from catalog')
      fetchAdvice()
    } catch (err) {
      toast.error('Failed to delete advice')
    }
  }

  const handlePrint = async () => {
    try {
      const targetDeptId = deptFilter !== 'all' ? deptFilter : 1

      // Helper to check if an ID is a temporary timestamp (newly added custom item)
      const isNew = (id) => typeof id === 'number' && id > 1000000000000

      // Removed auto-add catalog items logic to prevent api error toasts during print.

      const selectedDoc = doctors.find(d => String(d.id || d._id) === String(selectedDoctorId))

      // 2. Prepare full slip data object for doctor prescription rendering
      const slipData = {
        ...patientDetails,
        type: 'OPD',
        token_number: 'MANUAL',
        doctor_name: selectedDoc ? selectedDoc.name : (user?.name || 'General Doctor'),
        doctor_qualification: selectedDoc ? (selectedDoc.qualification || selectedDoc.specialization || selectedDoc.department || '') : '',
        date: new Date().toISOString(),
        prescription: {
          vitals,
          doctor_notes: doctorNotes,
          medicines: selectedMeds,
          tests: selectedTests,
          additional_advice: selectedAdvice,
        },
      }

      // 3. Print Doctor OPD Prescription Slip
      await DoctorPrescriptionPrintHandler.printPrescription(slipData)
      toast.success('Doctor OPD Prescription printed successfully!', { duration: 4000 })
      return true
    } catch (err) {
      console.error('Print failed', err)
      toast.error('Failed to generate prescription print slip')
      return false
    }
  }

  if (isLoading) return <div className={styles.page}><Loader /></div>

  return (
    <div className={styles.page}>
      <PageHeader
        title="Manual Prescription"
        subtitle="Write a prescription for a walk-in or manual patient"
        icon={Stethoscope}
      />

      {/* Manual Patient Details Form */}
      <Card title="Patient Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#475569' }}>Patient Name *</label>
            <input
              type="text"
              className={styles.input}
              value={patientDetails.patient_name}
              onChange={(e) => setPatientDetails({ ...patientDetails, patient_name: e.target.value })}
              placeholder="Full Name"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#475569' }}>Age</label>
            <input
              type="number"
              className={styles.input}
              value={patientDetails.age}
              onChange={(e) => setPatientDetails({ ...patientDetails, age: e.target.value })}
              placeholder="e.g. 34"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#475569' }}>Gender</label>
            <select
              className={styles.select}
              value={patientDetails.gender}
              onChange={(e) => setPatientDetails({ ...patientDetails, gender: e.target.value })}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#475569' }}>Mobile</label>
            <input
              type="text"
              className={styles.input}
              value={patientDetails.mobile}
              onChange={(e) => setPatientDetails({ ...patientDetails, mobile: e.target.value })}
              placeholder="Mobile Number"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 500, color: '#475569' }}>Doctor</label>
            <select
              className={styles.select}
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map(doc => (
                <option key={doc.id || doc._id} value={doc.id || doc._id}>
                  {doc.name} {doc.qualification ? `— ${doc.qualification}` : (doc.specialization ? `— ${doc.specialization}` : '')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 1. Doctor Notes & Clinical Diagnosis */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Activity size={16} color="var(--accent-blue)" /> Clinical Diagnosis & Notes
          </span>
        </div>

        <div>
          <label className={styles.fieldLabel} style={{ marginBottom: 6, display: 'block' }}>
            Doctor Notes / Clinical Diagnosis
          </label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            placeholder="Enter patient symptoms, diagnosis, clinical findings, or advice..."
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
          />
        </div>
      </div>

      {/* 2. Prescribe Medicines */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader} style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className={styles.sectionTitle}>
            <Pill size={16} color="var(--accent-blue)" /> Prescribe Medicines ({selectedMeds.length}/60)
          </span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'center', marginRight: 4 }}>Adding for:</span>
            {['General', 'Female Partner', 'Male Partner'].map((t) => (
              <button
                key={t}
                onClick={() => setAddTarget(t)}
                style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: addTarget === t ? (t === 'Female Partner' ? '#ec4899' : t === 'Male Partner' ? '#3b82f6' : 'var(--accent-blue)') : 'var(--bg-elevated)',
                  color: addTarget === t ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'Female Partner' ? '♀ Female' : t === 'Male Partner' ? '♂ Male' : '⚕ General'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.searchControls}>
          <select
            className={styles.select}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {mockDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            style={{ flex: 1, minWidth: 200 }}
            value=""
            onChange={(e) => {
              const val = e.target.value
              if (!val) return
              const med = availableMeds.find((m) => String(m.id) === String(val))
              if (med) handleAddMedicine(med)
            }}
          >
            <option value="">-- Select Saved Medicine ({availableMeds.length}) --</option>
            {availableMeds.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.dosage_form || 'Tab'}) {m.default_dosage ? `— ${m.default_dosage}` : ''}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 250 }}>
            <div className={styles.dropdownWrapper} style={{ width: 80 }}>
              <select
                className={styles.dropdownSelect}
                value={customMedDosageForm}
                onChange={(e) => setCustomMedDosageForm(e.target.value)}
              >
                <option value="TAB">TAB</option>
                <option value="CAP">CAP</option>
                <option value="SYR">SYR</option>
                <option value="INJ">INJ</option>
                <option value="DROPS">DROPS</option>
                <option value="OINT">OINT</option>
                <option value="CRM">CRM</option>
              </select>
              <div className={styles.dropdownIcon} style={{ background: '#f8fafc', color: '#0f172a' }}>
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>{customMedDosageForm}</span>
                <ChevronDown size={14} />
              </div>
            </div>
            
            <div className={styles.searchBox} style={{ flex: 1 }}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={`${styles.input} ${styles.searchInput}`}
                placeholder="Search or type new medicine..."
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomMedicine()}
              />
            </div>

            <button
              className={styles.saveBtn}
              style={{ padding: '8px 12px', fontSize: 13, whiteSpace: 'nowrap' }}
              onClick={handleAddCustomMedicine}
              disabled={!medSearch.trim()}
            >
              <Plus size={14} /> Add New
            </button>
          </div>
        </div>

        {/* Quick Add Chips */}
        <div className={styles.chipsRow}>
          {availableMeds.slice(0, 60).map((m) => (
            <div key={m.id} className={styles.chip} onClick={() => handleAddMedicine(m)}>
              <Plus size={12} /> <span style={{ flex: 1 }}>{m.name}</span>
              <Trash2 size={12} style={{ color: '#ef4444', marginLeft: 6 }} onClick={(e) => handleDeleteCatalogMed(e, m.id)} />
            </div>
          ))}
        </div>

        {/* Selected Medicines Table */}
        {selectedMeds.length > 0 && (
          <>
            <datalist id="remarks-list">
              {availableRemarks.map(r => (
                <option key={r.id} value={r.remark} />
              ))}
            </datalist>
            <datalist id="dosages-list">
              {availableDosages.map(d => (
                <option key={d.id} value={d.dosage} />
              ))}
            </datalist>
            <table className={styles.rxTable}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Medicine Name</th>
                <th style={{ width: 80 }}>Type</th>
                <th style={{ width: 90 }}>For</th>
                <th style={{ width: 100 }}>Dosage</th>
                <th style={{ width: 100 }}>Duration</th>
                <th style={{ width: 140 }}>Remarks</th>
                <th style={{ width: 34 }}></th>
              </tr>
            </thead>
            <tbody>
              {selectedMeds.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}
                      value={item.name || ''}
                      onChange={(e) => handleUpdateMed(index, 'name', e.target.value)}
                      placeholder="Medicine name..."
                    />
                  </td>
                  <td>
                    <div className={styles.dropdownWrapper} style={{ width: 65, height: 26 }}>
                      <select
                        className={styles.dropdownSelect}
                        value={item.dosage_form || 'TAB'}
                        onChange={(e) => handleUpdateMed(index, 'dosage_form', e.target.value)}
                      >
                        <option value="TAB">TAB</option>
                        <option value="CAP">CAP</option>
                        <option value="SYR">SYR</option>
                        <option value="INJ">INJ</option>
                        <option value="DROPS">DROPS</option>
                        <option value="OINT">OINT</option>
                        <option value="CRM">CRM</option>
                      </select>
                      <div className={styles.dropdownIcon} style={{ background: '#f8fafc', color: '#0f172a' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, marginRight: 2 }}>{item.dosage_form || 'TAB'}</span>
                        <ChevronDown size={12} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                      background: item.target === 'Female Partner' ? '#fce7f3' : item.target === 'Male Partner' ? '#dbeafe' : '#f0fdf4',
                      color: item.target === 'Female Partner' ? '#be185d' : item.target === 'Male Partner' ? '#1d4ed8' : '#166534',
                      cursor: 'pointer',
                    }} onClick={() => {
                      const next = item.target === 'General' ? 'Female Partner' : item.target === 'Female Partner' ? 'Male Partner' : 'General'
                      handleUpdateMed(index, 'target', next)
                    }} title="Click to cycle: General → Female → Male">
                      {item.target === 'Female Partner' ? '♀ Female' : item.target === 'Male Partner' ? '♂ Male' : '⚕ General'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        className={styles.input}
                        style={{ padding: '4px 8px', fontSize: 12, flex: 1 }}
                        value={item.dosage || ''}
                        onChange={(e) => handleUpdateMed(index, 'dosage', e.target.value)}
                        placeholder="Dosage"
                      />
                      <div className={styles.dropdownWrapper} style={{ width: 24, height: 26 }}>
                        <select
                          className={styles.dropdownSelect}
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleUpdateMed(index, 'dosage', e.target.value)
                          }}
                        >
                          <option value="">--</option>
                          {availableDosages.map(d => (
                            <option key={d.id} value={d.dosage}>{d.dosage}</option>
                          ))}
                        </select>
                        <div className={styles.dropdownIcon}>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      value={item.duration || ''}
                      onChange={(e) => handleUpdateMed(index, 'duration', e.target.value)}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        className={styles.input}
                        style={{ padding: '4px 8px', fontSize: 12, flex: 1 }}
                        value={item.remarks || ''}
                        onChange={(e) => handleUpdateMed(index, 'remarks', e.target.value)}
                        placeholder="Remarks"
                      />
                      <div className={styles.dropdownWrapper} style={{ width: 24, height: 26 }}>
                        <select
                          className={styles.dropdownSelect}
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleUpdateMed(index, 'remarks', e.target.value)
                          }}
                        >
                          <option value="">--</option>
                          {availableRemarks.map(r => (
                            <option key={r.id} value={r.remark}>{r.remark}</option>
                          ))}
                        </select>
                        <div className={styles.dropdownIcon}>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <button className={styles.removeBtn} onClick={() => handleRemoveMed(index)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* 3. Lab Tests Section */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader} style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className={styles.sectionTitle}>
            <TestTube size={16} color="var(--accent-blue)" /> Lab Tests & Checkups ({selectedTests.length}/10)
          </span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'center', marginRight: 4 }}>Adding for:</span>
            {['General', 'Female Partner', 'Male Partner'].map((t) => (
              <button
                key={t}
                onClick={() => setAddTarget(t)}
                style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: addTarget === t ? (t === 'Female Partner' ? '#ec4899' : t === 'Male Partner' ? '#3b82f6' : 'var(--accent-blue)') : 'var(--bg-elevated)',
                  color: addTarget === t ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'Female Partner' ? '♀ Female' : t === 'Male Partner' ? '♂ Male' : '⚕ General'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.searchControls}>
          <select
            className={styles.select}
            style={{ flex: 1, minWidth: 220 }}
            value=""
            onChange={(e) => {
              const val = e.target.value
              if (!val) return
              const test = availableTests.find((t) => String(t.id) === String(val))
              if (test) handleAddTest(test)
            }}
          >
            <option value="">-- Select Saved Lab Test ({availableTests.length}) --</option>
            {availableTests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category || 'General'})
              </option>
            ))}
          </select>

          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={`${styles.input} ${styles.searchInput}`}
              placeholder="Search lab test..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className={styles.input}
              placeholder="Custom test name..."
              style={{ width: 140 }}
              value={customTestName}
              onChange={(e) => setCustomTestName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTest()}
            />
            <button
              className={styles.saveBtn}
              style={{ padding: '8px 12px', fontSize: 13 }}
              onClick={handleAddCustomTest}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Quick Add Test Chips */}
        <div className={styles.chipsRow}>
          {availableTests.slice(0, 12).map((t) => (
            <div key={t.id} className={styles.chip} onClick={() => handleAddTest(t)}>
              <Plus size={12} /> <span style={{ flex: 1 }}>{t.name}</span>
              <Trash2 size={12} style={{ color: '#ef4444', marginLeft: 6 }} onClick={(e) => handleDeleteCatalogTest(e, t.id)} />
            </div>
          ))}
        </div>

        {/* Selected Tests Table */}
        {selectedTests.length > 0 && (
          <table className={styles.rxTable}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Test Name</th>
                <th style={{ width: 90 }}>For</th>
                <th>Remarks / Instructions</th>
                <th style={{ width: 34 }}></th>
              </tr>
            </thead>
            <tbody>
              {selectedTests.map((t, index) => (
                <tr key={t.id || index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}
                      value={t.name || ''}
                      onChange={(e) => handleUpdateTest(index, 'name', e.target.value)}
                      placeholder="Test name..."
                    />
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                      background: t.target === 'Female Partner' ? '#fce7f3' : t.target === 'Male Partner' ? '#dbeafe' : '#f0fdf4',
                      color: t.target === 'Female Partner' ? '#be185d' : t.target === 'Male Partner' ? '#1d4ed8' : '#166534',
                      cursor: 'pointer',
                    }} onClick={() => {
                      const next = t.target === 'General' ? 'Female Partner' : t.target === 'Female Partner' ? 'Male Partner' : 'General'
                      handleUpdateTest(index, 'target', next)
                    }} title="Click to cycle: General → Female → Male">
                      {t.target === 'Female Partner' ? '♀ Female' : t.target === 'Male Partner' ? '♂ Male' : '⚕ General'}
                    </span>
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      placeholder="e.g. Fasting sample / Urgent"
                      value={t.remarks}
                      onChange={(e) => handleUpdateTest(index, 'remarks', e.target.value)}
                    />
                  </td>
                  <td>
                    <button className={styles.removeBtn} onClick={() => handleRemoveTest(index)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Additional Advice Section */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Save size={16} color="var(--accent-blue)" /> Additional Advice / Lifestyle Recommendations ({selectedAdvice.length}/10)
          </span>
        </div>

        <div className={styles.searchControls}>
          <select
            className={styles.select}
            style={{ flex: 1, minWidth: 220 }}
            value=""
            onChange={(e) => {
              const val = e.target.value
              if (!val) return
              const adv = availableAdvice.find((a) => String(a.id) === String(val))
              if (adv) handleAddAdvice(adv)
            }}
          >
            <option value="">-- Select Saved Advice ({availableAdvice.length}) --</option>
            {availableAdvice.map((a) => (
              <option key={a.id} value={a.id}>
                {a.advice}
              </option>
            ))}
          </select>

          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={`${styles.input} ${styles.searchInput}`}
              placeholder="Search advice..."
              value={adviceSearch}
              onChange={(e) => setAdviceSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className={styles.input}
              placeholder="Custom advice..."
              style={{ width: 200 }}
              value={customAdviceName}
              onChange={(e) => setCustomAdviceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAdvice()}
            />
            <button
              className={styles.saveBtn}
              style={{ padding: '8px 12px', fontSize: 13 }}
              onClick={handleAddCustomAdvice}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Quick Add Advice Chips */}
        <div className={styles.chipsRow}>
          {availableAdvice.slice(0, 12).map((a) => (
            <div key={a.id} className={styles.chip} onClick={() => handleAddAdvice(a)}>
              <Plus size={12} /> <span style={{ flex: 1 }}>{a.advice}</span>
              <Trash2 size={12} style={{ color: '#ef4444', marginLeft: 6 }} onClick={(e) => handleDeleteCatalogAdvice(e, a.id)} />
            </div>
          ))}
        </div>

        {/* Selected Advice Table */}
        {selectedAdvice.length > 0 && (
          <table className={styles.rxTable}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Advice</th>
                <th style={{ width: 34 }}></th>
              </tr>
            </thead>
            <tbody>
              {selectedAdvice.map((a, index) => (
                <tr key={a.id || index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}
                      value={a.advice || ''}
                      onChange={(e) => handleUpdateAdvice(index, 'advice', e.target.value)}
                      placeholder="Enter advice..."
                    />
                  </td>
                  <td>
                    <button className={styles.removeBtn} onClick={() => handleRemoveAdvice(index)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Page Footer Actions */}
      <div className={styles.pageFooterActions}>
        <button className={styles.cancelBtn} onClick={() => navigate('/my-patients')}>
          <ArrowLeft size={15} /> Back
        </button>

        <button 
          className={styles.savePrintBtn} 
          onClick={handlePrint}
        >
          <Printer size={16} /> Print Prescription
        </button>
      </div>
    </div>
  )
}
