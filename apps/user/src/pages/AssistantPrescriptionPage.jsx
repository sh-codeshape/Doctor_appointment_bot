import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Activity, FileText, ArrowLeft, Loader } from 'lucide-react'
import PageHeader from '../components/common/PageHeader'
import Card from '../components/common/Card'
import { bookingService } from '../services/bookingService'
import api from '../services/api'
import toast from 'react-hot-toast'
import styles from './PrescriptionPage.module.css'

export default function AssistantPrescriptionPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [vitals, setVitals] = useState({
    bp: '',
    pulse: '',
    temp: '',
    weight: '',
    spo2: '',
  })
  const [doctorNotes, setDoctorNotes] = useState('')

  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        setIsLoading(true)
        const data = await bookingService.getBooking(bookingId)
        if (!active || !data) return

        setBooking(data)

        // Try to load draft first
        try {
          const { data: draftRes } = await api.get(`/bookings/${bookingId}/draft`)
          if (draftRes.success && draftRes.draft) {
            if (draftRes.draft.vitals) setVitals(draftRes.draft.vitals)
            if (draftRes.draft.doctor_notes) setDoctorNotes(draftRes.draft.doctor_notes)
            return
          }
        } catch (e) {
          console.error("Failed to load draft", e)
        }

        // Fallback to existing booking meta
        const rx = data.prescription || data.meta?.prescription || {}
        setVitals(
          rx.vitals || {
            bp: '',
            pulse: '',
            temp: '',
            weight: '',
            spo2: '',
          }
        )
        setDoctorNotes(rx.doctor_notes || '')
      } catch (err) {
        toast.error('Failed to load patient consultation data')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadData()
    return () => { active = false }
  }, [bookingId])

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true)
      const payload = {
        vitals,
        doctor_notes: doctorNotes
      }
      const { data } = await api.patch(`/bookings/${bookingId}/draft`, payload)
      if (data.success) {
        toast.success('Vitals and notes saved successfully!')
        navigate('/appointments')
      } else {
        toast.error(data.message || 'Failed to save data')
      }
    } catch (err) {
      toast.error('An error occurred while saving')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Loader size={32} color="var(--primary)" />
      </div>
    )
  }

  if (!booking) return <div style={{ padding: 40, textAlign: 'center' }}>Booking not found</div>

  const patient = booking.patient_id || {}

  return (
    <div className={styles.page}>
      <PageHeader
        title="Pre-Consultation (Vitals)"
        subtitle="Record patient vitals and initial notes"
        backTo="/appointments"
        action={
          <button
            className={`${styles.saveBtn} ${styles.primaryBtn}`}
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            {isSaving ? <Loader size={16} color="#fff" /> : <Save size={16} />}
            <span>Save & Forward to Doctor</span>
          </button>
        }
      />

      {/* Patient Info Card */}
      <Card className={styles.patientCard}>
        <div className={styles.patientHeader}>
          <div className={styles.avatar}>
            {patient.name?.charAt(0).toUpperCase()}
          </div>
          <div className={styles.patientIdentity}>
            <h2 className={styles.patientName}>{patient.name}</h2>
            <div className={styles.patientMeta}>
              <span className={styles.tag}>{patient.gender}</span>
              <span className={styles.tag}>{patient.age}y</span>
              <span className={styles.tag}>UHID: {patient.uhid || 'N/A'}</span>
              <span className={styles.tag}>Token: {booking.token_number || 'N/A'}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className={styles.rxGrid}>
        <div className={styles.mainColumn}>
          {/* Notes Section */}
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <FileText size={18} />
                <h3>Initial Clinical Notes / Complaints</h3>
              </div>
            </div>
            <textarea
              className={styles.notesTextarea}
              placeholder="Record chief complaints and initial observations..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              rows={8}
            />
          </Card>
        </div>

        <div className={styles.sideColumn}>
          {/* Vitals Section */}
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Activity size={18} />
                <h3>Vitals</h3>
              </div>
            </div>
            <div className={styles.vitalsGrid}>
              <div className={styles.vitalInputGroup}>
                <label>BP (mmHg)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="120/80"
                  value={vitals.bp}
                  onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                />
              </div>
              <div className={styles.vitalInputGroup}>
                <label>Pulse (bpm)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="72"
                  value={vitals.pulse}
                  onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                />
              </div>
              <div className={styles.vitalInputGroup}>
                <label>Temp (°F)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="98.6"
                  value={vitals.temp}
                  onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                />
              </div>
              <div className={styles.vitalInputGroup}>
                <label>Weight (kg)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="65"
                  value={vitals.weight}
                  onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                />
              </div>
              <div className={styles.vitalInputGroup}>
                <label>SpO2 (%)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="98"
                  value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
