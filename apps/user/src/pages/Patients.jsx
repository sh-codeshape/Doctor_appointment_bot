import { useState, useRef, useCallback } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
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
  const limit = 30

  const debouncedSearch = useDebounce(search, 400)

  const { 
    data: patientsData, 
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['patients', debouncedSearch, filterTab, sortBy, sortOrder, limit],
    queryFn: ({ pageParam = 1 }) => {
      const isOld = filterTab === 'old' ? 'true' : filterTab === 'new' ? 'false' : ''
      return patientService.getPatients(debouncedSearch, isOld, sortBy, sortOrder, pageParam, limit)
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1
      return undefined
    }
  })

  const { data: patientDetail } = useQuery({
    queryKey: ['patient', selectedPatient?.id],
    queryFn: () => patientService.getPatient(selectedPatient.id),
    enabled: !!selectedPatient,
  })

  const paginatedPatients = patientsData?.pages?.flatMap(page => page.data) || []
  const total = patientsData?.pages?.[0]?.total || 0

  const observer = useRef()
  const lastElementRef = useCallback((node) => {
    if (isLoading || isFetchingNextPage) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage()
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage])

  const columns = ['Patient', 'Type / Status', 'Mobile', 'Total Bookings', 'Last Visit', 'Action']

  const renderRow = (patient, index) => {
    const isLastElement = index === paginatedPatients.length - 1;
    return (
      <tr key={patient.id} ref={isLastElement ? lastElementRef : null}>
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
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Patients"
        subtitle={`Everyone registered via WhatsApp or front desk (${total} total)`}
        icon={Users}
      />
      <div className={styles.filterContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${filterTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All Patients
          </button>
          <button
            className={`${styles.tab} ${filterTab === 'old' ? styles.activeTab : ''}`}
            onClick={() => setFilterTab('old')}
          >
            Old Patients (पुराना मरीज)
          </button>
          <button
            className={`${styles.tab} ${filterTab === 'new' ? styles.activeTab : ''}`}
            onClick={() => setFilterTab('new')}
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
              onChange={(e) => setSearch(e.target.value)}
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
          <>
            <Table
              columns={columns}
              data={paginatedPatients}
              renderRow={renderRow}
              emptyMessage="No patients found"
            />
            {isFetchingNextPage && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading more patients...</span>
              </div>
            )}
          </>
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
