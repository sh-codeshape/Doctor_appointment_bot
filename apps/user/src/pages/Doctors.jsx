import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Edit3, Trash2, Stethoscope, Phone, Mail, Camera, UploadCloud, User, IndianRupee, Check,
  Award, Briefcase, Sparkles, Clock, Users, MapPin, ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { doctorService } from '../services/doctorService'
import { formatCurrency, getInitials } from '../utils/formatters'
import { SPECIALIZATIONS, DEGREE_OPTIONS } from '../utils/constants'
import Button from '../components/common/Button'
import PageHeader from '../components/common/PageHeader'
import Modal from '../components/common/Modal'
import { Loader } from '../components/common/Loader'
import styles from './Doctors.module.css'

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #0284c7, #0369a1)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #f97316, #c2410c)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #06b6d4, #0e7490)',
]

const emptyForm = {
  name: '',
  nameHindi: '',
  role: '',
  qualification: '',
  qualificationHindi: '',
  customQualification: '',
  specialization: '',
  specializationHindi: '',
  specialty: '',
  experience: '',
  consultation_fee: '',
  old_patient_fee: '',
  emergency_fee: '',
  gender: '',
  phone: '',
  email: '',
  displaySchedule: '',
  maxNewPatients: 40,
  maxOldPatients: 30,
  address: '',
  avatar: '',
}

export default function Doctors() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors,
  })

  const createMutation = useMutation({
    mutationFn: doctorService.createDoctor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor added successfully!')
      closeForm()
    },
    onError: () => toast.error('Failed to add doctor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => doctorService.updateDoctor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor profile updated!')
      closeForm()
    },
    onError: () => toast.error('Failed to update doctor'),
  })

  const deleteMutation = useMutation({
    mutationFn: doctorService.deleteDoctor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor deleted')
    },
    onError: () => toast.error('Failed to delete doctor'),
  })

  const toggleMutation = useMutation({
    mutationFn: doctorService.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })

  const openAdd = () => {
    setEditingDoctor(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (doctor) => {
    setEditingDoctor(doctor)
    const existingQual = doctor.qualification || doctor.qualifications || ''
    const isStandardDegree = DEGREE_OPTIONS.includes(existingQual)

    setForm({
      name: doctor.name || '',
      nameHindi: doctor.nameHindi || '',
      role: doctor.role || '',
      qualification: isStandardDegree ? existingQual : (existingQual ? 'Other / Custom...' : ''),
      qualificationHindi: doctor.qualificationHindi || '',
      customQualification: isStandardDegree ? '' : existingQual,
      specialization: doctor.specialization || doctor.department || '',
      specializationHindi: doctor.specializationHindi || '',
      specialty: doctor.specialty || doctor.AOF || '',
      experience: doctor.experience || '',
      consultation_fee: doctor.consultation_fee ?? doctor.consultationFee ?? '',
      old_patient_fee: doctor.old_patient_fee ?? doctor.oldPatientFee ?? '',
      emergency_fee: doctor.emergency_fee ?? doctor.emergencyFee ?? '',
      gender: doctor.gender || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      displaySchedule: doctor.displaySchedule || '',
      maxNewPatients: doctor.maxNewPatients ?? 40,
      maxOldPatients: doctor.maxOldPatients ?? 30,
      address: doctor.address || '',
      avatar: doctor.avatar || doctor.image || '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingDoctor(null)
    setForm(emptyForm)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, avatar: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, avatar: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const finalQualification =
      form.qualification === 'Other / Custom...'
        ? form.customQualification
        : form.qualification

    const data = {
      name: form.name,
      nameHindi: form.nameHindi,
      role: form.role,
      qualification: finalQualification,
      qualificationHindi: form.qualificationHindi,
      department: form.specialization,
      specialization: form.specialization,
      specializationHindi: form.specializationHindi,
      specialty: form.specialty,
      experience: form.experience,
      consultation_fee: Number(form.consultation_fee || 0),
      old_patient_fee: Number(form.old_patient_fee || 0),
      emergency_fee: Number(form.emergency_fee || 0),
      gender: form.gender || undefined,
      phone: form.phone,
      email: form.email,
      displaySchedule: form.displaySchedule,
      maxNewPatients: Number(form.maxNewPatients || 40),
      maxOldPatients: Number(form.maxOldPatients || 30),
      address: form.address,
      avatar: form.avatar,
    }

    if (editingDoctor) {
      const targetId = editingDoctor.id || editingDoctor._id
      updateMutation.mutate({ id: targetId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this doctor profile?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return <Loader />

  return (
    <div className={styles.page}>
      <PageHeader
        title="Doctors"
        subtitle={`${doctors?.length || 0} doctors registered · toggle availability or manage doctor cards`}
        icon={Stethoscope}
        actions={<Button icon={Plus} onClick={openAdd}>Add Doctor</Button>}
      />

      <div className={styles.grid}>
        {doctors?.map((doctor, i) => {
          return (
            <div
              key={doctor.id}
              className={styles.doctorCard}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              {/* Card Top Bar: Gender & Active Switch */}
              <div className={styles.cardTopRow}>
                {doctor.gender ? (
                  <span className={styles.genderBadge}>
                    {doctor.gender.toUpperCase()}
                  </span>
                ) : <div />}
                <div className={styles.statusToggle}>
                  <button
                    type="button"
                    className={`${styles.toggle} ${doctor.is_active ? styles.active : ''}`}
                    onClick={() => toggleMutation.mutate(doctor.id)}
                    title={doctor.is_active ? 'Online / Available' : 'Offline / Inactive'}
                    aria-label="Toggle active status"
                  />
                </div>
              </div>

              {/* Centered Doctor Profile Info */}
              <div className={styles.profileSection}>
                <div className={styles.avatarWrapper}>
                  {doctor.avatar ? (
                    <img
                      src={doctor.avatar}
                      alt={doctor.name}
                      className={styles.doctorAvatarImg}
                    />
                  ) : (
                    <div
                      className={styles.doctorAvatar}
                      style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}
                    >
                      {getInitials(doctor.name)}
                    </div>
                  )}
                </div>

                <div className={styles.nameHeader}>
                  <h3 className={styles.doctorName}>{doctor.name}</h3>
                  {doctor.qualification && (
                    <span className={styles.degreeBadge}>{doctor.qualification}</span>
                  )}
                </div>

                {doctor.role && <p className={styles.doctorRole}>{doctor.role}</p>}

                <div className={styles.specBadgeWrapper}>
                  <span className={styles.specBadge}>{doctor.specialization || doctor.department || 'General'}</span>
                </div>

                {doctor.specialty && (
                  <div className={styles.focusAreaWrapper}>
                    <Sparkles size={12} className={styles.focusIcon} />
                    <span className={styles.focusText} title={doctor.specialty}>{doctor.specialty}</span>
                  </div>
                )}
              </div>

              {/* Doctor Metadata Grid */}
              <div className={styles.doctorMeta}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>New Pt Fee</span>
                  <span className={styles.metaValue}>{formatCurrency(doctor.consultation_fee)}</span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Old Pt Fee</span>
                  <span className={styles.metaValue}>{formatCurrency(doctor.old_patient_fee || doctor.consultation_fee)}</span>
                </div>

                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Emergency Fee</span>
                  <span className={styles.metaValue}>{formatCurrency(doctor.emergency_fee || doctor.consultation_fee)}</span>
                </div>

                {doctor.experience && doctor.experience !== '0' && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Experience</span>
                    <span className={styles.metaValue}>{doctor.experience}</span>
                  </div>
                )}

                {doctor.displaySchedule && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Schedule</span>
                    <span className={styles.metaValue}>{doctor.displaySchedule}</span>
                  </div>
                )}

                {(doctor.maxNewPatients || doctor.maxOldPatients) && (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Max New / Old</span>
                    <span className={styles.metaValue}>{doctor.maxNewPatients ?? 40} / {doctor.maxOldPatients ?? 30} per day</span>
                  </div>
                )}

                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Status</span>
                  <span
                    className={`${styles.statusPill} ${
                      doctor.is_active ? styles.statusActive : styles.statusInactive
                    }`}
                  >
                    <span className={styles.statusDot} />
                    {doctor.is_active ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.doctorActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => openEdit(doctor)}
                  title="Edit profile"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(doctor.id)}
                  title="Delete doctor"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add/Edit Modal ── */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
        footer={
          <>
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              icon={Check}
              onClick={handleSubmit}
              disabled={!form.name || !form.specialization || !form.consultation_fee}
            >
              {editingDoctor ? 'Update Profile' : 'Add Doctor'}
            </Button>
          </>
        }
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Photo Upload Hero Card */}
          <div className={styles.imageUploadCard}>
            <div className={styles.avatarPickerWrapper}>
              <div className={styles.imagePreviewCircle}>
                {form.avatar ? (
                  <img src={form.avatar} alt="Doctor Preview" className={styles.previewImg} />
                ) : (
                  <div className={styles.previewPlaceholder}>
                    <Camera size={26} className={styles.cameraIcon} />
                  </div>
                )}
              </div>
              <label
                htmlFor="doctor-avatar-upload"
                className={styles.avatarCameraBadge}
                title="Upload photo"
              >
                <Camera size={13} />
              </label>
            </div>

            <div className={styles.uploadInfoContent}>
              <div className={styles.uploadTitleRow}>
                <span className={styles.uploadMainTitle}>Doctor Profile Photo</span>
                <span className={styles.uploadHint}>JPG, PNG or WEBP (Max 2MB)</span>
              </div>
              <div className={styles.uploadActionButtons}>
                <label className={styles.uploadBtnLabel} htmlFor="doctor-avatar-upload">
                  <UploadCloud size={14} />
                  <span>{form.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                  <input
                    id="doctor-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.hiddenFileInput}
                  />
                </label>
                {form.avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className={styles.removePhotoBtn}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name & Full Name (Hindi) */}
          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Full Name <span className={styles.reqStar}>*</span>
              </label>
              <div className={styles.inputWithIcon}>
                <User size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Anand Prakash Tiwari"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Full Name (Hindi / हिंदी नाम)
              </label>
              <div className={styles.inputWithIcon}>
                <User size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.nameHindi}
                  onChange={(e) => setForm({ ...form, nameHindi: e.target.value })}
                  placeholder="उदा. आनंद प्रकाश तिवारी"
                />
              </div>
            </div>
          </div>

          {/* Degree / Qualification & Qualification (Hindi) */}
          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Degree / Qualification
              </label>
              <div className={styles.inputWithIcon}>
                <Award size={16} className={styles.inputLeadingIcon} />
                <select
                  className={`${styles.formInput} ${styles.formSelect}`}
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                >
                  <option value="">Select degree qualification</option>
                  {DEGREE_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Qualification (Hindi / हिंदी)
              </label>
              <div className={styles.inputWithIcon}>
                <Award size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.qualificationHindi}
                  onChange={(e) => setForm({ ...form, qualificationHindi: e.target.value })}
                  placeholder="उदा. लेप्रोस्कोपिक सर्जन, एम.डी"
                />
              </div>
            </div>
          </div>

          {/* Custom Degree entry if 'Other / Custom...' selected */}
          {form.qualification === 'Other / Custom...' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Specify Custom Degree</label>
              <div className={styles.inputWithIcon}>
                <Award size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.customQualification}
                  onChange={(e) => setForm({ ...form, customQualification: e.target.value })}
                  placeholder="e.g. M.S. (Obs & Gynae), Fellowship in Laparoscopy"
                />
              </div>
            </div>
          )}

          {/* Role / Designation & Specialization */}
          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Role / Designation</label>
              <div className={styles.inputWithIcon}>
                <Briefcase size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Senior Gynaecologist & Infertility Specialist"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Specialization / Dept <span className={styles.reqStar}>*</span>
              </label>
              <div className={styles.inputWithIcon}>
                <Stethoscope size={16} className={styles.inputLeadingIcon} />
                <select
                  className={`${styles.formInput} ${styles.formSelect}`}
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  required
                >
                  <option value="">Select department / specialization</option>
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Area of Focus (Specialty) & Experience */}
          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Area of Focus / Clinical Specialty</label>
              <div className={styles.inputWithIcon}>
                <Sparkles size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="e.g. High-Risk Pregnancy, Infertility, Laparoscopy"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Experience</label>
              <div className={styles.inputWithIcon}>
                <Award size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                  placeholder="e.g. 15+ Years"
                />
              </div>
            </div>
          </div>

          {/* Fee Tier Row: Consultation Fee, Old Patient Fee, Emergency Fee & Max Patients */}
          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                New Pt Consultation Fee (₹) <span className={styles.reqStar}>*</span>
              </label>
              <div className={styles.inputWithIcon}>
                <IndianRupee size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  type="number"
                  value={form.consultation_fee}
                  onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })}
                  placeholder="500"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Old Patient Fee (₹)
              </label>
              <div className={styles.inputWithIcon}>
                <IndianRupee size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  type="number"
                  value={form.old_patient_fee}
                  onChange={(e) => setForm({ ...form, old_patient_fee: e.target.value })}
                  placeholder="e.g. 300"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Emergency Fee (₹)
              </label>
              <div className={styles.inputWithIcon}>
                <IndianRupee size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  type="number"
                  value={form.emergency_fee}
                  onChange={(e) => setForm({ ...form, emergency_fee: e.target.value })}
                  placeholder="e.g. 800"
                  min="0"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Max New Patients/Day</label>
              <div className={styles.inputWithIcon}>
                <Users size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  type="number"
                  value={form.maxNewPatients}
                  onChange={(e) => setForm({ ...form, maxNewPatients: e.target.value })}
                  placeholder="40"
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Max Old Patients/Day</label>
              <div className={styles.inputWithIcon}>
                <Users size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  type="number"
                  value={form.maxOldPatients}
                  onChange={(e) => setForm({ ...form, maxOldPatients: e.target.value })}
                  placeholder="30"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Gender & OPD Schedule */}
          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Gender</label>
              <div className={styles.inputWithIcon}>
                <ShieldCheck size={16} className={styles.inputLeadingIcon} />
                <select
                  className={`${styles.formInput} ${styles.formSelect}`}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>OPD Schedule</label>
              <div className={styles.inputWithIcon}>
                <Clock size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.displaySchedule}
                  onChange={(e) => setForm({ ...form, displaySchedule: e.target.value })}
                  placeholder="e.g. Mon-Sat 10:00 AM - 04:00 PM"
                />
              </div>
            </div>
          </div>

          {/* Phone & Email */}
          <div className={styles.formRowTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number</label>
              <div className={styles.inputWithIcon}>
                <Phone size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 00001"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address</label>
              <div className={styles.inputWithIcon}>
                <Mail size={16} className={styles.inputLeadingIcon} />
                <input
                  className={styles.formInput}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="doctor@kgnanda.com"
                />
              </div>
            </div>
          </div>

          {/* OPD Room / Address */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>OPD Room / Location Address</label>
            <div className={styles.inputWithIcon}>
              <MapPin size={16} className={styles.inputLeadingIcon} />
              <input
                className={styles.formInput}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. OPD Room 102, Ground Floor, KG Nanda Hospital"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

