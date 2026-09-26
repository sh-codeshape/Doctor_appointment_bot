import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Trash2, Printer, Save, Pill, Activity, TestTube, ArrowLeft, Stethoscope, CheckCircle } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card from '../components/common/Card'
import { Loader } from '../components/common/Loader'
import { bookingService } from '../services/bookingService'
import { prescriptionService } from '../services/prescriptionService'
import { printService } from '../services/printService'
import { DoctorPrescriptionPrintHandler } from '../services/DoctorPrescriptionPrintHandler'
import { mockDepartments } from '../data/mockData'
import toast from 'react-hot-toast'
import styles from './PrescriptionPage.module.css'

export default function PrescriptionPage() {
  const { bookingId } = useParams()
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

  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Local state for prescription
  const [vitals, setVitals] = useState({
    bp: '',
    pulse: '',
    temp: '',
    weight: '',
    spo2: '',
  })
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

  const [customMedName, setCustomMedName] = useState('')
  const [customTestName, setCustomTestName] = useState('')
  const [customAdviceName, setCustomAdviceName] = useState('')
  const [addTarget, setAddTarget] = useState('General') // 'General' | 'Female Partner' | 'Male Partner'

  // Load booking details & existing prescription + catalogs in parallel
  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        setIsLoading(true)
        const data = await bookingService.getBooking(bookingId)
        if (!active || !data) return

        // Enrich the booking AND fetch all 3 catalogs in parallel
        const deptId = data.department_id ? String(data.department_id) : 'all'
        const catalogParams = { department_id: deptId === 'all' ? null : deptId, search: '' }

        const [enriched, medsRes, testsRes, adviceRes] = await Promise.all([
          printService.getSlipData(data).catch(() => data),
          prescriptionService.getMedicines(catalogParams).catch(() => ({ data: [] })),
          prescriptionService.getLabTests(catalogParams).catch(() => ({ data: [] })),
          prescriptionService.getAdditionalAdvice(catalogParams).catch(() => ({ data: [] })),
        ])

        if (!active) return

        setBooking(enriched)
        if (data.department_id) setDeptFilter(deptId)
        setAvailableMeds(medsRes.data || [])
        setAvailableTests(testsRes.data || [])
        setAvailableAdvice(adviceRes.data || [])

        const rx = enriched.prescription || enriched.meta?.prescription || {}
        setVitals(
          rx.vitals || {
            bp: '',
            pulse: '',
            temp: '',
            weight: '',
            spo2: '',
          }
        )
        setDoctorNotes(rx.doctor_notes || data.problemDescription || data.problem_description || '')
        setSelectedMeds(rx.medicines || [])
        setSelectedTests(rx.tests || [])
        setSelectedAdvice(rx.additional_advice || rx.advice || [])
      } catch (err) {
        toast.error('Failed to load patient consultation data')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadData()
    return () => {
      active = false
    }
  }, [bookingId])

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
    if (selectedMeds.length >= 15) {
      toast.error('Maximum 15 medicines allowed per slip')
      return
    }
    if (selectedMeds.some((m) => m.name.toLowerCase() === medObj.name.toLowerCase() && m.target === addTarget)) {
      toast.error(`Medicine already added for ${addTarget}`)
      return
    }
    const newItem = {
      id: medObj.id || Date.now(),
      name: medObj.name,
      dosage: medObj.default_dosage || '1-0-1',
      frequency: medObj.default_frequency || 'Twice daily',
      duration: medObj.default_duration || '5 days',
      remarks: 'After food',
      target: addTarget,
    }
    setSelectedMeds([...selectedMeds, newItem])
  }

  const handleAddCustomMedicine = () => {
    if (!customMedName.trim()) return
    handleAddMedicine({
      name: customMedName.trim(),
      default_dosage: '1-0-1',
      default_frequency: 'Twice daily',
      default_duration: '5 days',
    })
    setCustomMedName('')
  }

  const handleUpdateMed = (index, field, val) => {
    const updated = [...selectedMeds]
    updated[index][field] = val
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
    updated[index][field] = val
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
    updated[index][field] = val
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
      const targetDeptId = booking?.department_id || (deptFilter !== 'all' ? deptFilter : 1)

      // Helper to check if an ID is a temporary timestamp (newly added custom item)
      const isNew = (id) => typeof id === 'number' && id > 1000000000000

      // 1. Auto-add new or update existing catalog items so doctors don't retype defaults
      if (selectedMeds.length > 0 || selectedTests.length > 0 || selectedAdvice.length > 0) {
        await Promise.allSettled([
          ...selectedMeds.map((med) => {
            const data = {
              department_id: targetDeptId,
              name: med.name,
              default_dosage: med.dosage,
              default_frequency: med.frequency,
              default_duration: med.duration,
            }
            return isNew(med.id) ? prescriptionService.addMedicine(data) : prescriptionService.updateMedicine(med.id, data)
          }),
          ...selectedTests.map((test) => {
            const data = { department_id: targetDeptId, name: test.name }
            return isNew(test.id) ? prescriptionService.addLabTest(data) : prescriptionService.updateLabTest(test.id, data)
          }),
          ...selectedAdvice.map((adv) => {
            const data = { department_id: targetDeptId, advice: adv.advice }
            return isNew(adv.id) ? prescriptionService.addAdditionalAdvice(data) : prescriptionService.updateAdditionalAdvice(adv.id, data)
          }),
        ])
      }

      // 2. Prepare full slip data object for doctor prescription rendering
      const slipData = {
        ...booking,
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

  const handlePrintAndComplete = async () => {
    const success = await handlePrint()
    if (success && booking?.id) {
      statusMutation.mutate({ id: booking.id, status: 'completed' })
    }
  }

  if (isLoading) return <div className={styles.page}><Loader /></div>
  if (!booking) return <div className={styles.page}><Card><p>Patient record not found.</p></Card></div>

  return (
    <div className={styles.page}>
      <PageHeader
        title="Doctor Consultation & Prescription"
        subtitle={`Patient: ${booking.patient_name} · Token: ${booking.token_number || 'T-001'}`}
        icon={Stethoscope}
      />

      {/* Patient Summary Bar */}
      <div className={styles.patientHeaderCard}>
        <div className={styles.patientMetaGroup}>
          <div className={styles.patientTitle}>
            {booking.patient_name} ({booking.age ? `${booking.age} Yrs` : '—'} / {booking.gender || '—'})
          </div>
          <div className={styles.patientSub}>
            UHID: <strong>{booking.uhid || 'KGN-PENDING'}</strong> · Mobile: +91 {booking.mobile} · Doctor:{' '}
            {booking.doctor_name || 'General Doctor'} ({booking.doctor_specialization || 'OPD'})
          </div>
        </div>
        <div className={styles.tokenBadge}>TOKEN: {booking.token_number || 'T-001'}</div>
      </div>

      {/* 1. Patient Vitals & Notes */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Activity size={16} color="var(--accent-blue)" /> Patient Vitals
          </span>
        </div>
        <div className={styles.vitalsGrid}>
          <div className={styles.vitalField}>
            <label className={styles.fieldLabel}>BP (mmHg)</label>
            <input
              className={styles.input}
              placeholder="120/80"
              value={vitals.bp}
              onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
            />
          </div>
          <div className={styles.vitalField}>
            <label className={styles.fieldLabel}>Pulse (bpm)</label>
            <input
              className={styles.input}
              placeholder="72"
              value={vitals.pulse}
              onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
            />
          </div>
          <div className={styles.vitalField}>
            <label className={styles.fieldLabel}>Temp (°F)</label>
            <input
              className={styles.input}
              placeholder="98.6"
              value={vitals.temp}
              onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
            />
          </div>
          <div className={styles.vitalField}>
            <label className={styles.fieldLabel}>Weight (kg)</label>
            <input
              className={styles.input}
              placeholder="65"
              value={vitals.weight}
              onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
            />
          </div>
          <div className={styles.vitalField}>
            <label className={styles.fieldLabel}>SpO2 (%)</label>
            <input
              className={styles.input}
              placeholder="99"
              value={vitals.spo2}
              onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
            />
          </div>
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
            <Pill size={16} color="var(--accent-blue)" /> Prescribe Medicines ({selectedMeds.length}/15)
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

          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={`${styles.input} ${styles.searchInput}`}
              placeholder="Search medicine..."
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className={styles.input}
              placeholder="Custom medicine..."
              style={{ width: 140 }}
              value={customMedName}
              onChange={(e) => setCustomMedName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomMedicine()}
            />
            <button
              className={styles.saveBtn}
              style={{ padding: '8px 12px', fontSize: 13 }}
              onClick={handleAddCustomMedicine}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Quick Add Chips */}
        <div className={styles.chipsRow}>
          {availableMeds.slice(0, 15).map((m) => (
            <div key={m.id} className={styles.chip} onClick={() => handleAddMedicine(m)}>
              <Plus size={12} /> <span style={{ flex: 1 }}>{m.name}</span>
              <Trash2 size={12} style={{ color: '#ef4444', marginLeft: 6 }} onClick={(e) => handleDeleteCatalogMed(e, m.id)} />
            </div>
          ))}
        </div>

        {/* Selected Medicines Table */}
        {selectedMeds.length > 0 && (
          <table className={styles.rxTable}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Medicine Name</th>
                <th style={{ width: 90 }}>For</th>
                <th style={{ width: 100 }}>Dosage</th>
                <th style={{ width: 130 }}>Frequency</th>
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
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      value={item.dosage}
                      onChange={(e) => handleUpdateMed(index, 'dosage', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      value={item.frequency}
                      onChange={(e) => handleUpdateMed(index, 'frequency', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      value={item.duration}
                      onChange={(e) => handleUpdateMed(index, 'duration', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      value={item.remarks}
                      onChange={(e) => handleUpdateMed(index, 'remarks', e.target.value)}
                    />
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
          <ArrowLeft size={15} /> Back to My Patients
        </button>

        <button 
          className={styles.savePrintBtn} 
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} 
          onClick={handlePrint}
        >
          <Printer size={16} /> Print Only
        </button>

        <button 
          className={styles.savePrintBtn} 
          onClick={handlePrintAndComplete}
        >
          <CheckCircle size={16} /> Print & Complete Visit
        </button>
      </div>
    </div>
  )
}
