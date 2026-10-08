import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus, Search, Pencil, Power, Eye, Calendar, Clock, Wallet, Shield, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import Table from '../components/common/Table'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import FormField from '../components/common/FormField'
import { Loader } from '../components/common/Loader'
import { staffService } from '../services/staffService'
import { doctorService } from '../services/doctorService'
import { useDebounce } from '../hooks/useDebounce'
import { formatCurrency, formatDate, formatExperience, calculateMonthlyActiveDays, getInitials } from '../utils/formatters'
import styles from './Staff.module.css'

const ROLES = ['receptionist', 'assistant_doctor', 'pharmacy', 'doctor', 'admin', 'superadmin']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY = {
  name: '', email: '', password: '', role: 'receptionist', doctorId: '',
  phone: '', salary: '', joiningDate: '', address: '', activeDays: DEFAULT_DAYS,
}

export default function Staff() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const debouncedSearch = useDebounce(search, 400)

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', roleFilter, debouncedSearch],
    queryFn: () => staffService.getStaff(roleFilter, debouncedSearch),
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] })

  const saveMutation = useMutation({
    mutationFn: () => (editing
      ? staffService.updateStaff(editing.id, form)
      : staffService.createStaff(form)),
    onSuccess: () => {
      invalidate()
      toast.success(editing ? 'Staff updated' : 'Staff created')
      setShowForm(false)
      setEditing(null)
      setForm(EMPTY)
    },
    onError: (err) => toast.error(err.message || 'Save failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => staffService.toggleActive(id),
    onSuccess: () => {
      invalidate()
      toast.success('Status updated')
    },
    onError: () => toast.error('Update failed'),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'receptionist',
      doctorId: user.doctorId || '',
      phone: user.phone || '',
      salary: user.salary ?? '',
      joiningDate: user.joiningDate ? String(user.joiningDate).slice(0, 10) : '',
      address: user.address || '',
      activeDays: Array.isArray(user.activeDays) && user.activeDays.length > 0 ? user.activeDays : DEFAULT_DAYS,
    })
    setShowForm(true)
  }

  const openView = (user) => {
    setViewingUser(user)
  }

  const set = (key) => (e) => {
    let value = e.target.value
    if (key === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10)
    }
    setForm((f) => ({ ...f, [key]: value }))
  }

  const toggleDay = (day) => {
    setForm((f) => {
      const current = f.activeDays || []
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day]
      return { ...f, activeDays: next }
    })
  }

  const copyCode = (code) => {
    if (navigator.clipboard && code) {
      navigator.clipboard.writeText(code)
      toast.success(`Copied staff code: ${code}`)
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!form.name.trim() || form.name.trim().length < 2) return toast.error('Name is required')
    if (!form.email.trim()) return toast.error('Email is required')
    if (!editing && (!form.password || form.password.length < 6)) return toast.error('Password (6+ chars) is required')
    if (form.phone.replace(/\D/g, '').length < 10) return toast.error('Valid 10-digit mobile number is required')
    if (form.salary === '' || Number(form.salary) < 0) return toast.error('Salary is required')
    if (form.role === 'doctor' && !form.doctorId) return toast.error('Please assign a doctor profile for doctor role')
    if (!form.activeDays || form.activeDays.length === 0) return toast.error('Select at least one active working day')
    saveMutation.mutate()
  }

  const columns = ['Staff Code', 'Name', 'Role', 'Active Days', 'Phone', 'Salary', 'Status', 'Actions']

  const renderRow = (u) => {
    const isInactive = u.is_active === false || u.isActive === false
    const days = Array.isArray(u.activeDays) && u.activeDays.length > 0 ? u.activeDays : DEFAULT_DAYS

    return (
      <tr key={u.id} style={{ opacity: isInactive ? 0.55 : 1 }}>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
          <span className={styles.code} onClick={() => copyCode(u.staffCode)} style={{ cursor: 'pointer' }} title="Click to copy">
            {u.staffCode || '—'}
          </span>
        </td>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
          <div style={{ fontWeight: 500 }}>{u.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
        </td>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', textTransform: 'capitalize' }}>
          {u.role}
        </td>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
          <div className={styles.daysList}>
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className={days.includes(d) ? styles.dayBadge : styles.dayBadgeInactive}
              >
                {d}
              </span>
            ))}
          </div>
        </td>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
          {u.phone || '—'}
        </td>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
          {u.salary ? formatCurrency(u.salary) : '—'}
        </td>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
          <span className={isInactive ? styles.inactive : styles.active}>
            {isInactive ? 'Inactive' : 'Active'}
          </span>
        </td>
        <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
          <div className={styles.rowActions}>
            <button className={styles.actionBtn} onClick={() => openView(u)} title="View Details">
              <Eye size={16} />
            </button>
            <button className={styles.actionBtn} onClick={() => openEdit(u)} title="Edit">
              <Pencil size={16} />
            </button>
            <button className={styles.actionBtn} onClick={() => toggleMutation.mutate(u.id)} title="Toggle active">
              <Power size={16} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Staff Management"
        subtitle="Receptionists, pharmacists, doctors and admins · active schedule & staff profiles"
        icon={ClipboardList}
        actions={<Button icon={Plus} onClick={openCreate}>Add Staff</Button>}
      />

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIconInline} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search name, email or staff code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <Card noPadding>
        {isLoading ? <Loader /> : (
          <Table columns={columns} data={staff || []} renderRow={renderRow} emptyMessage="No staff found" />
        )}
      </Card>

      {/* Premium Staff View Detail Modal */}
      <Modal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        title="Staff Profile & Experience"
        footer={<Button variant="secondary" onClick={() => setViewingUser(null)}>Close Profile</Button>}
      >
        {viewingUser && (() => {
          const isInactive = viewingUser.is_active === false || viewingUser.isActive === false
          const days = Array.isArray(viewingUser.activeDays) && viewingUser.activeDays.length > 0 ? viewingUser.activeDays : DEFAULT_DAYS
          const activeDaysCount = calculateMonthlyActiveDays(days)
          const weeklyCount = days.length
          const coveragePercent = Math.round((weeklyCount / 7) * 100)

          return (
            <div className={styles.profileModalContent}>
              {/* Hero Banner */}
              <div className={styles.heroBanner}>
                <div className={styles.heroAvatarWrapper}>
                  <div className={styles.heroAvatar}>{getInitials(viewingUser.name)}</div>
                  <span className={isInactive ? styles.statusDotInactive : styles.statusDotActive} title={isInactive ? 'Inactive' : 'Active'} />
                </div>

                <div className={styles.heroInfo}>
                  <div className={styles.heroTitleRow}>
                    <h3 className={styles.heroName}>{viewingUser.name}</h3>
                    <span className={`${styles.roleTag} ${styles[`role_${viewingUser.role}`]}`}>
                      {viewingUser.role}
                    </span>
                  </div>
                  <div className={styles.heroMetaRow}>
                    <span className={styles.heroCode} onClick={() => copyCode(viewingUser.staffCode)} title="Click to copy staff code">
                      {viewingUser.staffCode || 'No Code'}
                    </span>
                    <span className={styles.metaDot}>•</span>
                    <span className={styles.heroEmail}>{viewingUser.email}</span>
                  </div>
                </div>
              </div>

              {/* 3 Top Key Metric Cards */}
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiHeader}>
                    <Calendar className={styles.kpiIconGreen} size={18} />
                    <span className={styles.kpiLabel}>Total Active Days</span>
                  </div>
                  <div className={styles.kpiValue}>
                    {activeDaysCount} <span className={styles.kpiUnit}>days / mo</span>
                  </div>
                  <div className={styles.kpiProgressTrack}>
                    <div className={styles.kpiProgressBar} style={{ width: `${coveragePercent}%` }} />
                  </div>
                  <div className={styles.kpiSub}>{weeklyCount} of 7 days scheduled ({coveragePercent}% week)</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiHeader}>
                    <Clock className={styles.kpiIconBlue} size={18} />
                    <span className={styles.kpiLabel}>Tenure / Experience</span>
                  </div>
                  <div className={styles.kpiValue}>
                    {formatExperience(viewingUser.joiningDate)}
                  </div>
                  <div className={styles.kpiSub}>Joined: {formatDate(viewingUser.joiningDate)}</div>
                </div>

                <div className={styles.kpiCard}>
                  <div className={styles.kpiHeader}>
                    <Wallet className={styles.kpiIconGold} size={18} />
                    <span className={styles.kpiLabel}>Monthly Salary</span>
                  </div>
                  <div className={styles.kpiValue}>
                    {formatCurrency(viewingUser.salary)}
                  </div>
                  <div className={styles.kpiSub}>Annual: {formatCurrency((viewingUser.salary || 0) * 12)}</div>
                </div>
              </div>

              {/* Weekly Duty Schedule Heatmap */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle}>
                  <Shield size={16} color="var(--accent)" />
                  Weekly Duty Schedule
                </div>
                <div className={styles.weeklyDayGrid}>
                  {WEEKDAYS.map((day) => {
                    const isScheduled = days.includes(day)
                    return (
                      <div key={day} className={`${styles.scheduleDayBox} ${isScheduled ? styles.scheduleDayActive : styles.scheduleDayOff}`}>
                        <span className={styles.scheduleDayName}>{day}</span>
                        <span className={styles.scheduleStatusText}>{isScheduled ? 'On Duty' : 'Off'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Contact & Official Record Details */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionTitle}>
                  <Phone size={16} color="#58a6ff" />
                  Contact & Official Record
                </div>
                <div className={styles.detailsListGrid}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Mobile Phone:</span>
                    <span className={styles.detailVal}>{viewingUser.phone || '—'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Account Email:</span>
                    <span className={styles.detailVal}>{viewingUser.email}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Joining Date:</span>
                    <span className={styles.detailVal}>{formatDate(viewingUser.joiningDate)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Account Status:</span>
                    <span className={isInactive ? styles.inactive : styles.active}>
                      {isInactive ? '● Inactive (Disabled)' : '● Active Account'}
                    </span>
                  </div>
                  <div className={styles.detailRow} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>Residential Address:</span>
                    <span className={styles.detailVal}>{viewingUser.address || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Add/Edit Staff Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? `Edit ${editing.staffCode || 'Staff'}` : 'Add Staff'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {editing ? 'Save Changes' : 'Create Staff'}
            </Button>
          </>
        }
      >
        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.row}>
            <FormField label="Full Name" required>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Front Desk" />
            </FormField>
            <FormField label="Email (login)" required>
              <input type="email" value={form.email} onChange={set('email')} placeholder="name@kgnanda.com" disabled={!!editing} />
            </FormField>
          </div>
          {!editing && (
            <FormField label="Password" hint="6+ characters" required>
              <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
            </FormField>
          )}
          <div className={styles.row}>
            <FormField label="Role" required>
              <select value={form.role} onChange={set('role')}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="Phone" required>
              <input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" inputMode="tel" />
            </FormField>
          </div>

          <FormField label="Active Working Days" hint="Days when staff is scheduled on duty" required>
            <div className={styles.daySelector}>
              {WEEKDAYS.map((day) => {
                const selected = (form.activeDays || []).includes(day)
                return (
                  <button
                    type="button"
                    key={day}
                    className={`${styles.dayChip} ${selected ? styles.dayChipSelected : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </FormField>

          {form.role === 'doctor' && (
            <FormField label="Linked Doctor Profile" hint="Required for doctor role" required>
              <select value={form.doctorId} onChange={set('doctorId')}>
                <option value="">— Select doctor profile —</option>
                {doctors?.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialization})</option>
                ))}
              </select>
            </FormField>
          )}
          <div className={styles.row}>
            <FormField label="Salary (₹/month)" required>
              <input type="number" min="0" value={form.salary} onChange={set('salary')} placeholder="e.g. 18000" />
            </FormField>
            <FormField label="Joining Date">
              <input type="date" value={form.joiningDate} onChange={set('joiningDate')} />
            </FormField>
          </div>
          <FormField label="Address">
            <input value={form.address} onChange={set('address')} placeholder="Residential address" />
          </FormField>
          {editing?.staffCode && (
            <p className={styles.codeNote}>Staff code <strong>{editing.staffCode}</strong> • Joined {formatDate(editing.joiningDate)}</p>
          )}
        </form>
      </Modal>
    </div>
  )
}
