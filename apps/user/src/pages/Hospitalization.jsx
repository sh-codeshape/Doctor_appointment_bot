import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, Edit, CheckCircle, XCircle, BedDouble, Printer, RotateCcw, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import Table from '../components/common/Table'
import StatusBadge from '../components/common/StatusBadge'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { Loader } from '../components/common/Loader'
import { bookingService } from '../services/bookingService'
import PrintSlipHandler from '../services/PrintSlipHandler'
import { printService } from '../services/printService'
import { isMockMode } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../utils/formatters'
import styles from './Hospitalization.module.css'

const getTodayStr = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function Hospitalization() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = !user?.role || ['admin', 'superadmin', 'super'].includes(String(user?.role).toLowerCase())
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(30)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState(getTodayStr)
  const [toDate, setToDate] = useState(getTodayStr)
  const [statusFilter, setStatusFilter] = useState('')
  const [patientTypeFilter, setPatientTypeFilter] = useState('')
  // Always newest-first (server sorts preferredDate desc, createdAt desc) — no sort dropdown needed.
  const [selectedReq, setSelectedReq] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [staffNotes, setStaffNotes] = useState('')

  // Query - we fetch bookings but filter by type=HOSPITALIZATION, date = visit date (preferredDate)
  const { data: response, isLoading } = useQuery({
    queryKey: ['hospitalization', { page, limit, search, startDate: fromDate, endDate: toDate, status: statusFilter, isOld: patientTypeFilter }],
    queryFn: () => bookingService.getBookings({ type: 'HOSPITALIZATION', page, limit, search, startDate: fromDate, endDate: toDate, status: statusFilter, isOld: patientTypeFilter, sortBy: 'preferredDate', sortOrder: 'asc' }),
    refetchInterval: isMockMode() ? false : 30000,
  })

  // Export CSV handler
  const handleExportCSV = async () => {
    const allBookings = [];
    let currentPage = 1;
    let totalPages = 1;
    let isFetching = true;

    toast.loading('Fetching data in chunks...', { id: 'csv-export' });

    while (isFetching) {
      try {
        const result = await bookingService.getBookings({
          type: 'HOSPITALIZATION',
          page: currentPage,
          limit: 100, // Fetch in chunks of 100
          status: statusFilter,
          search,
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

    const reqs = allBookings || []
    reqs.forEach((b) => {
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
    a.download = `hospitalization-requests-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('Hospitalization requests exported to CSV', { id: 'csv-export' })
  }

  // Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => bookingService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitalization'] })
      toast.success('Hospitalization request updated')
      setShowDetail(false)
    },
    onError: () => toast.error('Failed to update status'),
  })

  const handleStatusChange = (id, newStatus) => {
    statusMutation.mutate({ id, status: newStatus })
  }

  const handleViewDetail = (req) => {
    setSelectedReq(req)
    // Note: booking model doesn't strictly have staff_notes right now, we can just use a local state or add it later
    setStaffNotes('')
    setShowDetail(true)
  }

  // Print flow: enrich the row with patient details first so the
  // ticket renders real data (age, gender, address, UHID).
  const handlePrint = async (req) => {
    try {
      const slipData = await printService.getSlipData(req)
      PrintSlipHandler.printBooking(slipData)
    } catch (err) {
      toast.error('Could not load ticket data')
    }
  }

  const requests = response?.data || []
  const columns = ['Patient', 'Patient Type', 'Mobile', 'Pref. Date', 'Status', 'Actions']

  const renderRow = (req) => (
    <tr key={req.id}>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {req.patient_name}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          background: (req.is_old || req.isOld) ? 'rgba(56, 139, 253, 0.15)' : 'rgba(46, 160, 67, 0.15)',
          color: (req.is_old || req.isOld) ? '#58a6ff' : '#3fb950',
          border: (req.is_old || req.isOld) ? '1px solid rgba(56, 139, 253, 0.3)' : '1px solid rgba(46, 160, 67, 0.3)'
        }}>
          {(req.is_old || req.isOld) ? 'Old Patient (पुराना)' : 'New Patient (नया)'}
        </span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {req.mobile}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {formatDate(req.date)}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <StatusBadge status={req.status} />
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.rowActions}>
          <button className={styles.actionBtn} onClick={() => handleViewDetail(req)} title="View Details">
            <Eye size={16} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => navigate('/register', { state: { editBooking: req } })}
            title="Edit Hospitalization Request"
          >
            <Edit size={16} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => handlePrint(req)}
            title="Print IPD Admission Ticket"
          >
            <Printer size={16} />
          </button>
          {req.status === 'pending' && (
            <button
              className={`${styles.actionBtn} ${styles.confirm}`}
              onClick={() => {
                handleStatusChange(req.id, 'confirmed')
                handlePrint({ ...req, status: 'confirmed' })
              }}
              title="Confirm & Print Ticket"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {req.status === 'confirmed' && (
            <button
              className={`${styles.actionBtn} ${styles.confirm}`}
              onClick={() => handleStatusChange(req.id, 'completed')}
              title="Mark Completed"
            >
              <CheckCircle size={16} />
            </button>
          )}
          {req.status !== 'cancelled' ? (
            <button
              className={`${styles.actionBtn} ${styles.cancel}`}
              onClick={() => handleStatusChange(req.id, 'cancelled')}
              title="Cancel Request"
            >
              <XCircle size={16} />
            </button>
          ) : (
            isAdmin && (
              <button
                className={`${styles.actionBtn} ${styles.confirm}`}
                onClick={() => handleStatusChange(req.id, 'pending')}
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

  return (
    <div className={styles.page}>
      <PageHeader
        title="Hospitalization (IPD)"
        subtitle="Inpatient admission requests · confirm or complete"
        icon={BedDouble}
      />
      {/* ── Summary Stats Row — scoped to the selected preferredDate ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            Total Requests {(fromDate === getTodayStr() && toDate === getTodayStr()) ? ' (Today)' : ''}
          </span>
          <span className={styles.statValue}>{response?.summary?.totalBookings ?? response?.total ?? 0}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Old Patients (पुराना)</span>
          <span className={styles.statValue} style={{ color: '#58a6ff' }}>
            {response?.summary?.oldPatientCount ?? 0}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>New Patients (नया)</span>
          <span className={styles.statValue} style={{ color: '#3fb950' }}>
            {response?.summary?.newPatientCount ?? 0}
          </span>
        </div>
        <div className={`${styles.statCard} ${styles.statConfirmed}`}>
          <span className={styles.statLabel}>Total Confirmed</span>
          <span className={`${styles.statValue} ${styles.confirmedText}`}>
            {response?.summary?.confirmedCount ?? 0}
          </span>
        </div>
        <div className={`${styles.statCard} ${styles.statPending}`}>
          <span className={styles.statLabel}>Total Pending</span>
          <span className={`${styles.statValue} ${styles.pendingText}`}>
            {response?.summary?.pendingCount ?? 0}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Completed</span>
          <span className={styles.statValue}>
            {response?.summary?.completedCount ?? 0}
          </span>
        </div>
        <div className={`${styles.statCard} ${styles.statCancelled}`}>
          <span className={styles.statLabel}>Total Cancelled</span>
          <span className={`${styles.statValue} ${styles.cancelledText}`}>
            {response?.summary?.cancelledCount ?? 0}
          </span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIconInline} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className={styles.dateInputWrapper}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); setSearch('') }}
              id="ipd-date-filter-from"
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); setSearch('') }}
              id="ipd-date-filter-to"
            />
            <button
              className={styles.clearDateBtn}
              style={{ position: 'static', marginLeft: 6, border: '1px solid var(--border-primary)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
              onClick={() => { setFromDate(getTodayStr()); setToDate(getTodayStr()); setPage(1); setSearch('') }}
              title="Jump back to today"
            >
              Today
            </button>
            {(fromDate || toDate) && (
              <button
                className={styles.clearDateBtn}
                onClick={() => { setFromDate(''); setToDate(''); setPage(1); setSearch('') }}
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
            id="ipd-status-filter"
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
            id="ipd-patient-type-filter"
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
            id="ipd-limit-filter"
            title="Rows Per Page"
            style={{ minWidth: '95px' }}
          >
            <option value={10}>10 rows</option>
            <option value={30}>30 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            {(fromDate || toDate)
              ? `${response?.total ?? 0} patient${(response?.total ?? 0) === 1 ? '' : 's'} · ${fromDate === toDate ? formatDate(fromDate) : `${formatDate(fromDate)} to ${formatDate(toDate)}`} · newest first`
              : `${response?.total ?? 0} patients · all dates · newest first`}
          </span>
          <Button variant="secondary" icon={Download} size="sm" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      <Card noPadding>
        {isLoading ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <Loader size="lg" />
          </div>
        ) : (
          <Table
            columns={columns}
            data={requests}
            renderRow={renderRow}
            pagination={
              response
                ? {
                    page: response.page || page,
                    totalPages: response.totalPages || Math.ceil((response.total || requests.length) / limit),
                    total: response.total || requests.length,
                    limit: response.limit || limit,
                    onPageChange: setPage,
                  }
                : null
            }
            emptyMessage={(fromDate || toDate) ? `No hospitalization requests for selected dates` : 'No hospitalization requests found.'}
          />
        )}
      </Card>

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Hospitalization Request Details"
        footer={
          <>
            {selectedReq?.status === 'pending' ? (
              <>
                <Button icon={CheckCircle} onClick={() => handleStatusChange(selectedReq.id, 'confirmed')} disabled={statusMutation.isPending}>
                  Confirm Admission
                </Button>
                <Button
                  icon={Printer}
                  onClick={() => {
                    handleStatusChange(selectedReq.id, 'confirmed')
                    handlePrint({ ...selectedReq, status: 'confirmed' })
                    setShowDetail(false)
                  }}
                  disabled={statusMutation.isPending}
                >
                  Confirm & Print Ticket
                </Button>
                <Button variant="danger" icon={XCircle} onClick={() => handleStatusChange(selectedReq.id, 'cancelled')} disabled={statusMutation.isPending}>
                  Cancel Request
                </Button>
              </>
            ) : selectedReq?.status === 'cancelled' ? (
              <>
                {isAdmin && (
                  <Button
                    icon={RotateCcw}
                    onClick={() => handleStatusChange(selectedReq.id, 'pending')}
                    disabled={statusMutation.isPending}
                  >
                    Reopen (Set to Pending)
                  </Button>
                )}
                <Button
                  icon={Printer}
                  variant="secondary"
                  onClick={() => handlePrint(selectedReq)}
                >
                  Print Ticket
                </Button>
              </>
            ) : (
              <Button
                icon={Printer}
                variant="secondary"
                onClick={() => handlePrint(selectedReq)}
              >
                Print Ticket
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowDetail(false)}>
              Close
            </Button>
          </>
        }
      >
        {selectedReq && (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Request ID</span>
              <span className={styles.detailValue}>{selectedReq.booking_id}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <StatusBadge status={selectedReq.status} />
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Patient Name</span>
              <span className={styles.detailValue}>{selectedReq.patient_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Mobile</span>
              <span className={styles.detailValue}>{selectedReq.mobile}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Preferred Date</span>
              <span className={styles.detailValue}>{formatDate(selectedReq.date)}</span>
            </div>
            <div className={styles.detailItemFull}>
              <span className={styles.detailLabel}>Patient Problem / Reason</span>
              <div className={styles.textBlock}>{selectedReq.problemDescription || 'No problem described.'}</div>
            </div>
            <div className={styles.detailItemFull}>
              <span className={styles.detailLabel}>Staff Notes (Internal)</span>
              <textarea 
                className={styles.textarea} 
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Enter notes after calling the patient..."
                disabled={selectedReq.status !== 'pending'}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
