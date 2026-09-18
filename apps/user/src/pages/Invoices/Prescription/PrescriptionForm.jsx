import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Printer,
  Save,
  Trash2,
  UserRound,
  Search,
  LoaderCircle,
  CheckCircle2,
  Pencil as PencilIcon,
  X as XIcon,
} from 'lucide-react'
import styles from './PrescriptionForm.module.css'

const emptyMedicine = { name: '', dose: '', frequency: '', period: '' }

const DEFAULT_MEDICINES = [
  { id: 'clompic-cv-625-mg-tab', name: 'CLOMPIC CV 625 MG TAB', dose: '1 TAB', frequency: 'BD (Two times a day)', period: '7 DAYS' },
  { id: 'zerodol-p-tab', name: 'ZERODOL P TAB', dose: '1/2 TAB', frequency: 'BD (Two times a day)', period: '7 DAYS' },
  { id: 'panopaz-d-cap', name: 'PANOPAZ D CAP', dose: '1 CAP', frequency: 'BD (Two times a day)', period: '7 DAYS' },
  { id: 'mactotal-cap', name: 'MACTOTAL CAP', dose: '1 CAP', frequency: 'OD (Once a day)', period: '7 DAYS' },
  { id: 'bnc-syp', name: 'BNC SYP', dose: '2 TSF', frequency: 'TDS (Three times a day)', period: '7 DAYS' },
  { id: 'contralax-syp', name: 'CONTRALAX SYP', dose: '2 TSF', frequency: 'HS', period: '7 DAYS' },
  { id: 'mucaine-gel-syp', name: 'MUCAINE GEL SYP', dose: '', frequency: '', period: '' },
]

const MEDICINE_STORAGE_KEY = 'kg-nanda-prescription-medicines'
const DOCTOR_STORAGE_KEY = 'kg-nanda-prescription-doctors'

function formatDoctorName(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return ''
  return /^dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`
}

const DEFAULT_DOCTORS = [
  { id: 1, department_id: 2, name: 'Dr. Abhinav Katiyar', role: 'Laparoscopic Surgeon', department: 'Laparoscopic & General Surgery', qualification: 'MBBS, DNB', experience: '12+ Years', consultation_fee: 500, is_active: true, image: '' },
  { id: 2, department_id: 1, name: 'Dr. Anand Prakash Tiwari', role: 'Senior Gynaecologist & Infertility Specialist', department: 'Obstetrics & Gynaecology', qualification: 'M.S. (Obs & Gynae)', experience: '15+ Years', consultation_fee: 500, is_active: true, image: '' },
  { id: 3, department_id: 4, name: 'Dr. Vikram Singh', role: 'Urologist', department: 'Urology', qualification: 'MBBS, MCH', experience: '14+ Years', consultation_fee: 600, is_active: true, image: '' },
  { id: 4, department_id: 3, name: 'Dr. Arun Kumar Singh', role: 'Orthopedic Surgeon', department: 'Orthopaedics', qualification: 'MBBS', experience: '10+ Years', consultation_fee: 400, is_active: true, image: '' },
  { id: 5, department_id: 2, name: 'Dr. Vishwanath Pratap Singh', role: 'Laparoscopic Surgeon', department: 'Laparoscopic & General Surgery', qualification: 'MBBS, MS', experience: '11+ Years', consultation_fee: 500, is_active: true, image: '' },
  { id: 6, department_id: 3, name: 'Dr. Pankaj Kumar Singh', role: 'Orthopedic Specialist', department: 'Orthopaedics', qualification: 'MBBS, MS', experience: '13+ Years', consultation_fee: 500, is_active: true, image: '' },
  { id: 7, department_id: 5, name: 'Dr. Sushil Krishna Murti', role: 'Anesthesiologist', department: 'Anaesthetist', qualification: 'MBBS, MD', experience: '16+ Years', consultation_fee: 500, is_active: true, image: '' },
  { id: 8, department_id: 6, name: 'Dr. Mrityunjay Prasad', role: 'General & Ayurvedic Surgeon', department: 'General Surgery (Shalya)', qualification: 'MS (Shalya)', experience: '12+ Years', consultation_fee: 400, is_active: true, image: '' },
  { id: 9, department_id: 9, name: 'Dr. Ankit Kumar Singh', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'MBBS', experience: '6+ Years', consultation_fee: 300, is_active: true, image: '' },
  { id: 10, department_id: 7, name: 'Dr. Prabhunath Dubey', role: 'Pediatric Specialist', department: 'Paediatric', qualification: 'BMS, PGDNC', experience: '10+ Years', consultation_fee: 350, is_active: true, image: '' },
  { id: 11, department_id: 8, name: 'Dr. Abhinav Mishra', role: 'ENT Specialist', department: 'ENT', qualification: 'MBBS, MS (ENT)', experience: '9+ Years', consultation_fee: 400, is_active: true, image: '' },
  { id: 12, department_id: 6, name: 'Dr. Yogesh Kumar Pandey', role: 'General & Ayurvedic Surgeon', department: 'General Surgery (Shalya)', qualification: 'MS (Shalya)', experience: '11+ Years', consultation_fee: 400, is_active: true, image: '' },
  { id: 13, department_id: 9, name: 'Dr. Akhilesh Kumar Singh', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'BAMS (RMO)', experience: '7+ Years', consultation_fee: 300, is_active: true, image: '' },
  { id: 14, department_id: 3, name: 'Dr. Niket Raj Garg', role: 'Orthopedic Surgeon', department: 'Orthopaedics', qualification: 'MBBS, MS', experience: '10+ Years', consultation_fee: 450, is_active: true, image: '' },
  { id: 15, department_id: 7, name: 'Dr. Dilip Kumar Gupta', role: 'Senior Pediatrician', department: 'Paediatric', qualification: 'MBBS, DCH', experience: '14+ Years', consultation_fee: 400, is_active: true, image: '' },
  { id: 16, department_id: 9, name: 'Dr. Parvez Ahmad', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'BAMS, MD', experience: '8+ Years', consultation_fee: 300, is_active: true, image: '' },
  { id: 17, department_id: 9, name: 'Dr. Umesh Kumar Maurya', role: 'Resident Medical Officer', department: 'RMO - Resident Medical Officer', qualification: 'MBBS', experience: '9+ Years', consultation_fee: 350, is_active: true, image: '' },
  { id: 18, department_id: 1, name: 'Dr. Shobha Jaiswal', role: 'Gynecologist & Obstetrician', department: 'Obstetrics & Gynaecology', qualification: 'MBBS, MS (Obs & Gynae)', experience: '12+ Years', consultation_fee: 400, is_active: true, image: '' },
  { id: 19, department_id: 1, name: 'Dr. Sadhna Chaurasiya', role: 'Gynecologist & Obstetrician', department: 'Obstetrics & Gynaecology', qualification: 'MBBS, DGO', experience: '9+ Years', consultation_fee: 350, is_active: true, image: '' },
]

function medicineId(name) {
  return `${String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
}

const emptyForm = {
  patientName: '',
  mobile: '',
  fatherName: '',
  address: '',
  age: '',
  sex: '',
  maritalStatus: '',
  uhid: '',
  bookingId: '',
  date: '',
  time: '',
  doctors: [''],
  investigation: '',
  medicines: [{ ...emptyMedicine }],
  notes: 'मरीज को चावल, दूध, दही, फल ज्यादा मसालेदार भोजन व वजन उठाना और सीढ़ी चढ़ना मना है',
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function today() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

const DOSE_OPTIONS = [
  '1 TAB',
  '1/2 TAB',
  '2 TAB',
  '1 CAP',
  '2 CAP',
  '1 TSF',
  '2 TSF',
  '1/2 TSF',
  '5 ML',
  '10 ML',
  '15 ML',
  '1 DROP',
  '2 DROPS',
  '3 DROPS',
  '1 SACHET',
  '1 INJ',
  '1 PUFF',
  '2 PUFFS',
  '1 VIAL',
  '1 AMP',
  'Apply Locally',
]

const FREQUENCY_OPTIONS = [
  'BD (Two times a day)',
  'OD (Once a day)',
  'TDS (Three times a day)',
  'QID (Four times a day)',
  'HS (At bedtime)',
  'SOS (As needed / when required)',
  'STAT (Immediately / single dose)',
  '1/2 BD (Half tablet twice daily)',
  'BBF (Before breakfast)',
  'PC (After meals)',
  'AC (Before meals)',
  'Alternate Day',
  'Once a week',
  'Twice a week',
]

const PERIOD_OPTIONS = [
  '1 DAY',
  '2 DAYS',
  '3 DAYS',
  '4 DAYS',
  '5 DAYS',
  '7 DAYS',
  '10 DAYS',
  '14 DAYS',
  '15 DAYS',
  '21 DAYS',
  '1 MONTH',
  '2 MONTHS',
  '3 MONTHS',
  'CONTINUE',
  'SOS',
]

function toInputTime(value) {
  if (!value) return ''
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5)
  const match = String(value).match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i)
  if (!match) return ''
  let hours = parseInt(match[1], 10)
  const minutes = match[2].padStart(2, '0')
  const ampm = match[4]?.toUpperCase()
  if (ampm === 'PM' && hours < 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

function formatTimeTo12Hour(value) {
  if (!value) return ''
  const parts = value.split(':')
  if (parts.length < 2) return value
  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes}:00 ${ampm}`
}

function toInputDate(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parts = String(value).split('/')
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function formatDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function normalizePatientResponse(payload) {
  const patient = payload?.patient || payload?.data || payload
  if (!patient || typeof patient !== 'object') return null

  return {
    patientName: patient.patientName || patient.name || patient.fullName || '',
    mobile: patient.mobile || patient.phone || patient.mobileNumber || '',
    fatherName: patient.fatherName || patient.husbandName || patient.guardianName || '',
    address: patient.address || patient.fullAddress || '',
    age: patient.age ?? '',
    sex: patient.sex || patient.gender || '',
    maritalStatus: patient.maritalStatus || '',
    uhid: patient.uhid || patient.UHID || patient.uhidNumber || patient.uhid_no || '',
    bookingId:
      patient.bookingId ||
      patient.bookingID ||
      patient.booking_id ||
      patient.bookingNo ||
      patient.bookingNumber ||
      patient.appointmentId ||
      patient.appointment_id ||
      '',
  }
}

export default function PrescriptionForm({
  initialData,
  onCancel,
  onSave,
  onSaved,
}) {
  const [form, setForm] = useState(() =>
    initialData
      ? { ...emptyForm, ...initialData }
      : { ...emptyForm, date: today(), time: nowTime() }
  )
  const [patientLoading, setPatientLoading] = useState(false)
  const [patientFound, setPatientFound] = useState(false)
  const [patientError, setPatientError] = useState('')
  const [medicineCatalog, setMedicineCatalog] = useState(DEFAULT_MEDICINES)
  const [doctorCatalog, setDoctorCatalog] = useState(DEFAULT_DOCTORS)
  const [medicineManagerOpen, setMedicineManagerOpen] = useState(false)
  const [medicineEditingId, setMedicineEditingId] = useState(null)
  const [medicineDraft, setMedicineDraft] = useState({
    name: '',
    dose: '',
    frequency: '',
    period: '',
  })
  const [doctorManagerOpen, setDoctorManagerOpen] = useState(false)
  const [doctorEditingId, setDoctorEditingId] = useState(null)
  const [doctorDraft, setDoctorDraft] = useState({
    name: '',
    qualification: '',
    role: '',
    department: '',
  })

  useEffect(() => {
    setForm(
      initialData
        ? { ...emptyForm, ...initialData }
        : { ...emptyForm, date: today(), time: nowTime() }
    )
    setPatientFound(false)
    setPatientError('')
  }, [initialData])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DOCTOR_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDoctorCatalog(parsed)
        }
      }
    } catch {
      // Keep the built-in doctor list if localStorage is unavailable.
    }
  }, [])

  useEffect(() => {
    // Load doctors from the backend. If the API is unavailable,
    // the hospital's default doctors are still available in the dropdown.
    const controller = new AbortController()

    fetch(`${API_BASE}/doctors`, {
      signal: controller.signal,
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Doctors API unavailable')
        const payload = await response.json()
        const list = Array.isArray(payload)
          ? payload
          : payload?.doctors || payload?.data || []

        const doctors = list
          .map((doctor) =>
            typeof doctor === 'string'
              ? { name: doctor }
              : doctor
          )
          .filter((doctor) => doctor?.name || doctor?.doctorName || doctor?.fullName)
          .map((doctor) => ({
            ...doctor,
            name: formatDoctorName(doctor.name || doctor.doctorName || doctor.fullName),
          }))

        if (doctors.length) {
          try {
            const saved = localStorage.getItem(DOCTOR_STORAGE_KEY)
            if (!saved) {
              setDoctorCatalog(doctors)
            }
          } catch {
            setDoctorCatalog(doctors)
          }
        }
      })
      .catch(() => {
        // Keep default doctors when the backend endpoint is not available.
      })

    return () => controller.abort()
  }, [])

  const persistDoctorCatalog = (nextCatalog) => {
    setDoctorCatalog(nextCatalog)
    try {
      localStorage.setItem(DOCTOR_STORAGE_KEY, JSON.stringify(nextCatalog))
    } catch {
      // The form still works if browser storage is unavailable.
    }
  }

  const openAddDoctorManager = () => {
    setDoctorEditingId(null)
    setDoctorDraft({ name: '', qualification: '', role: '', department: '' })
    setDoctorManagerOpen(true)
  }

  const openEditDoctor = (doctor) => {
    setDoctorEditingId(doctor.id || doctor.name)
    setDoctorDraft({
      name: doctor.name || '',
      qualification: doctor.qualification || '',
      role: doctor.role || '',
      department: doctor.department || '',
    })
    setDoctorManagerOpen(true)
  }

  const saveDoctorMaster = () => {
    const rawName = doctorDraft.name.trim()
    if (!rawName) {
      alert('Doctor name is required.')
      return
    }
    const name = formatDoctorName(rawName)

    if (doctorEditingId) {
      const oldDoctor = doctorCatalog.find((item) => (item.id || item.name) === doctorEditingId)
      const nextCatalog = doctorCatalog.map((item) =>
        (item.id || item.name) === doctorEditingId
          ? {
              ...item,
              name,
              qualification: doctorDraft.qualification.trim(),
              role: doctorDraft.role.trim(),
              department: doctorDraft.department.trim(),
            }
          : item
      )
      persistDoctorCatalog(nextCatalog)

      if (oldDoctor && oldDoctor.name !== name) {
        setForm((prev) => ({
          ...prev,
          doctors: prev.doctors.map((doc) => (doc === oldDoctor.name ? name : doc)),
        }))
      }
    } else {
      const duplicate = doctorCatalog.some(
        (item) => item.name.trim().toLowerCase() === name.toLowerCase()
      )
      if (duplicate) {
        alert('This doctor already exists in the catalog.')
        return
      }

      persistDoctorCatalog([
        ...doctorCatalog,
        {
          id: `doc-${Date.now()}`,
          name,
          qualification: doctorDraft.qualification.trim(),
          role: doctorDraft.role.trim(),
          department: doctorDraft.department.trim(),
          is_active: true,
        },
      ])
    }

    setDoctorEditingId(null)
    setDoctorDraft({ name: '', qualification: '', role: '', department: '' })
  }

  const deleteDoctorMaster = (id) => {
    const doctor = doctorCatalog.find((item) => (item.id || item.name) === id)
    if (!doctor) return

    if (!window.confirm(`Delete "${doctor.name}" from the doctor list?`)) return
    const nextCatalog = doctorCatalog.filter((item) => (item.id || item.name) !== id)
    persistDoctorCatalog(nextCatalog)
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MEDICINE_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setMedicineCatalog(parsed)
        }
      }
    } catch {
      // Keep the built-in medicine list if localStorage is unavailable.
    }
  }, [])

  const persistMedicineCatalog = (nextCatalog) => {
    setMedicineCatalog(nextCatalog)
    try {
      localStorage.setItem(MEDICINE_STORAGE_KEY, JSON.stringify(nextCatalog))
    } catch {
      // The form still works if browser storage is unavailable.
    }
  }

  const openAddMedicineManager = () => {
    setMedicineEditingId(null)
    setMedicineDraft({ name: '', dose: '', frequency: '', period: '' })
    setMedicineManagerOpen(true)
  }

  const openEditMedicine = (medicine) => {
    setMedicineEditingId(medicine.id)
    setMedicineDraft({
      name: medicine.name || '',
      dose: medicine.dose || '',
      frequency: medicine.frequency || '',
      period: medicine.period || '',
    })
    setMedicineManagerOpen(true)
  }

  const saveMedicineMaster = () => {
    const name = medicineDraft.name.trim()
    if (!name) {
      alert('Medicine name is required.')
      return
    }

    if (medicineEditingId) {
      const oldMedicine = medicineCatalog.find((item) => item.id === medicineEditingId)
      const nextCatalog = medicineCatalog.map((item) =>
        item.id === medicineEditingId
          ? { ...item, ...medicineDraft, name }
          : item
      )
      persistMedicineCatalog(nextCatalog)

      if (oldMedicine && oldMedicine.name !== name) {
        setForm((prev) => ({
          ...prev,
          medicines: prev.medicines.map((row) =>
            row.name === oldMedicine.name ? { ...row, name } : row
          ),
        }))
      }
    } else {
      const duplicate = medicineCatalog.some(
        (item) => item.name.trim().toLowerCase() === name.toLowerCase()
      )
      if (duplicate) {
        alert('This medicine already exists.')
        return
      }

      persistMedicineCatalog([
        ...medicineCatalog,
        {
          id: medicineId(name),
          name,
          dose: medicineDraft.dose.trim(),
          frequency: medicineDraft.frequency.trim(),
          period: medicineDraft.period.trim(),
        },
      ])
    }

    setMedicineEditingId(null)
    setMedicineDraft({ name: '', dose: '', frequency: '', period: '' })
  }

  const deleteMedicineMaster = (id) => {
    const medicine = medicineCatalog.find((item) => item.id === id)
    if (!medicine) return

    if (!window.confirm(`Delete "${medicine.name}" from the medicine list?`)) return
    persistMedicineCatalog(medicineCatalog.filter((item) => item.id !== id))
  }

  const selectMedicine = (index, medicineIdValue) => {
    const selected = medicineCatalog.find((item) => item.id === medicineIdValue)

    setForm((prev) => {
      const medicines = [...prev.medicines]
      medicines[index] = selected
        ? {
            name: selected.name,
            dose: selected.dose || '',
            frequency: selected.frequency || '',
            period: selected.period || '',
          }
        : { ...emptyMedicine }
      return { ...prev, medicines }
    })
  }

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /*
    Real-time UHID lookup:
    - If VITE_API_URL is configured, it calls:
      GET {VITE_API_URL}/patients/search?uhid=<UHID>
    - It first tries GET /patients/search?uhid=<UHID>, then
      GET /patients/uhid/<UHID>.
    - The form still works without an API; the local fields remain editable.

    Doctor dropdown:
    - It uses the supplied 19-doctor hospital roster by default.
    - If GET /doctors returns a valid list, that list is used instead.
  */
  useEffect(() => {
    const uhid = form.uhid.replace(/\s/g, '')
    const bookingId = String(form.bookingId || '').trim()

    if (!uhid && !bookingId) {
      setPatientFound(false)
      setPatientError('')
      setPatientLoading(false)
      return undefined
    }

    if (!bookingId && uhid.length < 3) {
      setPatientFound(false)
      setPatientError('')
      return undefined
    }

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      setPatientLoading(true)
      setPatientError('')

      try {
        const endpoints = []

        if (uhid) {
          endpoints.push(
            `${API_BASE}/patients/search?uhid=${encodeURIComponent(uhid)}`,
            `${API_BASE}/patients/uhid/${encodeURIComponent(uhid)}`
          )
        }

        if (bookingId) {
          endpoints.push(
            `${API_BASE}/patients/search?bookingId=${encodeURIComponent(bookingId)}`,
            `${API_BASE}/patients/booking/${encodeURIComponent(bookingId)}`,
            `${API_BASE}/bookings/search?bookingId=${encodeURIComponent(bookingId)}`
          )
        }

        let patient = null

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              signal: controller.signal,
              credentials: 'include',
            })

            if (!response.ok) continue

            const payload = await response.json()
            const normalized = normalizePatientResponse(payload)

            if (normalized?.patientName || normalized?.uhid || normalized?.bookingId) {
              patient = normalized
              break
            }
          } catch (requestError) {
            if (requestError.name === 'AbortError') throw requestError
          }
        }

        if (!patient) {
          setPatientFound(false)
          setPatientError(
            bookingId
              ? 'No patient found for this UHID / Token Number.'
              : 'No patient found for this UHID.'
          )
          return
        }

        setForm((prev) => ({
          ...prev,
          ...patient,
          uhid: patient.uhid || prev.uhid,
          bookingId: patient.bookingId || prev.bookingId,
        }))
        setPatientFound(true)
        setPatientError('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPatientFound(false)
          setPatientError('Unable to fetch patient details. Check the patient API.')
        }
      } finally {
        setPatientLoading(false)
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [form.uhid, form.bookingId])

  const updateDoctor = (index, value) => {
    setForm((prev) => {
      const doctors = [...prev.doctors]
      doctors[index] = value
      return { ...prev, doctors }
    })
  }

  const addDoctor = () => {
    setForm((prev) => ({ ...prev, doctors: [...prev.doctors, ''] }))
  }

  const removeDoctor = (index) => {
    setForm((prev) => ({
      ...prev,
      doctors: prev.doctors.length === 1
        ? ['']
        : prev.doctors.filter((_, i) => i !== index),
    }))
  }

  const updateMedicine = (index, key, value) => {
    setForm((prev) => {
      const medicines = [...prev.medicines]
      medicines[index] = { ...medicines[index], [key]: value }
      return { ...prev, medicines }
    })
  }

  const addMedicine = () => {
    setForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { ...emptyMedicine }],
    }))
  }

  const removeMedicine = (index) => {
    setForm((prev) => ({
      ...prev,
      medicines:
        prev.medicines.length === 1
          ? [{ ...emptyMedicine }]
          : prev.medicines.filter((_, i) => i !== index),
    }))
  }

  const getData = () => ({
    ...form,
    doctors: form.doctors.filter((doctor) => doctor.trim()),
    medicines: form.medicines.filter((medicine) => medicine.name.trim()),
  })

  const validate = () => {
    if (!form.patientName.trim()) {
      alert('Patient Name is required.')
      return false
    }
    if (!form.uhid.trim()) {
      alert('UHID is required.')
      return false
    }
    if (!form.bookingId.trim()) {
      alert('Token Number is required.')
      return false
    }
    if (!form.date.trim()) {
      alert('Date is required.')
      return false
    }
    return true
  }

  const save = () => {
    if (!validate()) return
    onSaved?.(getData())
  }

  const saveAndPrint = () => {
    if (!validate()) return
    const data = getData()
    onSaved?.(data)
    setTimeout(() => window.print(), 150)
  }

  const filledMedicines = useMemo(
    () => form.medicines.filter((medicine) => medicine.name.trim()).length,
    [form.medicines]
  )

  return (
    <>
      <section className={styles.page}>
       

       
        <div className={styles.card}>
         
          <div className={styles.uhidLookup}>
            <div className={styles.lookupGrid}>
              <label className={styles.lookupField}>
                <span className={styles.lookupHeader}>
                  <span>UHID Number</span>
                  {patientLoading && <LoaderCircle className={styles.spin} size={15} />}
                  {!patientLoading && patientFound && <CheckCircle2 className={styles.found} size={15} />}
                </span>
                <div className={styles.uhidSearch}>
                  <Search size={16} />
                  <input
                    value={form.uhid}
                    onChange={(e) => update('uhid', e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                    placeholder="Enter UHID (e.g. 16752)"
                  />
                </div>
              </label>

              <label className={styles.lookupField}>
                <span className={styles.lookupHeader}>
                  <span>Token Number</span>
                </span>
                <div className={styles.uhidSearch}>
                  <input
                    value={form.bookingId}
                    onChange={(e) => update('bookingId', e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                    placeholder="Enter Token Number"
                  />
                </div>
              </label>
            </div>

            <div className={patientFound ? styles.lookupSuccess : patientError ? styles.lookupError : styles.lookupHint}>
              {patientFound
                ? '✓ Patient details fetched successfully.'
                : patientError || 'Enter UHID or Token Number to auto-fetch patient record.'}
            </div>
          </div>

          <div className={styles.grid}>
            <Field label="Patient Name" required>
              <input
                value={form.patientName}
                onChange={(e) => update('patientName', e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))}
                placeholder="e.g. Mr Surendra Agrahari"
              />
            </Field>
            <Field label="Mobile Number">
              <input
                value={form.mobile}
                onChange={(e) => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 digit mobile number"
              />
            </Field>
            <Field label="Father / Husband Name">
              <input
                value={form.fatherName}
                onChange={(e) => update('fatherName', e.target.value.replace(/[^a-zA-Z\s\.\-]/g, ''))}
                placeholder="Father's / Husband's Name"
              />
            </Field>
            <Field label="Address">
              <input
                value={form.address}
                onChange={(e) => update('address', e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/#]/g, ''))}
                placeholder="Patient Address"
              />
            </Field>
            <Field label="Age">
              <input
                value={form.age}
                onChange={(e) => update('age', e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="Age in years (e.g. 35)"
              />
            </Field>
            <Field label="Sex">
              <select value={form.sex} onChange={(e) => update('sex', e.target.value)}>
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Marital Status">
              <select value={form.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)}>
                <option value="">Select</option>
                <option value="Married">Married</option>
                <option value="Unmarried">Unmarried</option>
              </select>
            </Field>
            <Field label="UHID Number" required>
              <input
                value={form.uhid}
                onChange={(e) => update('uhid', e.target.value.replace(/[^a-zA-Z0-9\-\/]/g, ''))}
                placeholder="UHID Number"
              />
            </Field>
            <Field label="Date" required>
              <input
                type="date"
                value={toInputDate(form.date)}
                onChange={(e) => update('date', formatDate(e.target.value))}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={toInputTime(form.time)}
                onChange={(e) => update('time', formatTimeTo12Hour(e.target.value))}
              />
            </Field>
          </div>

          <div className={styles.doctors}>
            <div className={styles.subHeading}>
              <div>
                <b>Doctor / Consultant</b>
                <span>Add one or more consultants who signed the prescription.</span>
              </div>
              <div className={styles.medicineSectionActions}>
                <button
                  type="button"
                  className={styles.manageMedicine}
                  onClick={openAddDoctorManager}
                >
                  <PencilIcon size={13} />
                  Manage Doctors
                </button>
                <button type="button" className={styles.add} onClick={addDoctor}>
                  <Plus size={14} /> Add Doctor
                </button>
              </div>
            </div>

            {form.doctors.map((doctor, index) => (
              <div className={styles.doctor} key={index}>
                <span className={styles.doctorNo}>{String(index + 1).padStart(2, '0')}</span>
                <select
                  value={doctor}
                  onChange={(e) => updateDoctor(index, e.target.value)}
                  aria-label={`Doctor ${index + 1}`}
                >
                  <option value="">Select Doctor</option>
                  {doctorCatalog
                    .filter((doctorItem) => doctorItem?.is_active !== false)
                    .map((doctorItem) => (
                      <option key={doctorItem.id || doctorItem.name} value={doctorItem.name}>
                        {doctorItem.name}{doctorItem.qualification ? ` — ${doctorItem.qualification}` : ''}
                      </option>
                    ))}
                </select>
                {form.doctors.length > 1 && (
                  <button onClick={() => removeDoctor(index)} title="Remove doctor">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionIcon}>Rx</div>
            <div>
              <h2>Medicines</h2>
              <span>Select a medicine from the dropdown. Dose, frequency and period are auto-filled.</span>
            </div>

            <div className={styles.medicineSectionActions}>
              <span className={styles.medicineCount}>{filledMedicines} added</span>
              <button
                type="button"
                className={styles.manageMedicine}
                onClick={openAddMedicineManager}
              >
                <PencilIcon size={13} />
                Manage Medicines
              </button>
            </div>
          </div>

          <div className={styles.medicineWrap}>
            <table className={styles.medicine}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine / Drug</th>
                  <th>Dose</th>
                  <th>Frequency</th>
                  <th>Period</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.medicines.map((medicine, index) => {
                  const selectedMaster = medicineCatalog.find(
                    (item) => item.name === medicine.name
                  )

                  return (
                    <tr key={index}>
                      <td>{String(index + 1).padStart(2, '0')}</td>
                      <td>
                        <select
                          className={styles.medicineSelect}
                          value={selectedMaster?.id || ''}
                          onChange={(e) => selectMedicine(index, e.target.value)}
                          aria-label={`Medicine ${index + 1}`}
                        >
                          <option value="">Select Medicine</option>
                          {medicineCatalog.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className={styles.medicineSelect}
                          value={medicine.dose}
                          onChange={(e) => updateMedicine(index, 'dose', e.target.value)}
                          aria-label={`Dose ${index + 1}`}
                        >
                          <option value="">Select Dose</option>
                          {medicine.dose && !DOSE_OPTIONS.includes(medicine.dose) && (
                            <option value={medicine.dose}>{medicine.dose}</option>
                          )}
                          {DOSE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className={styles.medicineSelect}
                          value={medicine.frequency}
                          onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                          aria-label={`Frequency ${index + 1}`}
                        >
                          <option value="">Select Frequency</option>
                          {medicine.frequency && !FREQUENCY_OPTIONS.includes(medicine.frequency) && (
                            <option value={medicine.frequency}>{medicine.frequency}</option>
                          )}
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className={styles.medicineSelect}
                          value={medicine.period}
                          onChange={(e) => updateMedicine(index, 'period', e.target.value)}
                          aria-label={`Period ${index + 1}`}
                        >
                          <option value="">Select Period</option>
                          {medicine.period && !PERIOD_OPTIONS.includes(medicine.period) && (
                            <option value={medicine.period}>{medicine.period}</option>
                          )}
                          {PERIOD_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeMedicine(index)}
                          title="Remove medicine from this prescription"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button type="button" className={styles.addMedicine} onClick={addMedicine}>
            <Plus size={16} /> Add Medicine Row
          </button>

          {medicineManagerOpen && (
            <div
              className={styles.medicineManagerBackdrop}
              onClick={() => setMedicineManagerOpen(false)}
            >
              <div
                className={styles.medicineManager}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.medicineManagerHeader}>
                  <div>
                    <span>MEDICINE MASTER</span>
                    <h3>{medicineEditingId ? 'Edit Medicine' : 'Add Medicine'}</h3>
                    <p>Manage medicines available in the prescription dropdown.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.managerClose}
                    onClick={() => setMedicineManagerOpen(false)}
                    title="Close"
                  >
                    <XIcon size={18} />
                  </button>
                </div>

                <div className={styles.medicineManagerBody}>
                  <div className={styles.medicineMasterForm}>
                    <Field label="Medicine Name" required>
                      <input
                        value={medicineDraft.name}
                        onChange={(e) =>
                          setMedicineDraft((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="e.g. PAN 40 MG TAB"
                        autoFocus
                      />
                    </Field>

                    <Field label="Default Dose">
                      <select
                        value={medicineDraft.dose}
                        onChange={(e) =>
                          setMedicineDraft((prev) => ({ ...prev, dose: e.target.value }))
                        }
                      >
                        <option value="">Select Dose</option>
                        {medicineDraft.dose && !DOSE_OPTIONS.includes(medicineDraft.dose) && (
                          <option value={medicineDraft.dose}>{medicineDraft.dose}</option>
                        )}
                        {DOSE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Default Frequency">
                      <select
                        value={medicineDraft.frequency}
                        onChange={(e) =>
                          setMedicineDraft((prev) => ({ ...prev, frequency: e.target.value }))
                        }
                      >
                        <option value="">Select Frequency</option>
                        {medicineDraft.frequency && !FREQUENCY_OPTIONS.includes(medicineDraft.frequency) && (
                          <option value={medicineDraft.frequency}>{medicineDraft.frequency}</option>
                        )}
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Default Period">
                      <select
                        value={medicineDraft.period}
                        onChange={(e) =>
                          setMedicineDraft((prev) => ({ ...prev, period: e.target.value }))
                        }
                      >
                        <option value="">Select Period</option>
                        {medicineDraft.period && !PERIOD_OPTIONS.includes(medicineDraft.period) && (
                          <option value={medicineDraft.period}>{medicineDraft.period}</option>
                        )}
                        {PERIOD_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className={styles.managerActions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => {
                        setMedicineEditingId(null)
                        setMedicineDraft({ name: '', dose: '', frequency: '', period: '' })
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={saveMedicineMaster}
                    >
                      <Save size={15} />
                      {medicineEditingId ? 'Update Medicine' : 'Add Medicine'}
                    </button>
                  </div>

                  <div className={styles.medicineMasterList}>
                    <div className={styles.masterListTitle}>
                      <b>Available Medicines</b>
                      <span>{medicineCatalog.length} medicines</span>
                    </div>

                    {medicineCatalog.map((medicine) => (
                      <div className={styles.masterMedicineRow} key={medicine.id}>
                        <div className={styles.masterMedicineInfo}>
                          <b>{medicine.name}</b>
                          <span>
                            {medicine.dose || 'No default dose'} •{' '}
                            {medicine.frequency || 'No default frequency'} •{' '}
                            {medicine.period || 'No default period'}
                          </span>
                        </div>
                        <div className={styles.masterMedicineActions}>
                          <button
                            type="button"
                            onClick={() => openEditMedicine(medicine)}
                            title="Edit medicine"
                          >
                            <PencilIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMedicineMaster(medicine.id)}
                            title="Delete medicine"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {doctorManagerOpen && (
            <div
              className={styles.medicineManagerBackdrop}
              role="dialog"
              aria-modal="true"
              onClick={() => setDoctorManagerOpen(false)}
            >
              <div
                className={styles.medicineManager}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.medicineManagerHeader}>
                  <div>
                    <span>DOCTOR CATALOG</span>
                    <h3>{doctorEditingId ? 'Edit Doctor' : 'Manage Doctors'}</h3>
                    <p>Add new doctors, edit details or remove doctors from the prescription list.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.managerClose}
                    onClick={() => setDoctorManagerOpen(false)}
                    title="Close"
                  >
                    <XIcon size={16} />
                  </button>
                </div>

                <div className={styles.medicineManagerBody}>
                  <div className={styles.medicineMasterForm}>
                    <Field label="Doctor Name" required>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Ramesh Gupta"
                        value={doctorDraft.name}
                        onChange={(e) =>
                          setDoctorDraft((prev) => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z\s\.\-]/g, '') }))
                        }
                      />
                    </Field>

                    <Field label="Qualification">
                      <input
                        type="text"
                        placeholder="e.g. MBBS, MS (General Surgery)"
                        value={doctorDraft.qualification}
                        onChange={(e) =>
                          setDoctorDraft((prev) => ({ ...prev, qualification: e.target.value.replace(/[^a-zA-Z0-9\s,.\(\)\-\/&]/g, '') }))
                        }
                      />
                    </Field>

                    <Field label="Role / Specialization">
                      <input
                        type="text"
                        placeholder="e.g. Laparoscopic Surgeon"
                        value={doctorDraft.role}
                        onChange={(e) =>
                          setDoctorDraft((prev) => ({ ...prev, role: e.target.value.replace(/[^a-zA-Z0-9\s,.\(\)\-\/&]/g, '') }))
                        }
                      />
                    </Field>

                    <Field label="Department">
                      <input
                        type="text"
                        placeholder="e.g. General Surgery"
                        value={doctorDraft.department}
                        onChange={(e) =>
                          setDoctorDraft((prev) => ({ ...prev, department: e.target.value.replace(/[^a-zA-Z0-9\s,.\(\)\-\/&]/g, '') }))
                        }
                      />
                    </Field>
                  </div>

                  <div className={styles.managerActions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => {
                        setDoctorEditingId(null)
                        setDoctorDraft({ name: '', qualification: '', role: '', department: '' })
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={saveDoctorMaster}
                    >
                      <Save size={15} />
                      {doctorEditingId ? 'Update Doctor' : 'Add Doctor'}
                    </button>
                  </div>

                  <div className={styles.medicineMasterList}>
                    <div className={styles.masterListTitle}>
                      <b>Available Doctors</b>
                      <span>{doctorCatalog.length} doctors</span>
                    </div>

                    {doctorCatalog.map((doc) => (
                      <div className={styles.masterMedicineRow} key={doc.id || doc.name}>
                        <div className={styles.masterMedicineInfo}>
                          <b>{doc.name}</b>
                          <span>
                            {doc.qualification || 'No qualification specified'}
                            {doc.role ? ` • ${doc.role}` : ''}
                            {doc.department ? ` • ${doc.department}` : ''}
                          </span>
                        </div>
                        <div className={styles.masterMedicineActions}>
                          <button
                            type="button"
                            onClick={() => openEditDoctor(doc)}
                            title="Edit doctor"
                          >
                            <PencilIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDoctorMaster(doc.id || doc.name)}
                            title="Delete doctor"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.bottom}>
            <Field label="Investigation">
              <textarea rows="3" value={form.investigation} onChange={(e) => update('investigation', e.target.value)} placeholder="Investigation / test instructions" />
            </Field>
            <Field label="Advice / Notes">
              <textarea rows="3" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </Field>
          </div>

          <div className={styles.formFooter}>
            <button type="button" className={styles.secondary} onClick={save}>
              <Save size={16} />
              Save Draft
            </button>
            <button type="button" className={styles.primary} onClick={saveAndPrint}>
              <Printer size={17} />
              Save & Print A4
            </button>
          </div>
        </div>
      </section>

      <PrescriptionPrintDocument data={form} />
    </>
  )
}

function Section({ icon, title, sub }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionIcon}>{icon}</div>
      <div>
        <h2>{title}</h2>
        <span>{sub}</span>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className={styles.field}>
      <span>{label}{required && <b>*</b>}</span>
      {children}
    </label>
  )
}

export function PrescriptionPrintDocument({ data }) {
  if (!data) return null

  const doctors = (data.doctors || []).filter(Boolean)
  const medicines = (data.medicines || []).filter(
    (medicine) =>
      medicine.name?.trim() ||
      medicine.dose?.trim() ||
      medicine.frequency?.trim() ||
      medicine.period?.trim()
  )

  return (
    <article className={`${styles.printDocument} printDocument`}>
      <header className={styles.printHeader}>
        <div className={styles.printLogo}>
          <img src="/image/image.png" alt="KG Nanda Hospital Logo" className={styles.printLogoImg} />
          <div className={styles.printLogoBrand}>
            <strong className={styles.printLogoName}>K.G. Nanda Hospital</strong>
            <span className={styles.printLogoSub}>......Because we care</span>
          </div>
        </div>

        <div className={styles.printHospital}>
          <h1>K.G. NANDA HOSPITAL</h1>
          <div>WARD NO.-11 SANJAY NAGAR G.T. ROAD CHANDAULI</div>
        </div>

        <div className={styles.printHeaderSpacer} />
      </header>

      <div className={styles.printTitleBox}>
        <span className={styles.printTitle}>PRESCREPTION</span>
      </div>

      <table className={styles.printInfo}>
        <tbody>
          <tr>
            <td style={{ width: '45%', verticalAlign: 'top', padding: '2mm 3.5mm' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', width: '38%', whiteSpace: 'nowrap' }}><b>Patient's Name :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.patientName || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Age :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.age ? `${data.age}y` : ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Sex :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.sex || ''}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ width: '55%', verticalAlign: 'top', padding: '2mm 3.5mm' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', width: '46%', whiteSpace: 'nowrap' }}><b>Mobile No.</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.mobile || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Father's/Husband's Name :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.fatherName || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Address :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.address || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Marital Status :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.maritalStatus || ''}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className={styles.printVisit}>
        <tbody>
          <tr>
            <td style={{ width: '45%', verticalAlign: 'top', padding: '2mm 3.5mm' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', width: '38%', whiteSpace: 'nowrap' }}><b>UHID No :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.uhid || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Date :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.date || ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Time :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{data.time || ''}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ width: '55%', verticalAlign: 'top', padding: '2mm 3.5mm' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', width: '20%', whiteSpace: 'nowrap' }}><b>Doctor :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{doctors[0] ? formatDoctorName(doctors[0]).toUpperCase() : ''}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.8mm 0', border: 'none', whiteSpace: 'nowrap' }}><b>Doctor :</b></td>
                    <td style={{ padding: '0.8mm 0 0.8mm 2mm', border: 'none' }}>{doctors[1] ? formatDoctorName(doctors[1]).toUpperCase() : ''}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div className={styles.printInvestigationSection}>
        <div className={styles.printInvestigationText}>
          <b>Investigation</b> {data.investigation || ''}
        </div>
        <div className={styles.printInvestigationLine} />
      </div>

      <div className={styles.printRx}>Rx</div>

      <table className={styles.printMedicine}>
        <thead>
          <tr>
            <th style={{ width: '6%', textAlign: 'center' }}>Sr</th>
            <th style={{ width: '36%' }}>Drugs</th>
            <th style={{ width: '13%' }}>Dose</th>
            <th style={{ width: '31%' }}>Frequency</th>
            <th style={{ width: '14%' }}>Period</th>
          </tr>
        </thead>
        <tbody>
          {medicines.length > 0 ? (
            medicines.map((med, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                <td style={{ fontWeight: '600' }}>{med.name ? String(med.name).toUpperCase() : ''}</td>
                <td>{med.dose ? String(med.dose).toUpperCase() : ''}</td>
                <td>
                  {med.frequency
                    ? (med.frequency.includes('--')
                        ? med.frequency
                        : `${med.frequency} --`)
                    : ''}
                </td>
                <td style={{ fontWeight: '600' }}>{med.period ? String(med.period).toUpperCase() : ''}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={{ textAlign: 'center' }}>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className={styles.printNote}>
        <b>NOTE :- </b>
        {data.notes || 'मरीज को चावल, दूध, दही,फल ज्यादा मसालेदार भोजन व वजनी सामान उठाना और सीढ़ी चढ़ना मना है'}
      </div>

      <div className={styles.printSignature}>Authorised Signatory</div>

      <footer className={styles.printFooter}>
        FOR ENQUIRY PLSEASE CONTACT -.-9838850287 : 6394817132 :7275470447 8840376333
      </footer>
    </article>
  )
}
