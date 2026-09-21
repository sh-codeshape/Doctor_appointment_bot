import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Eye, CheckCircle, Truck, PackageCheck, XCircle, Pill, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import Table from '../components/common/Table'
import StatusBadge from '../components/common/StatusBadge'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import { Loader } from '../components/common/Loader'
import { medicineOrderService } from '../services/medicineOrderService'
import { isMockMode } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import styles from './MedicineOrders.module.css'

export default function MedicineOrders() {
  const { user } = useAuth()
  // Receptionists get read-only access (desk queries: "where is my medicine?")
  const canWrite = user?.role !== 'receptionist'
  const isAdmin = !user?.role || ['admin', 'superadmin', 'super'].includes(String(user?.role).toLowerCase())
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [staffNotes, setStaffNotes] = useState('')
  const sentinelRef = useRef(null)
  const limit = 30

  // Infinite Query (loads 30 per batch)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['medicineOrders', search, statusFilter],
    queryFn: ({ pageParam = 1 }) => medicineOrderService.getOrders({ search, status: statusFilter, page: pageParam, limit }),
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.page >= lastPage.totalPages) return undefined
      return lastPage.page + 1
    },
    refetchInterval: isMockMode() ? false : 30000,
  })

  // Intersection Observer + Window Scroll Listener for Infinite Scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: null, rootMargin: '350px', threshold: 0 }
    )

    const el = sentinelRef.current
    if (el) observer.observe(el)

    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return
      const scrollPosition = window.innerHeight + window.scrollY
      const threshold = document.documentElement.scrollHeight - 350
      if (scrollPosition >= threshold) {
        fetchNextPage()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (el) observer.unobserve(el)
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Flatten orders across pages
  const orders = data?.pages ? data.pages.flatMap((page) => page.data || []) : []
  const total = data?.pages?.[0]?.total ?? orders.length

  // Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes, mobile }) => medicineOrderService.updateStatus(id, status, notes, mobile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicineOrders'] })
      toast.success('Order status updated')
      setShowDetail(false)
    },
    onError: () => toast.error('Failed to update status'),
  })

  const handleStatusChange = (id, newStatus) => {
    statusMutation.mutate({ id, status: newStatus, notes: staffNotes, mobile: selectedOrder?.mobile })
  }

  const handleViewDetail = (order) => {
    setSelectedOrder(order)
    setStaffNotes(order.staff_notes || '')
    setShowDetail(true)
  }

  const columns = ['Order ID', 'Patient', 'Mobile', 'Status', 'Actions']

  const renderRow = (order) => (
    <tr key={order.id}>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <span className={styles.orderId}>{order.order_id}</span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {order.patient_name}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        {order.mobile}
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <StatusBadge status={order.status} />
      </td>
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
        <div className={styles.rowActions}>
          <button className={styles.actionBtn} onClick={() => handleViewDetail(order)} title="View Details">
            <Eye size={16} />
          </button>
        </div>
      </td>
    </tr>
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="Medicine Orders"
        subtitle={canWrite ? 'Prescription queue · accept, dispatch and deliver' : 'Track medicine orders · read-only for the front desk'}
        icon={Pill}
      />
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIconInline} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, ID or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className={styles.statusFilter}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="dispatched">Dispatched</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Card noPadding>
        {isLoading ? (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <Loader size="lg" />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={orders}
              renderRow={renderRow}
              emptyMessage="No medicine orders found."
            />
            <div ref={sentinelRef} style={{ height: '1px', width: '100%' }} />
            {orders.length > 0 && (
              <div className={styles.scrollFooter}>
                {isFetchingNextPage ? (
                  <div className={styles.scrollLoader}>
                    <Loader size="sm" />
                    <span>Loading more orders (30 per batch)...</span>
                  </div>
                ) : hasNextPage ? (
                  <span>Scroll down to load more · Showing {orders.length} of {total}</span>
                ) : (
                  <span>All {total} medicine orders loaded</span>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Medicine Order Details"
        footer={
          <>
            {canWrite && selectedOrder?.status === 'pending' && (
              <Button icon={CheckCircle} onClick={() => handleStatusChange(selectedOrder.id, 'processing')} disabled={statusMutation.isPending}>
                Accept & Process
              </Button>
            )}
            {canWrite && selectedOrder?.status === 'processing' && (
              <Button icon={Truck} onClick={() => handleStatusChange(selectedOrder.id, 'dispatched')} disabled={statusMutation.isPending}>
                Mark Dispatched
              </Button>
            )}
            {canWrite && selectedOrder?.status === 'dispatched' && (
              <Button icon={PackageCheck} onClick={() => handleStatusChange(selectedOrder.id, 'completed')} disabled={statusMutation.isPending}>
                Mark Delivered
              </Button>
            )}
            {canWrite && (selectedOrder?.status === 'pending' || selectedOrder?.status === 'processing') && (
              <Button variant="danger" icon={XCircle} onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')} disabled={statusMutation.isPending}>
                Cancel Order
              </Button>
            )}
            {isAdmin && selectedOrder?.status === 'cancelled' && (
              <Button icon={RotateCcw} onClick={() => handleStatusChange(selectedOrder.id, 'pending')} disabled={statusMutation.isPending}>
                Reopen (Set to Pending)
              </Button>
            )}
            {!canWrite && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: 'auto' }}>
                Read-only access for receptionists
              </span>
            )}
            <Button variant="secondary" onClick={() => setShowDetail(false)}>
              Close
            </Button>
          </>
        }
      >
        {selectedOrder && (
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Order ID</span>
              <span className={styles.detailValue}>{selectedOrder.order_id}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status</span>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Patient Name</span>
              <span className={styles.detailValue}>{selectedOrder.patient_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Mobile</span>
              <span className={styles.detailValue}>{selectedOrder.mobile}</span>
            </div>
            <div className={styles.detailItemFull}>
              <span className={styles.detailLabel}>Delivery Address</span>
              <div className={styles.textBlock}>{selectedOrder.address}</div>
            </div>
            {selectedOrder.customer_notes && (
              <div className={styles.detailItemFull}>
                <span className={styles.detailLabel}>Customer Notes</span>
                <div className={styles.textBlock}>{selectedOrder.customer_notes}</div>
              </div>
            )}
            <div className={styles.detailItemFull}>
              <span className={styles.detailLabel}>Prescription Image</span>
              <div className={styles.imageBox}>
                {(() => {
                  const url = selectedOrder.prescription_url || ''
                  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
                  const fullUrl = url.startsWith('http') ? url : `${apiBase.replace(/\/api$/, '')}${url}`
                  return <img src={fullUrl} alt="Prescription" onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Prescription+Preview' }} />
                })()}
              </div>
            </div>
            <div className={styles.detailItemFull}>
              <span className={styles.detailLabel}>Staff Notes (Internal)</span>
              <textarea 
                className={styles.textarea} 
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Enter pricing details or notes..."
                disabled={!canWrite || selectedOrder.status === 'completed'}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
