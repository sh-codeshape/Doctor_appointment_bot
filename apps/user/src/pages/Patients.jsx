import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Eye, Users, Filter } from 'lucide-react'
import { patientService } from '../services/patientService'
import { useDebounce } from '../hooks/useDebounce'
import { formatDate, formatPhone, getInitials } from '../utils/formatters'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import Table from '../components/common/Table'
import Modal from '../components/common/Modal'
import StatusBadge from '../components/common/StatusBadge'
import { Loader } from '../components/common/Loader'
import styles from './Patients.module.css'

export default function Patients() {
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'old' | 'new'
  const [sortBy, setSortBy] = useState('lastVisit')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [page, setPage] = useState(1)
  const limit = 10

  const debouncedSearch = useDebounce(search, 400)

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', debouncedSearch, filterTab, sortBy, sortOrder],
    queryFn: () => {
      const isOld = filterTab === 'old' ? 'true' : filterTab === 'new' ? 'false' : ''
      return patientService.getPatients(debouncedSearch, isOld, sortBy, sortOrder)
    },
  })

  const { data: patientDetail } = useQuery({
    queryKey: ['patient', selectedPatient?.id],
    queryFn: () => patientService.getPatient(selectedPatient.id),
    enabled: !!selectedPatient,
  })

  const allPatients = patients || []
  const total = allPatients.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const paginatedPatients = allPatients.slice((page - 1) * limit, page * limit)

  const pagination = {
    page,
    limit,
    total,
    totalPages,
    onPageChange: setPage,
  }

  const columns = ['Patient', 'Type / Status', 'Mobile', 'Total Bookings', 'Last Visit', 'Action']

  const renderRow = (patient) => (
    <tr key={patient.id}>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.patientRow}>
          <div className={styles.patientAvatar}>{getInitials(patient.name)}</div>
          <span className={styles.patientName}>{patient.name}</span>
        </div>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <span className={`${styles.typeBadge} ${patient.is_old ? styles.oldBadge : styles.newBadge}`}>
          {patient.is_old ? 'Old Patient' : 'New Patient'}
        </span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
        {formatPhone(patient.mobile)}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {patient.total_bookings}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '13px' }}>
        {formatDate(patient.last_visit)}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <button
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, color: 'var(--text-secondary)', transition: 'all 0.15s' }}
          onClick={() => setSelectedPatient(patient)}
          title="View History"
        >
          <Eye size={16} />
        </button>
      </td>
    </tr>
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="Patients"
        subtitle="Everyone registered via WhatsApp or front desk · filter and sort by New vs Old Patient status"
        icon={Users}
      />
      <div className={styles.filterContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${filterTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => { setFilterTab('all'); setPage(1); }}
          >
            All Patients
          </button>
          <button
            className={`${styles.tab} ${filterTab === 'old' ? styles.activeTab : ''}`}
            onClick={() => { setFilterTab('old'); setPage(1); }}
          >
            Old Patients (पुराना मरीज)
          </button>
          <button
            className={`${styles.tab} ${filterTab === 'new' ? styles.activeTab : ''}`}
            onClick={() => { setFilterTab('new'); setPage(1); }}
          >
            New Patients (नया मरीज)
          </button>
        </div>

        <div className={styles.controlsGroup}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search by name or mobile..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              id="patient-search"
            />
          </div>

          <div className={styles.sortWrapper}>
            <Filter size={15} className={styles.filterIcon} />
            <select
              className={styles.sortSelect}
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split(':')
                setSortBy(by)
                setSortOrder(order)
                setPage(1)
              }}
            >
              <option value="lastVisit:desc">Last Visit (Newest First)</option>
              <option value="lastVisit:asc">Last Visit (Oldest First)</option>
              <option value="name:asc">Name (A – Z)</option>
              <option value="name:desc">Name (Z – A)</option>
              <option value="isOld:desc">Old Patients First</option>
              <option value="isOld:asc">New Patients First</option>
            </select>
          </div>
        </div>
      </div>

      <Card noPadding>
        {isLoading ? <Loader /> : (
          <Table
            columns={columns}
            data={paginatedPatients}
            renderRow={renderRow}
            pagination={pagination}
            emptyMessage="No patients found"
          />
        )}
      </Card>

      <Modal
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title={`${selectedPatient?.name || ''} — Patient Profile & History`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Patient Card Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px 16px',
            padding: '16px',
            borderRadius: '8px',
            background: 'var(--bg-elevated, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-primary)'
          }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>UHID Number</span>
              <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{patientDetail?.uhid || selectedPatient?.uhid || '—'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Mobile</span>
              <strong style={{ fontSize: '14px' }}>{formatPhone(patientDetail?.mobile || selectedPatient?.mobile)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Age / Gender</span>
              <strong style={{ fontSize: '14px' }}>
                {(patientDetail?.age || selectedPatient?.age) ? `${patientDetail?.age || selectedPatient?.age} yrs` : '—'} / {(patientDetail?.gender || selectedPatient?.gender || '—')}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Patient Type</span>
              <span className={`${styles.typeBadge} ${(patientDetail?.is_old ?? selectedPatient?.is_old) ? styles.oldBadge : styles.newBadge}`}>
                {(patientDetail?.is_old ?? selectedPatient?.is_old) ? 'Old Patient' : 'New Patient'}
              </span>
            </div>
            {(patientDetail?.district || selectedPatient?.district) && (
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>District</span>
                <strong style={{ fontSize: '13px' }}>{patientDetail?.district || selectedPatient?.district}</strong>
              </div>
            )}
            {(patientDetail?.address || selectedPatient?.address) && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>Address</span>
                <strong style={{ fontSize: '13px', fontWeight: 500 }}>{patientDetail?.address || selectedPatient?.address}</strong>
              </div>
            )}
          </div>

          {/* Booking History Section */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Booking History ({patientDetail?.bookings?.length || 0})
            </h4>
            {patientDetail?.bookings?.length > 0 ? (
              <div className={styles.historyList}>
                {patientDetail.bookings.map((b) => (
                  <div key={b.id} className={styles.historyItem}>
                    <div>
                      <strong>{b.booking_id}</strong>
                      <div className={styles.historyMeta}>
                        {b.doctor_name} • {formatDate(b.date)} • {b.time_slot}
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>No booking history found</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
