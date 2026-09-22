import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Stethoscope, CheckCircle, CheckCheck, Pill, Printer, Calendar, Filter, ArrowUpDown } from 'lucide-react'
import { bookingService } from '../services/bookingService'
import { printService } from '../services/printService'
import { PrintSlipHandler } from '../services/PrintSlipHandler'
import { useAuth } from '../hooks/useAuth'
import { useDebounce } from '../hooks/useDebounce'
import { formatDate, formatPhone, getInitials } from '../utils/formatters'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import Table from '../components/common/Table'
import Modal from '../components/common/Modal'
import StatusBadge from '../components/common/StatusBadge'
import { Loader } from '../components/common/Loader'
import toast from 'react-hot-toast'
import styles from './MyPatients.module.css'

const getTodayStr = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Doctor's "My Patients" queue page with advanced filters (date picker,
 * status filter, name/UHID/token search, and sorting).
 * Clicking "Prescribe" opens the dedicated full-screen Prescription page.
 */
export default function MyPatients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  // Advanced Filters & Sort State
  const [fromDate, setFromDate] = useState(getTodayStr)
  const [toDate, setToDate] = useState(getTodayStr)
  const [statusFilter, setStatusFilter] = useState('')
  const [patientTypeFilter, setPatientTypeFilter] = useState('')
  const [limit, setLimit] = useState(30)
  
  const debouncedSearch = useDebounce(search, 400)

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['my-bookings', user?.doctorId, { page, limit, search: debouncedSearch, startDate: fromDate, endDate: toDate, status: statusFilter, isOld: patientTypeFilter }],
    queryFn: () => bookingService.getBookings({ 
      limit, 
      page, 
      doctor_id: user?.doctorId, 
      search: debouncedSearch,
      startDate: fromDate,
      endDate: toDate,
      status: statusFilter,
      isOld: patientTypeFilter,
      sortBy: 'preferredDate',
      sortOrder: 'desc'
    }),
    enabled: !!user?.doctorId,
    keepPreviousData: true,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => bookingService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Patient status updated')
      setSelected(null)
    },
    onError: () => toast.error('Failed to update patient status'),
  })

  const handlePrintSlip = async (booking) => {
    try {
      const slipData = await printService.getSlipData(booking)
      PrintSlipHandler.printBooking(slipData)
    } catch (err) {
      toast.error('Failed to prepare print slip')
    }
  }

  const rows = useMemo(() => {
    return (bookingsData?.data || [])
  }, [bookingsData])

  const total = bookingsData?.total || rows.length
  const totalPages = bookingsData?.totalPages || Math.max(1, Math.ceil(total / limit))
  const paginatedRows = rows

  const pagination = {
    page: bookingsData?.page || page,
    limit,
    total,
    totalPages,
    onPageChange: setPage,
  }

  const columns = ['Patient', 'Patient Type', 'Date', 'Token', 'Status', 'Action']

  const renderRow = (b) => (
    <tr key={b.id}>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.patientInfo}>
          <span>{b.patient_name}</span>
          <span className={styles.patientMobile}>{formatPhone(b.mobile)}{b.uhid ? ` • ${b.uhid}` : ''}</span>
        </div>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: (b.is_old || b.isOld) ? 'rgba(56, 139, 253, 0.15)' : 'rgba(46, 160, 67, 0.15)',
          color: (b.is_old || b.isOld) ? '#58a6ff' : '#3fb950',
          border: (b.is_old || b.isOld) ? '1px solid rgba(56, 139, 253, 0.3)' : '1px solid rgba(46, 160, 67, 0.3)'
        }}>
          {(b.is_old || b.isOld) ? 'Old Patient (पुराना)' : 'New Patient (नया)'}
        </span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '13px' }}>
        {formatDate(b.date)}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {b.token_number ? (
          <span style={{
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            border: '1px solid rgba(37, 211, 102, 0.25)'
          }}>
            {b.token_number}
          </span>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{b.time_slot || '—'}</span>
        )}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <StatusBadge status={b.status} />
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.rowActions}>
          <button
            className={styles.actionBtn}
            style={{
              padding: '0 8px',
              width: 'auto',
              color: 'var(--accent-blue)',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
            }}
            onClick={() => navigate(`/prescribe/${b.id}`)}
            title="Open Doctor Prescription Page"
          >
            <Pill size={14} style={{ marginRight: '4px' }}/> Prescribe
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => setSelected(b)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => handlePrintSlip(b)}
            title="Print OPD Consultation Slip"
          >
            <Printer size={16} />
          </button>
          {b.status === 'pending' && (
            <button
              className={`${styles.actionBtn} ${styles.confirm}`}
              onClick={() => statusMutation.mutate({ id: b.id, status: 'confirmed' })}
              title="Confirm Patient"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {b.status === 'confirmed' && (
            <button
              className={`${styles.actionBtn} ${styles.confirm}`}
              onClick={() => statusMutation.mutate({ id: b.id, status: 'completed' })}
              title="Mark Visit Completed"
            >
              <CheckCheck size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )

  if (!user?.doctorId && user?.role === 'doctor') {
    return (
      <div className={styles.page}>
        <Card>
          <p style={{ color: 'var(--text-muted)' }}>No doctor profile linked to this login.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="My Patients"
        subtitle="Assigned patient queue · Search, filter by date/status, record prescriptions & print OPD slips"
        icon={Stethoscope}
      />
      
      {/* ── Summary Stats Row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            Total Bookings {fromDate === getTodayStr() && toDate === getTodayStr() ? ' (Today)' : ''}
          </span>
          <span className={styles.statValue}>{bookingsData?.summary?.totalBookings ?? bookingsData?.total ?? 0}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Old Patients (पुराना)</span>
          <span className={styles.statValue} style={{ color: '#58a6ff' }}>
            {bookingsData?.summary?.oldPatientCount ?? 0}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>New Patients (नया)</span>
          <span className={styles.statValue} style={{ color: '#3fb950' }}>
            {bookingsData?.summary?.newPatientCount ?? 0}
          </span>
        </div>
        <div className={`${styles.statCard} ${styles.statConfirmed}`}>
          <span className={styles.statLabel}>Total Confirmed</span>
          <span className={`${styles.statValue} ${styles.confirmedText}`}>
            {bookingsData?.summary?.confirmedCount ?? 0}
          </span>
        </div>
        <div className={`${styles.statCard} ${styles.statPending}`}>
          <span className={styles.statLabel}>Total Pending</span>
          <span className={`${styles.statValue} ${styles.pendingText}`}>
            {bookingsData?.summary?.pendingCount ?? 0}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Completed</span>
          <span className={styles.statValue}>
            {bookingsData?.summary?.completedCount ?? 0}
          </span>
        </div>
        <div className={`${styles.statCard} ${styles.statCancelled}`}>
          <span className={styles.statLabel}>Total Cancelled</span>
          <span className={`${styles.statValue} ${styles.cancelledText}`}>
            {bookingsData?.summary?.cancelledCount ?? 0}
          </span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIconInline} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name, ID, or mobile..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              id="booking-search"
            />
          </div>
          <div className={styles.dateInputWrapper}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
                setSearch('')
              }}
              id="date-filter-from"
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
                setSearch('')
              }}
              id="date-filter-to"
            />
            <button
              className={styles.clearDateBtn}
              style={{ position: 'static', marginLeft: 6, border: '1px solid var(--border-primary)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
              onClick={() => {
                setFromDate(getTodayStr())
                setToDate(getTodayStr())
                setPage(1)
                setSearch('')
              }}
              title="Jump back to today"
            >
              Today
            </button>
            {(fromDate || toDate) && (
              <button
                className={styles.clearDateBtn}
                onClick={() => {
                  setFromDate('')
                  setToDate('')
                  setPage(1)
                  setSearch('')
                }}
                title="Show all dates"
              >
                ×
              </button>
            )}
          </div>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            id="status-filter"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className={styles.select}
            value={patientTypeFilter}
            onChange={(e) => {
              setPatientTypeFilter(e.target.value)
              setPage(1)
            }}
            id="patient-type-filter"
          >
            <option value="">All Patient Types</option>
            <option value="true">Old Patient (पुराना मरीज)</option>
            <option value="false">New Patient (नया मरीज)</option>
          </select>
          <select
            className={styles.select}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
            id="limit-filter"
            title="Rows Per Page"
            style={{ minWidth: '95px' }}
          >
            <option value={10}>10 rows</option>
            <option value={30}>30 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
        <div className={styles.actions}>
          <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--text-secondary)', marginRight: 8 }}>
            {(fromDate || toDate)
              ? `${bookingsData?.total ?? 0} patient${(bookingsData?.total ?? 0) === 1 ? '' : 's'} · ${fromDate === toDate ? formatDate(fromDate) : `${formatDate(fromDate)} to ${formatDate(toDate)}`} · newest first`
              : `${bookingsData?.total ?? 0} patients · all dates · newest first`}
          </span>
        </div>
      </div>

      <Card noPadding>
        {isLoading ? (
          <Loader />
        ) : (
          <Table
            columns={columns}
            data={paginatedRows}
            renderRow={renderRow}
            pagination={pagination}
            emptyMessage={(fromDate || toDate) ? `No bookings for selected dates` : 'No bookings found'}
          />
        )}
      </Card>

      {/* Patient Detail Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`${selected?.patient_name || ''} — Visit Details`}
      >
        {selected && (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Booking ID</span>
              <span className={styles.detailValue}>{selected.booking_id}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <StatusBadge status={selected.status} />
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>UHID</span>
              <span className={styles.detailValue}>{selected.uhid || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Token No</span>
              <span className={styles.detailValue}>{selected.token_number || selected.time_slot || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Patient Name</span>
              <span className={styles.detailValue}>{selected.patient_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Mobile</span>
              <span className={styles.detailValue}>
                {formatPhone(selected.mobile)}{' '}
                <a
                  href={`https://wa.me/91${selected.mobile?.replace(/\D/g, '').slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'underline', marginLeft: '6px' }}
                >
                  WhatsApp
                </a>
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Doctor</span>
              <span className={styles.detailValue}>{selected.doctor_name || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Service</span>
              <span className={styles.detailValue}>{selected.service_name || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Visit Date</span>
              <span className={styles.detailValue}>{formatDate(selected.date)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Created By</span>
              <span className={styles.detailValue}>{selected.created_by || 'WhatsApp Bot'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Created</span>
              <span className={styles.detailValue}>{formatDate(selected.created_at)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Updated</span>
              <span className={styles.detailValue}>{formatDate(selected.updated_at)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
