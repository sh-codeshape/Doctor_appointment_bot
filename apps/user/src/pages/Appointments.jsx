import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Download, Eye, Edit, CheckCircle, XCircle, CalendarCheck, Printer, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { bookingService } from '../services/bookingService'
import { doctorService } from '../services/doctorService'
import PrintSlipHandler from '../services/PrintSlipHandler'
import { printService } from '../services/printService'
import { useAuth } from '../hooks/useAuth'
import { useDebounce } from '../hooks/useDebounce'
import { formatDate, formatPhone } from '../utils/formatters'
import { BOOKING_STATUS } from '../utils/constants'
import Card from '../components/common/Card'
import Table from '../components/common/Table'
import PageHeader from '../components/common/PageHeader'
import StatusBadge from '../components/common/StatusBadge'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { Loader } from '../components/common/Loader'
import styles from './Appointments.module.css'

const getTodayStr = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function Appointments() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isDoctor = user?.role === 'doctor'
  const isAdmin = !user?.role || ['admin', 'superadmin', 'super'].includes(String(user?.role).toLowerCase())
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [patientTypeFilter, setPatientTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState(getTodayStr)
  const [toDate, setToDate] = useState(getTodayStr)
  // Default 30 rows so a full day's queue fits with pagination (10/30/50/100)
  const [limit, setLimit] = useState(30)
  // Doctors see only their own bookings — scoped from the login, never the dropdown
  const [doctorFilter, setDoctorFilter] = useState(isDoctor ? String(user?.doctorId || '') : '')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  // Fetch doctors for filter dropdown
  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors,
  })

  // Fetch bookings with filters — date is ALWAYS the visit date (preferredDate), newest first
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['bookings', { type: 'OPD', page, limit, status: statusFilter, doctor_id: doctorFilter, search: debouncedSearch, startDate: fromDate, endDate: toDate, isOld: patientTypeFilter }],
    queryFn: () =>
      bookingService.getBookings({
        type: 'OPD',
        page,
        limit,
        status: statusFilter,
        doctor_id: doctorFilter,
        search: debouncedSearch,
        startDate: fromDate,
        endDate: toDate,
        isOld: patientTypeFilter,
        sortBy: 'preferredDate',
        sortOrder: 'asc',
      }),
    keepPreviousData: true,
  })

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => bookingService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`Booking ${variables.status}!`)
    },
    onError: () => toast.error('Failed to update status'),
  })

  const handleStatusChange = (id, status) => {
    statusMutation.mutate({ id, status })
  }

  const handleViewDetail = (booking) => {
    setSelectedBooking(booking)
    setShowDetail(true)
  }

  // Print flow: enrich the row with patient/doctor details first so the
  // slip renders real data (age, gender, address, UHID, specialization).
  const handlePrint = async (booking) => {
    try {
      const slipData = await printService.getSlipData(booking)
      PrintSlipHandler.printBooking(slipData)
    } catch (err) {
      toast.error('Could not load slip data')
    }
  }

  const bookings = bookingsData?.data || []
  const pagination = bookingsData
    ? {
        page: bookingsData.page,
        totalPages: bookingsData.totalPages,
        total: bookingsData.total,
        limit: bookingsData.limit,
        onPageChange: setPage,
      }
    : null

  const columns = ['Patient', 'Patient Type', 'Doctor', 'Date', 'Token', 'Status', 'Actions']

  const renderRow = (booking) => (
    <tr key={booking.id}>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.patientInfo}>
          <span>{booking.patient_name}</span>
          <span className={styles.patientMobile}>{formatPhone(booking.mobile)}{booking.uhid ? ` • ${booking.uhid}` : ''}</span>
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
          background: (booking.is_old || booking.isOld) ? 'rgba(56, 139, 253, 0.15)' : 'rgba(46, 160, 67, 0.15)',
          color: (booking.is_old || booking.isOld) ? '#58a6ff' : '#3fb950',
          border: (booking.is_old || booking.isOld) ? '1px solid rgba(56, 139, 253, 0.3)' : '1px solid rgba(46, 160, 67, 0.3)'
        }}>
          {(booking.is_old || booking.isOld) ? 'Old Patient (पुराना)' : 'New Patient (नया)'}
        </span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {booking.doctor_name || '—'}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '13px' }}>
        {formatDate(booking.date)}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {booking.token_number ? (
          <span style={{
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '13px',
            border: '1px solid rgba(37, 211, 102, 0.25)'
          }}>
            {booking.token_number}
          </span>
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{booking.time_slot || '—'}</span>
        )}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <StatusBadge status={booking.status} />
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.rowActions}>
          <button
            className={styles.actionBtn}
            onClick={() => handleViewDetail(booking)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => navigate('/register', { state: { editBooking: booking } })}
            title="Edit Booking & Patient Details"
          >
            <Edit size={16} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => handlePrint(booking)}
            title="Print OPD Consultation Slip"
          >
            <Printer size={16} />
          </button>
          {booking.status === BOOKING_STATUS.PENDING && (
            <button
              className={`${styles.actionBtn} ${styles.confirm}`}
              onClick={() => {
                handleStatusChange(booking.id, BOOKING_STATUS.CONFIRMED)
                handlePrint({ ...booking, status: 'confirmed' })
              }}
              title="Confirm & Print Slip"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {booking.status === BOOKING_STATUS.CONFIRMED && (
            <button
              className={`${styles.actionBtn} ${styles.confirm}`}
              onClick={() => handleStatusChange(booking.id, BOOKING_STATUS.COMPLETED)}
              title="Mark Completed"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {booking.status !== BOOKING_STATUS.CANCELLED ? (
            <button
              className={`${styles.actionBtn} ${styles.cancel}`}
              onClick={() => handleStatusChange(booking.id, BOOKING_STATUS.CANCELLED)}
              title="Cancel Booking"
            >
              <XCircle size={16} />
            </button>
          ) : (
            isAdmin && (
              <button
                className={`${styles.actionBtn} ${styles.confirm}`}
                onClick={() => handleStatusChange(booking.id, BOOKING_STATUS.PENDING)}
                title="Reopen (Set to Pending)"
              >
                <RotateCcw size={16} />
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  )

  const handleExportCSV = async () => {
    // Implement chunked fetching for CSV export to prevent backpressure
    const allBookings = [];
    let currentPage = 1;
    let totalPages = 1;
    let isFetching = true;

    toast.loading('Fetching data in chunks...', { id: 'csv-export' });

    while (isFetching) {
      try {
        const result = await bookingService.getBookings({
          type: 'OPD',
          page: currentPage,
          limit: 100, // Fetch in chunks of 100
          status: statusFilter,
          doctor_id: doctorFilter,
          search: debouncedSearch,
          startDate: fromDate,
          endDate: toDate,
          isOld: patientTypeFilter,
          sortBy: 'preferredDate',
          sortOrder: 'asc',
        });

        if (result.data && result.data.length > 0) {
          allBookings.push(...result.data);
        }
        totalPages = result.totalPages || 1;
        
        if (currentPage >= totalPages) {
          isFetching = false;
        } else {
          currentPage++;
          // Wait 3-4 seconds before fetching the next chunk to avoid backpressure
          await new Promise((resolve) => setTimeout(resolve, 3500));
        }
      } catch (err) {
        toast.error('Error fetching data chunks', { id: 'csv-export' });
        return;
      }
    }

    const headers = [
      'UHID',
      'Token Number',
      'Patient Name',
      'Mobile Number',
      'Date',
      'Status',
      'Patient Type',
      'Appointment Date',
      'Created At',
    ]
    const csvRows = [headers.join(',')]

    allBookings.forEach((b) => {
      const uhid = b.uhid || b.patient_uhid || b.patientId?.uhid || ''
      const tokenNum = b.token_number || b.tokenNumber || ''
      const patientName = b.patient_name || b.patientId?.name || ''
      const mobileNum = b.mobile || b.patient_phone || b.patientId?.phone || ''
      const dateVal = (b.date || b.preferredDate) ? new Date(b.date || b.preferredDate).toLocaleDateString('en-IN') : ''
      const statusVal = b.status || ''
      const patientType = (b.is_old || b.isOld) ? 'Old Patient' : 'New Patient'
      const visitDate = (b.date || b.preferredDate) ? new Date(b.date || b.preferredDate).toLocaleDateString('en-IN') : ''
      const createdAt = (b.createdAt || b.created_at) ? new Date(b.createdAt || b.created_at).toLocaleString('en-IN') : ''

      csvRows.push(
        [
          `"${uhid}"`,
          `"${tokenNum}"`,
          `"${patientName}"`,
          `"${mobileNum}"`,
          `"${dateVal}"`,
          `"${statusVal}"`,
          `"${patientType}"`,
          `"${visitDate}"`,
          `"${createdAt}"`,
        ].join(',')
      )
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opd-appointments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('Bookings exported to CSV', { id: 'csv-export' })
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={isDoctor ? 'My Appointments (OPD)' : 'Appointments (OPD)'}
        subtitle={isDoctor ? 'Your OPD queue · confirm or complete visits' : 'OPD bookings across all doctors · confirm, complete or cancel'}
        icon={CalendarCheck}
      />
      {/* ── Summary Stats Row — scoped to the selected preferredDate ── */}
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
            <option value="">All Status</option>
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
          {!isDoctor && (
            <select
              className={styles.select}
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value)
                setPage(1)
              }}
              id="doctor-filter"
            >
              <option value="">All Doctors</option>
              {doctors?.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
          )}
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
          <Button variant="secondary" icon={Download} size="sm" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <Card noPadding>
        {isLoading ? (
          <Loader />
        ) : (
          <Table
            columns={columns}
            data={bookings}
            renderRow={renderRow}
            pagination={pagination}
            emptyMessage={(fromDate || toDate) ? `No bookings for selected dates` : 'No bookings found'}
          />
        )}
      </Card>

      {/* ── Detail Modal ── */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Booking Details"
        footer={
          <>
            {selectedBooking?.status === BOOKING_STATUS.PENDING ? (
              <>
                <Button
                  icon={CheckCircle}
                  onClick={() => {
                    handleStatusChange(selectedBooking.id, BOOKING_STATUS.CONFIRMED)
                    setShowDetail(false)
                  }}
                >
                  Confirm
                </Button>
                <Button
                  icon={Printer}
                  onClick={() => {
                    handleStatusChange(selectedBooking.id, BOOKING_STATUS.CONFIRMED)
                    handlePrint({ ...selectedBooking, status: 'confirmed' })
                    setShowDetail(false)
                  }}
                >
                  Confirm & Print
                </Button>
              </>
            ) : selectedBooking?.status === BOOKING_STATUS.CANCELLED ? (
              <>
                {isAdmin && (
                  <Button
                    icon={RotateCcw}
                    onClick={() => {
                      handleStatusChange(selectedBooking.id, BOOKING_STATUS.PENDING)
                      setShowDetail(false)
                    }}
                  >
                    Reopen (Set to Pending)
                  </Button>
                )}
                <Button
                  icon={Printer}
                  variant="secondary"
                  onClick={() => handlePrint(selectedBooking)}
                >
                  Print Slip
                </Button>
              </>
            ) : (
              <Button
                icon={Printer}
                variant="secondary"
                onClick={() => handlePrint(selectedBooking)}
              >
                Print Slip
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowDetail(false)}>
              Close
            </Button>
          </>
        }
      >
        {selectedBooking && (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Booking ID</span>
              <span className={styles.detailValue}>{selectedBooking.booking_id}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <StatusBadge status={selectedBooking.status} />
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>UHID</span>
              <span className={styles.detailValue}>{selectedBooking.uhid || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Token No</span>
              <span className={styles.detailValue}>{selectedBooking.token_number || selectedBooking.time_slot || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Patient Name</span>
              <span className={styles.detailValue}>{selectedBooking.patient_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Mobile</span>
              <span className={styles.detailValue}>
                {formatPhone(selectedBooking.mobile)}{' '}
                <a
                  href={`https://wa.me/91${selectedBooking.mobile?.replace(/\D/g, '').slice(-10)}`}
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
              <span className={styles.detailValue}>{selectedBooking.doctor_name || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Service</span>
              <span className={styles.detailValue}>{selectedBooking.service_name || '—'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Visit Date</span>
              <span className={styles.detailValue}>{formatDate(selectedBooking.date)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Created By</span>
              <span className={styles.detailValue}>{selectedBooking.created_by || 'WhatsApp Bot'}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Created</span>
              <span className={styles.detailValue}>{formatDate(selectedBooking.created_at)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Updated</span>
              <span className={styles.detailValue}>{formatDate(selectedBooking.updated_at)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
