import React, { useState, useEffect } from 'react'
import { Search, Plus, Trash2, Printer, Save, Pill, Activity, TestTube } from 'lucide-react'
import Modal from '../common/Modal'
import { prescriptionService } from '../../services/prescriptionService'
import { mockDepartments } from '../../data/mockData'
import toast from 'react-hot-toast'
import styles from './PrescriptionModal.module.css'

export default function PrescriptionModal({ isOpen, onClose, booking, onSaveAndPrint }) {
  if (!booking) return null

  // Doctor's department
  const doctorDeptId = booking.department_id || 1

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

  // Search & Filters
  const [deptFilter, setDeptFilter] = useState(String(doctorDeptId))
  const [medSearch, setMedSearch] = useState('')
  const [availableMeds, setAvailableMeds] = useState([])

  const [testSearch, setTestSearch] = useState('')
  const [availableTests, setAvailableTests] = useState([])

  const [customMedName, setCustomMedName] = useState('')
  const [customTestName, setCustomTestName] = useState('')

  // Load existing prescription data when booking opens
  useEffect(() => {
    if (booking) {
      const rx = booking.prescription || booking.meta?.prescription || {}
      setVitals(
        rx.vitals || {
          bp: '',
          pulse: '',
          temp: '',
          weight: '',
          spo2: '',
        }
      )
      setDoctorNotes(rx.doctor_notes || booking.problemDescription || booking.problem_description || '')
      setSelectedMeds(rx.medicines || [])
      setSelectedTests(rx.tests || [])
    }
  }, [booking])

  // Fetch Catalog Medicines on filter/search change
  useEffect(() => {
    let active = true
    prescriptionService
      .getMedicines({ department_id: deptFilter === 'all' ? null : deptFilter, search: medSearch })
      .then((res) => {
        if (active) setAvailableMeds(res.data || [])
      })
    return () => {
      active = false
    }
  }, [deptFilter, medSearch])

  // Fetch Catalog Lab Tests on search change
  useEffect(() => {
    let active = true
    prescriptionService
      .getLabTests({ department_id: deptFilter === 'all' ? null : deptFilter, search: testSearch })
      .then((res) => {
        if (active) setAvailableTests(res.data || [])
      })
    return () => {
      active = false
    }
  }, [deptFilter, testSearch])

  // Handlers for adding medicine
  const handleAddMedicine = (medObj) => {
    if (selectedMeds.length >= 15) {
      toast.error('Maximum 15 medicines allowed per slip')
      return
    }
    // Check if already added
    if (selectedMeds.some((m) => m.name.toLowerCase() === medObj.name.toLowerCase())) {
      toast.error('Medicine already added')
      return
    }
    const newItem = {
      id: medObj.id || Date.now(),
      name: medObj.name,
      dosage: medObj.default_dosage || '1-0-1',
      frequency: medObj.default_frequency || 'Twice daily',
      duration: medObj.default_duration || '5 days',
      remarks: 'After food',
    }
    setSelectedMeds([...selectedMeds, newItem])
  }

  const handleAddCustomMedicine = () => {
    if (!customMedName.trim()) return
    handleAddMedicine({ name: customMedName.trim(), default_dosage: '1-0-1', default_frequency: 'Twice daily', default_duration: '5 days' })
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

  const handleDeleteMedicine = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the catalog?`)) return
    try {
      await prescriptionService.deleteMedicine(id)
      setAvailableMeds((prev) => prev.filter((m) => m.id !== id))
      toast.success(`${name} deleted from catalog`)
    } catch (err) {
      toast.error('Failed to delete medicine')
    }
  }

  // Handlers for adding test
  const handleAddTest = (testObj) => {
    if (selectedTests.length >= 10) {
      toast.error('Maximum 10 lab tests allowed per slip')
      return
    }
    if (selectedTests.some((t) => t.name.toLowerCase() === testObj.name.toLowerCase())) {
      toast.error('Test already added')
      return
    }
    const newItem = {
      id: testObj.id || Date.now(),
      name: testObj.name,
      remarks: '',
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

  const handleSave = async (shouldPrint = false) => {
    try {
      const targetDeptId = booking?.department_id || (deptFilter !== 'all' ? deptFilter : 1)
      if (selectedMeds.length > 0 || selectedTests.length > 0) {
        await Promise.allSettled([
          ...selectedMeds.map((med) => {
            const isExisting = availableMeds.some((m) => m.id === med.id)
            if (isExisting) {
              return prescriptionService.updateMedicine(med.id, {
                default_dosage: med.dosage,
                default_frequency: med.frequency,
                default_duration: med.duration,
                default_remarks: med.remarks,
              })
            } else {
              return prescriptionService.addMedicine({
                department_id: targetDeptId,
                name: med.name,
                default_dosage: med.dosage,
                default_frequency: med.frequency,
                default_duration: med.duration,
                default_remarks: med.remarks,
              })
            }
          }),
          ...selectedTests.map((test) =>
            prescriptionService.addLabTest({
              department_id: targetDeptId,
              name: test.name,
            })
          ),
        ])
      }

      const savedData = await prescriptionService.savePrescription(booking.id, {
        vitals,
        doctorNotes,
        medicines: selectedMeds,
        tests: selectedTests,
      })
      toast.success('Prescription saved successfully!')
      onClose()

      if (shouldPrint && onSaveAndPrint) {
        // Merge prescription data into booking object for print slip
        const updatedBooking = {
          ...booking,
          prescription: {
            vitals,
            doctor_notes: doctorNotes,
            medicines: selectedMeds,
            tests: selectedTests,
          },
          status: 'completed',
        }
        onSaveAndPrint(updatedBooking)
      }
    } catch (err) {
      toast.error('Failed to save prescription')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`OPD Consultation & Prescription — ${booking.patient_name}`}
      maxWidth="840px"
    >
      <div className={styles.container}>
        {/* Patient Summary Header */}
        <div className={styles.patientSummaryBar}>
          <div className={styles.patientInfoGroup}>
            <div className={styles.patientTitle}>
              {booking.patient_name} ({booking.age ? `${booking.age} Yrs` : '—'} / {booking.gender || '—'})
            </div>
            <div className={styles.patientSub}>
              UHID: <strong>{booking.uhid || 'KGN-PENDING'}</strong> · Mobile: +91 {booking.mobile} · Doctor:{' '}
              {booking.doctor_name || 'General Doctor'}
            </div>
          </div>
          <div className={styles.tokenBadge}>TOKEN: {booking.token_number || 'T-001'}</div>
        </div>

        {/* 1. Vitals Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Activity size={15} color="var(--accent-blue)" /> Patient Vitals
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
            <label className={styles.fieldLabel} style={{ marginBottom: 4, display: 'block' }}>
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

        {/* 2. Prescribe Medicines Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Pill size={15} color="var(--accent-blue)" /> Prescribe Medicines ({selectedMeds.length}/15)
            </span>
          </div>

          {/* Search & Department Controls */}
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

            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={`${styles.input} ${styles.searchInput}`}
                placeholder="Search medicine catalog..."
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
                style={{ padding: '6px 10px', fontSize: 12 }}
                onClick={handleAddCustomMedicine}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* Quick Select Medicines Chips */}
          <div className={styles.chipsRow}>
            {availableMeds.slice(0, 12).map((m) => (
              <div key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <div className={styles.chip} onClick={() => handleAddMedicine(m)} style={{ margin: 0 }}>
                  <Plus size={11} /> {m.name}
                </div>
                <button 
                  type="button"
                  onClick={() => handleDeleteMedicine(m.id, m.name)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  title="Delete medicine from catalog"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Selected Medicines Table */}
          {selectedMeds.length > 0 && (
            <table className={styles.rxTable}>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>Medicine Name</th>
                  <th style={{ width: 90 }}>Dosage</th>
                  <th style={{ width: 120 }}>Frequency</th>
                  <th style={{ width: 90 }}>Duration</th>
                  <th style={{ width: 120 }}>Remarks</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {selectedMeds.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ padding: '3px 6px', fontSize: 11 }}
                        value={item.dosage}
                        onChange={(e) => handleUpdateMed(index, 'dosage', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ padding: '3px 6px', fontSize: 11 }}
                        value={item.frequency}
                        onChange={(e) => handleUpdateMed(index, 'frequency', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ padding: '3px 6px', fontSize: 11 }}
                        value={item.duration}
                        onChange={(e) => handleUpdateMed(index, 'duration', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ padding: '3px 6px', fontSize: 11 }}
                        value={item.remarks}
                        onChange={(e) => handleUpdateMed(index, 'remarks', e.target.value)}
                      />
                    </td>
                    <td>
                      <button className={styles.removeBtn} onClick={() => handleRemoveMed(index)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. Lab Tests Needed Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <TestTube size={15} color="var(--accent-blue)" /> Lab Tests & Checkups ({selectedTests.length}/10)
            </span>
          </div>

          <div className={styles.searchControls}>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={`${styles.input} ${styles.searchInput}`}
                placeholder="Search lab test catalog (CBC, USG, LFT...)"
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
                style={{ padding: '6px 10px', fontSize: 12 }}
                onClick={handleAddCustomTest}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* Quick Add Test Chips */}
          <div className={styles.chipsRow}>
            {availableTests.slice(0, 10).map((t) => (
              <div key={t.id} className={styles.chip} onClick={() => handleAddTest(t)}>
                <Plus size={11} /> {t.name}
              </div>
            ))}
          </div>

          {/* Selected Tests Table */}
          {selectedTests.length > 0 && (
            <table className={styles.rxTable}>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>Test Name</th>
                  <th>Remarks / Instructions</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {selectedTests.map((t, index) => (
                  <tr key={t.id || index}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ padding: '3px 6px', fontSize: 11 }}
                        placeholder="e.g. Fasting sample / Urgent"
                        value={t.remarks}
                        onChange={(e) => handleUpdateTest(index, 'remarks', e.target.value)}
                      />
                    </td>
                    <td>
                      <button className={styles.removeBtn} onClick={() => handleRemoveTest(index)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Buttons */}
        <div className={styles.footerActions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={() => handleSave(false)}>
            <Save size={14} /> Save Prescription
          </button>
          <button className={styles.savePrintBtn} onClick={() => handleSave(true)}>
            <Printer size={14} /> Save & Print Slip
          </button>
        </div>
      </div>
    </Modal>
  )
}
