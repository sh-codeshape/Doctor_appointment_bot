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
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'confirmed', 'pending', 'completed'
  const [sortBy, setSortBy] = useState('preferredDate') // 'token', 'date', 'name', 'status'

  const limit = 10
  const debouncedSearch = useDebounce(search, 400)

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['my-bookings', user?.doctorId, { page, limit, search: debouncedSearch, startDate: fromDate, endDate: toDate, status: statusFilter, sortBy }],
    queryFn: () => bookingService.getBookings({ 
      limit, 
      page, 
      doctor_id: user?.doctorId, 
      search: debouncedSearch,
      startDate: fromDate,
      endDate: toDate,
      status: statusFilter === 'all' ? '' : statusFilter,
      sortBy: sortBy === 'date' ? 'preferredDate' : sortBy === 'token' ? 'token_number' : sortBy === 'name' ? 'patient_name' : sortBy === 'status' ? 'status' : 'preferredDate',
      sortOrder: sortBy === 'date' ? 'desc' : 'asc'
    }),
    enabled: !!user?.doctorId,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => bookingService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
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
    return (bookingsData?.data || []).filter((b) => b.status !== 'cancelled')
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

  const columns = ['Token', 'Patient', 'UHID', 'Mobile', 'Date', 'Status', 'Action']

  const renderRow = (b) => (
    <tr key={b.id}>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <span className={styles.token}>{b.token_number || '—'}</span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.patientRow}>
          <div className={styles.patientAvatar}>{getInitials(b.patient_name)}</div>
          <span className={styles.patientName}>{b.patient_name}</span>
        </div>
      </td>
      <td
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-primary)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
        }}
      >
        {b.uhid || '—'}
      </td>
      <td
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        {formatPhone(b.mobile)}
      </td>
      <td
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-primary)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
        }}
      >
        {formatDate(b.date)}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <StatusBadge status={b.status} />
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Prescribe Page Button */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/prescribe/${b.id}`)}
            title="Open Doctor Prescription Page"
          >
            <Pill size={14} /> Prescribe
          </button>

          {/* Print OPD Slip */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              cursor: 'pointer',
            }}
            onClick={() => handlePrintSlip(b)}
            title="Print Full OPD Slip"
          >
            <Printer size={15} />
          </button>

          {/* View Patient Details */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 6,
              color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-primary)',
              cursor: 'pointer',
            }}
            onClick={() => setSelected(b)}
            title="View Details"
          >
            <Eye size={15} />
          </button>

          {b.status === 'confirmed' && (
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                color: 'var(--accent-blue)',
                background: 'rgba(88, 166, 255, 0.12)',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => statusMutation.mutate({ id: b.id, status: 'completed' })}
              title="Mark Visit Completed"
            >
              <CheckCheck size={15} />
            </button>
          )}
          {b.status === 'pending' && (
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                color: 'var(--primary)',
                background: 'var(--primary-glow)',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => statusMutation.mutate({ id: b.id, status: 'confirmed' })}
              title="Confirm Patient"
            >
              <CheckCircle size={15} />
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

      {/* Filter & Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search by patient name, UHID, or token (T-001)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            id="mypatients-search"
          />
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>From:</span>
          <input
            type="date"
            className={styles.select}
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(1)
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>To:</span>
          <input
            type="date"
            className={styles.select}
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(1)
            }}
          />
          {(fromDate || toDate) && (
            <button
              style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              onClick={() => {
                setFromDate('')
                setToDate('')
                setPage(1)
              }}
              title="Clear Dates"
            >
              ×
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>

        {/* Sort Selector */}
        <select
          className={styles.select}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="token">Sort: Token Number</option>
          <option value="date">Sort: Date & Time</option>
          <option value="name">Sort: Patient Name</option>
          <option value="status">Sort: Visit Status</option>
        </select>
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
            emptyMessage="No patients match your search and filter criteria"
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
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span>Token</span>
              <strong>{selected.token_number || '—'}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>UHID</span>
              <strong>{selected.uhid || '—'}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Booking ID</span>
              <strong>{selected.booking_id}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Patient Name</span>
              <strong>{selected.patient_name}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Mobile</span>
              <strong>{formatPhone(selected.mobile)}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Doctor</span>
              <strong>{selected.doctor_name || '—'}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Service</span>
              <strong>{selected.service_name || '—'}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Date</span>
              <strong>{formatDate(selected.date)}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Status</span>
              <StatusBadge status={selected.status} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
