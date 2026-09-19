import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  User, Phone, CalendarCheck, ClipboardCheck,
  CheckCircle, ChevronLeft, ChevronRight, Edit, AlertCircle,
} from 'lucide-react'
import { registrationService } from '../services/registrationService'
import { bookingService } from '../services/bookingService'
import { doctorService } from '../services/doctorService'
import { isMockMode } from '../services/api'
import { mockDoctors } from '../data/mockData'
import { useAuth } from '../hooks/useAuth'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import PageHeader from '../components/common/PageHeader'
import FormField from '../components/common/FormField'
import { Loader } from '../components/common/Loader'
import { formatDate } from '../utils/formatters'
import styles from './Register.module.css'

const STEPS = [
  { id: 'patient', label: 'Patient', sub: 'मरीज', icon: User },
  { id: 'contact', label: 'Contact', sub: 'संपर्क', icon: Phone },
  { id: 'visit', label: 'Visit', sub: 'अपॉइंटमेंट', icon: CalendarCheck },
  { id: 'review', label: 'Review', sub: 'समीक्षा', icon: ClipboardCheck },
]

const GENDERS = ['Male', 'Female', 'Other']
const TYPES = [
  { value: 'OPD', label: 'OPD Appointment (ओपीडी)' },
  { value: 'HOSPITALIZATION', label: 'Hospitalization (भर्ती)' },
]

function toLocalISOString(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayISO() {
  return toLocalISOString(new Date())
}

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toLocalISOString(d)
}

function dayAfterTomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return toLocalISOString(d)
}

const EMPTY = {
  phone: '', name: '', age: '', gender: 'Male', isOld: false,
  district: '', address: '', pinCode: '', problemDescription: '',
  departmentId: '', doctorId: '', preferredDate: tomorrowISO(), type: 'OPD',
}

const digitsOnly = (v) => String(v || '').replace(/\D/g, '')

/** Per-step field errors — same thresholds as the bot + backend. */
function stepErrors(step, form) {
  const errs = {}
  if (step === 0) {
    if (!form.name || form.name.trim().length < 2) errs.name = 'Full name needs at least 2 characters'
    const age = parseInt(form.age, 10)
    if (form.age === '' || isNaN(age) || age < 1 || age > 120) errs.age = 'Age must be 1–120'
    if (!GENDERS.includes(form.gender)) errs.gender = 'Pick a gender'
  }
  if (step === 1) {
    if (digitsOnly(form.phone).length < 10) errs.phone = 'Enter a valid 10-digit mobile number'
    if (!form.district.trim()) errs.district = 'District is required'
    if (!form.address.trim()) errs.address = 'Full address with PIN is required'
  }
  if (step === 2) {
    if (!form.preferredDate) errs.preferredDate = 'Pick a date'
    else if (form.preferredDate < todayISO()) errs.preferredDate = 'Date must be today or later'
    if (!form.departmentId) errs.departmentId = 'Choose a department'
    if (form.type === 'OPD' && !form.doctorId) errs.doctorId = 'OPD needs a doctor — assigned by you, this is critical'
  }
  return errs
}

export default function Register() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const editBooking = location.state?.editBooking || null

  const [form, setForm] = useState(EMPTY)
  const [step, setStep] = useState(0)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [serverError, setServerError] = useState(null)

  const { data: rawDoctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors,
  })

  // Pre-fill form state when editing an existing booking
  useEffect(() => {
    if (editBooking) {
      const prefDateStr = editBooking.date || editBooking.preferredDate
      let formattedDate = tomorrowISO()
      if (prefDateStr) {
        const d = new Date(prefDateStr)
        if (!isNaN(d.getTime())) {
          formattedDate = toLocalISOString(d)
        }
      }

      let docIdStr = ''
      if (editBooking.doctor_id) docIdStr = String(editBooking.doctor_id)
      else if (editBooking.doctorId) {
        docIdStr = typeof editBooking.doctorId === 'object' ? String(editBooking.doctorId.id || editBooking.doctorId._id || '') : String(editBooking.doctorId)
      }

      const matchedDoc = (rawDoctors || []).find(d => 
        (docIdStr && String(d.id || d._id) === docIdStr) ||
        (editBooking.doctor_name && d.name && d.name.toLowerCase() === editBooking.doctor_name.toLowerCase())
      )

      if (matchedDoc) {
        docIdStr = String(matchedDoc.id || matchedDoc._id)
      }

      let deptIdStr = ''
      if (editBooking.department_id || editBooking.departmentId) {
        const depObj = editBooking.departmentId
        deptIdStr = typeof depObj === 'object' ? String(depObj.id || depObj._id || '') : String(editBooking.department_id || editBooking.departmentId)
      }
      if (!deptIdStr && matchedDoc) {
        deptIdStr = (matchedDoc.departmentId && typeof matchedDoc.departmentId === 'object')
          ? String(matchedDoc.departmentId.id || matchedDoc.departmentId._id)
          : String(matchedDoc.departmentId || matchedDoc.department || '')
      }

      setForm({
        phone: editBooking.mobile || editBooking.patient_phone || '',
        name: editBooking.patient_name || '',
        age: editBooking.age ? String(editBooking.age) : '',
        gender: editBooking.gender || 'Male',
        isOld: Boolean(editBooking.is_old || editBooking.isOld),
        district: editBooking.district || '',
        address: editBooking.address || '',
        pinCode: editBooking.pinCode || '',
        problemDescription: editBooking.problemDescription || editBooking.notes || '',
        departmentId: deptIdStr,
        doctorId: docIdStr,
        preferredDate: formattedDate,
        type: editBooking.type || 'OPD',
      })
    }
  }, [editBooking, rawDoctors])

  const activeDoctors = useMemo(
    () => (rawDoctors || []).filter((d) => d.is_active !== false),
    [rawDoctors]
  )

  const departments = useMemo(() => {
    if (isMockMode()) {
      return registrationService.getDepartments()
    }
    const map = new Map()
    activeDoctors.forEach((d) => {
      const deptName = d.department || d.specialization
      const deptId = (d.departmentId && typeof d.departmentId === 'object')
        ? (d.departmentId.id || d.departmentId._id)
        : (d.departmentId || deptName)
      if (deptName && !map.has(String(deptId))) {
        map.set(String(deptId), { id: String(deptId), name: deptName })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [activeDoctors])

  const doctors = useMemo(() => {
    if (!form.departmentId) return []
    if (isMockMode()) {
      return registrationService.getDoctorsByDepartment(form.departmentId)
    }
    return activeDoctors.filter((d) => {
      const deptName = d.department || d.specialization
      const deptId = (d.departmentId && typeof d.departmentId === 'object')
        ? (d.departmentId.id || d.departmentId._id)
        : d.departmentId
      return String(deptId) === String(form.departmentId) || deptName === form.departmentId
    })
  }, [activeDoctors, form.departmentId])

  const selectedDoctor = useMemo(() => {
    if (!form.doctorId) return null
    if (isMockMode()) {
      return mockDoctors.find((d) => String(d.id) === String(form.doctorId))
    }
    return activeDoctors.find((d) => String(d.id || d._id) === String(form.doctorId))
  }, [activeDoctors, form.doctorId])

  const selectedDept = useMemo(() => {
    if (!form.departmentId) return null
    return departments.find((d) => String(d.id) === String(form.departmentId) || d.name === form.departmentId)
  }, [departments, form.departmentId])

  const set = (key) => (e) => {
    let value = e?.target ? e.target.value : e
    if (key === 'phone') {
      value = digitsOnly(value).slice(0, 10)
    }
    if (key === 'age') {
      value = digitsOnly(value).slice(0, 3)
    }
    setForm((f) => ({ ...f, [key]: value, ...(key === 'departmentId' ? { doctorId: '' } : {}) }))
    setFieldErrors((errs) => ({ ...errs, [key]: undefined }))
    setServerError(null)
  }

  const copyToClipboard = (text, label) => {
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text)
      toast.success(`Copied ${label}: ${text}`)
    }
  }

  const next = () => {
    const errs = stepErrors(step, form)
    setFieldErrors(errs)
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted fields')
      return
    }
    setServerError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => {
    setFieldErrors({})
    setServerError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = async () => {
    const errs = registrationService.validate(form)
    if (errs.length) {
      toast.error(errs[0])
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      const payload = {
        ...form,
        doctorId: selectedDoctor ? (selectedDoctor.id || selectedDoctor._id) : form.doctorId,
        departmentId: selectedDoctor && selectedDoctor.departmentId
          ? (typeof selectedDoctor.departmentId === 'object' ? (selectedDoctor.departmentId.id || selectedDoctor.departmentId._id) : selectedDoctor.departmentId)
          : form.departmentId,
      }

      if (editBooking) {
        await bookingService.updateBooking(editBooking.id, payload)
        toast.success('Booking & patient details updated successfully!')
        if (editBooking.type === 'HOSPITALIZATION' || form.type === 'HOSPITALIZATION') {
          navigate('/hospitalization')
        } else {
          navigate('/appointments')
        }
        return
      }

      const res = await registrationService.register(payload, { staffCode: user?.staffCode })
      setResult(res)
      const uhidVal = res.patient?.uhid || res.uhid || ''
      toast.success('Registration complete' + (uhidVal ? ' — UHID ' + uhidVal : ''))
    } catch (err) {
      const errorMsg = err.message || 'Registration failed'
      setServerError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const resetAll = () => {
    setForm(EMPTY)
    setFieldErrors({})
    setServerError(null)
    setStep(0)
    setResult(null)
  }

  // ── Success: the same three numbers the bot confirms ──
  if (result) {
    const patient = result.patient || {}
    const booking = result.booking || {}
    const uhid = patient.uhid || booking.uhid || result.uhid
    const tokenNo = booking.tokenNumber || booking.token_number || result.tokenNumber
    const bookingId = booking.bookingId || booking.booking_id || result.bookingId
    const patientName = patient.name || booking.patient_name || form.name
    const bookingDate = booking.preferredDate || booking.date || form.preferredDate

    return (
      <div className={styles.page}>
        <PageHeader
          title="Registration Complete"
          subtitle="पंजीकरण पूर्ण — share these numbers with the patient"
          icon={CheckCircle}
        />
        <Card>
          <div className={styles.success}>
            <div className={styles.successBadge}><CheckCircle size={44} /></div>
            <div className={styles.numbers}>
              {uhid && (
                <div className={styles.numberCard} onClick={() => copyToClipboard(uhid, 'UHID')} title="Click to copy">
                  <span className={styles.numberLabel}>UHID No · यूएचआईडी</span>
                  <span className={styles.numberValue}>{uhid}</span>
                  <span className={styles.numberHint}>Click to copy • Same for this phone</span>
                </div>
              )}
              {tokenNo && (
                <div className={`${styles.numberCard} ${styles.tokenCard}`} onClick={() => copyToClipboard(tokenNo, 'Token')} title="Click to copy">
                  <span className={styles.numberLabel}>Token No · टोकन</span>
                  <span className={styles.numberValue}>{tokenNo}</span>
                  <span className={styles.numberHint}>Click to copy • Daily queue serial</span>
                </div>
              )}
              {bookingId && (
                <div className={styles.numberCard} onClick={() => copyToClipboard(bookingId, 'Booking ID')} title="Click to copy">
                  <span className={styles.numberLabel}>Booking ID</span>
                  <span className={styles.numberValueSm}>{bookingId}</span>
                  <span className={styles.numberHint}>{patientName} • {formatDate(bookingDate)}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button size="lg" onClick={resetAll}>Register Another Patient</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={editBooking ? "Edit Patient Booking" : "Register Patient"}
        subtitle={editBooking ? "मरीज एवं अपॉइंटमेंट विवरण संशोधन" : "Same questions as the WhatsApp bot — offline entries produce identical records"}
        icon={editBooking ? Edit : User}
      />

      {/* ── Stepper ── */}
      <div className={styles.stepper} role="list" aria-label="Registration steps">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const state = i < step ? 'done' : i === step ? 'active' : 'todo'
          return (
            <div
              key={s.id}
              role="listitem"
              className={`${styles.step} ${styles[state]}`}
              onClick={() => setStep(i)}
              style={{ cursor: 'pointer' }}
              title={`Jump to ${s.label}`}
            >
              <div className={styles.stepDot}>
                {i < step ? <CheckCircle size={18} /> : <Icon size={18} />}
              </div>
              <div className={styles.stepText}>
                <span className={styles.stepLabel}>{i + 1}. {s.label}</span>
                <span className={styles.stepSub}>{s.sub}</span>
              </div>
              {i < STEPS.length - 1 && <div className={styles.stepLine} />}
            </div>
          )
        })}
      </div>

      <Card>
        <div key={step} className="animate-fade-in">
          {/* ── STEP 1: Patient ── */}
          {step === 0 && (
            <div className={styles.grid}>
              <FormField label="Patient Name" hint="मरीज का नाम" required error={fieldErrors.name}>
                <input id="reg-name" value={form.name} onChange={set('name')} placeholder="Full name / पूरा नाम" autoFocus />
              </FormField>
              <div className={styles.row2}>
                <FormField label="Age" hint="उम्र" required error={fieldErrors.age}>
                  <input id="reg-age" value={form.age} onChange={set('age')} placeholder="e.g. 45" inputMode="numeric" />
                </FormField>
                <FormField label="Gender" hint="लिंग" required error={fieldErrors.gender}>
                  <select id="reg-gender" value={form.gender} onChange={set('gender')}>
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Patient Status" hint="मरीज का प्रकार (पुराना / नया)" required>
                <select id="reg-isOld" value={form.isOld ? 'true' : 'false'} onChange={(e) => setForm(f => ({ ...f, isOld: e.target.value === 'true' }))}>
                  <option value="false">New Patient (नया मरीज)</option>
                  <option value="true">Old / Existing Patient (पुराना मरीज)</option>
                </select>
              </FormField>
            </div>
          )}

          {/* ── STEP 2: Contact ── */}
          {step === 1 && (
            <div className={styles.grid}>
              <div className={styles.row2}>
                <FormField label="Mobile Number" hint="मोबाइल नंबर" required error={fieldErrors.phone}>
                  <input id="reg-phone" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" inputMode="tel" />
                </FormField>
                <FormField label="District" hint="जिला" required error={fieldErrors.district}>
                  <input id="reg-district" value={form.district} onChange={set('district')} placeholder="e.g. Jaunpur" />
                </FormField>
              </div>
              <FormField label="Complete Address with PIN" hint="पूरा पता पिन कोड सहित" required error={fieldErrors.address}>
                <textarea id="reg-address" value={form.address} onChange={set('address')} placeholder="House, street, area" rows={2} />
              </FormField>
              <div className={styles.row2}>
                <FormField label="PIN Code" hint="पिन कोड">
                  <input id="reg-pin" value={form.pinCode} onChange={set('pinCode')} placeholder="e.g. 222001" inputMode="numeric" />
                </FormField>
                <div />
              </div>
            </div>
          )}

          {/* ── STEP 3: Visit ── */}
          {step === 2 && (
            <div className={styles.grid}>
              <div className={styles.row2}>
                <FormField label="Visit Type" required>
                  <select id="reg-type" value={form.type} onChange={set('type')}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Preferred Date" hint="तारीख (DD/MM/YYYY)" required error={fieldErrors.preferredDate}>
                  <div className={styles.datePickerContainer}>
                    <input
                      id="reg-date"
                      type="date"
                      value={form.preferredDate}
                      onChange={set('preferredDate')}
                      min={todayISO()}
                      className={styles.dateInput}
                    />
                    <div className={styles.selectedDateBadge}>
                      📅 Selected: <strong>{formatDate(form.preferredDate)}</strong> (DD/MM/YYYY)
                    </div>
                    <div className={styles.datePresets}>
                      <button
                        type="button"
                        className={`${styles.presetBtn} ${form.preferredDate === todayISO() ? styles.presetActive : ''}`}
                        onClick={() => setForm((f) => ({ ...f, preferredDate: todayISO() }))}
                      >
                        Today · {formatDate(todayISO())}
                      </button>
                      <button
                        type="button"
                        className={`${styles.presetBtn} ${form.preferredDate === tomorrowISO() ? styles.presetActive : ''}`}
                        onClick={() => setForm((f) => ({ ...f, preferredDate: tomorrowISO() }))}
                      >
                        Tomorrow · {formatDate(tomorrowISO())}
                      </button>
                      <button
                        type="button"
                        className={`${styles.presetBtn} ${form.preferredDate === dayAfterTomorrowISO() ? styles.presetActive : ''}`}
                        onClick={() => setForm((f) => ({ ...f, preferredDate: dayAfterTomorrowISO() }))}
                      >
                        Day After · {formatDate(dayAfterTomorrowISO())}
                      </button>
                    </div>
                  </div>
                </FormField>
              </div>
              <div className={styles.row2}>
                <FormField label="Department" hint="विभाग" required error={fieldErrors.departmentId}>
                  <select id="reg-dept" value={form.departmentId} onChange={set('departmentId')}>
                    <option value="">— Select department —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </FormField>
                <FormField
                  label="Doctor"
                  hint={form.type === 'OPD' ? 'डॉक्टर (OPD needs a doctor)' : 'optional for hospitalization'}
                  required={form.type === 'OPD'}
                  error={fieldErrors.doctorId}
                >
                  <select id="reg-doctor" value={form.doctorId} onChange={set('doctorId')} disabled={!form.departmentId}>
                    <option value="">— Select doctor —</option>
                    {doctors.map((d) => {
                      const spec = d.specialization || d.department || d.qualification
                      const fee = form.isOld ? (d.old_patient_fee || d.oldPatientFee || d.consultation_fee || d.consultationFee) : (d.consultation_fee || d.consultationFee)
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name}{spec ? ` (${spec})` : ''} — ₹{fee}
                        </option>
                      )
                    })}
                  </select>
                  {selectedDoctor && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#0369a1', fontWeight: 500, background: '#f0f9ff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                      💰 Applicable Fee ({form.isOld ? 'Old / Existing Patient' : 'New Patient'}): <strong>₹{form.isOld ? (selectedDoctor.old_patient_fee || selectedDoctor.oldPatientFee || selectedDoctor.consultation_fee || selectedDoctor.consultationFee) : (selectedDoctor.consultation_fee || selectedDoctor.consultationFee)}</strong>
                      {form.isOld && (selectedDoctor.old_patient_fee || selectedDoctor.oldPatientFee) ? (
                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>(Regular: ₹{selectedDoctor.consultation_fee || selectedDoctor.consultationFee})</span>
                      ) : null}
                    </div>
                  )}
                </FormField>
              </div>
              <FormField label="Health Problem" hint="स्वास्थ्य समस्या">
                <textarea id="reg-problem" value={form.problemDescription} onChange={set('problemDescription')} placeholder="Briefly describe the problem" rows={2} />
              </FormField>
            </div>
          )}

          {/* ── STEP 4: Review ticket ── */}
          {step === 3 && (
            <div className={styles.review}>
              <div className={styles.ticket}>
                <div className={styles.ticketHead}>Review Appointment Request · समीक्षा</div>
                <dl className={styles.ticketRows}>
                  <div><dt>Patient</dt><dd>{form.name}, {form.age} · {form.gender} ({form.isOld ? 'Old Patient' : 'New Patient'})</dd></div>
                  <div><dt>Mobile</dt><dd>{form.phone}</dd></div>
                  <div><dt>Address</dt><dd>{form.address}{form.district ? `, ${form.district}` : ''}{form.pinCode ? ` — ${form.pinCode}` : ''}</dd></div>
                  <div><dt>Visit</dt><dd>{form.type === 'OPD' ? 'OPD' : 'Hospitalization'} · {formatDate(form.preferredDate)}</dd></div>
                  <div><dt>Department</dt><dd>{selectedDept?.name || '—'}</dd></div>
                  <div>
                    <dt>Doctor</dt>
                    <dd>
                      {selectedDoctor ? (
                        <>
                          {selectedDoctor.name}
                          {(selectedDoctor.specialization || selectedDoctor.department || selectedDoctor.qualification) ? (
                            ` (${selectedDoctor.specialization || selectedDoctor.department || selectedDoctor.qualification})`
                          ) : ''}
                        </>
                      ) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Doctor Charge</dt>
                    <dd>
                      {selectedDoctor ? (
                        <>
                          <strong>₹{form.isOld ? (selectedDoctor.old_patient_fee || selectedDoctor.oldPatientFee || selectedDoctor.consultation_fee || selectedDoctor.consultationFee) : (selectedDoctor.consultation_fee || selectedDoctor.consultationFee)}</strong>
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>
                            ({form.isOld ? 'Old Patient Fee' : 'New Patient Fee'})
                          </span>
                        </>
                      ) : '—'}
                    </dd>
                  </div>
                  {form.problemDescription && <div><dt>Problem</dt><dd>{form.problemDescription}</dd></div>}
                </dl>
              </div>
              <p className={styles.reviewNote}>
                {editBooking ? 'Saving changes will update the patient record and booking details immediately.' : 'Confirming creates the patient (shared UHID for this phone) and the booking (fresh token). Same numbers the bot would confirm.'}
              </p>
            </div>
          )}
        </div>

        {serverError && (
          <div className={styles.redErrorBanner}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{serverError}</span>
          </div>
        )}

        {/* ── Wizard footer ── */}
        <div className={styles.wizardFoot}>
          <div>
            {step > 0 && (
              <Button variant="secondary" icon={ChevronLeft} onClick={back} disabled={submitting}>
                Back
              </Button>
            )}
          </div>
          <div className={styles.stepCount}>Step {step + 1} of {STEPS.length}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {editBooking && (
              <Button icon={Edit} size="lg" onClick={handleSubmit} disabled={submitting}>
                Save Changes Instantly
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button icon={ChevronRight} onClick={next} variant={editBooking ? "secondary" : "primary"}>
                Continue
              </Button>
            ) : submitting ? (
              <Loader />
            ) : !editBooking ? (
              <Button icon={CheckCircle} size="lg" onClick={handleSubmit}>
                Confirm Registration
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}
