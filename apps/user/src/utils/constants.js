/**
 * Booking Status Constants
 * Used across components for consistent status handling.
 */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  DRAFTED: 'drafted',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PROCESSING: 'processing',
  DISPATCHED: 'dispatched',
}

export const STATUS_LABELS = {
  [BOOKING_STATUS.PENDING]: 'Pending',
  [BOOKING_STATUS.DRAFTED]: 'Drafted',
  [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.CANCELLED]: 'Cancelled',
  [BOOKING_STATUS.PROCESSING]: 'Processing',
  [BOOKING_STATUS.DISPATCHED]: 'Dispatched',
}

export const STATUS_COLORS = {
  pending: { text: '#f0ad4e', bg: 'rgba(240, 173, 78, 0.12)' },
  drafted: { text: '#d29922', bg: 'rgba(210, 153, 34, 0.12)' },
  confirmed: { text: '#25D366', bg: 'rgba(37, 211, 102, 0.12)' },
  completed: { text: '#58a6ff', bg: 'rgba(88, 166, 255, 0.12)' },
  cancelled: { text: '#f85149', bg: 'rgba(248, 81, 73, 0.12)' },
  processing: { text: '#bc8cff', bg: 'rgba(188, 140, 255, 0.12)' },
  dispatched: { text: '#56d4dd', bg: 'rgba(86, 212, 221, 0.12)' },
  active: { text: '#25D366', bg: 'rgba(37, 211, 102, 0.12)' },
  inactive: { text: '#8b949e', bg: 'rgba(139, 148, 158, 0.12)' },
}

/**
 * Sidebar navigation items.
 * Icons are Lucide icon names — resolved in Sidebar component.
 */
export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/bookings', label: 'Bookings', icon: 'CalendarCheck' },
  { path: '/doctors', label: 'Doctors', icon: 'Stethoscope' },
  { path: '/time-slots', label: 'Time Slots', icon: 'Clock' },
  { path: '/patients', label: 'Patients', icon: 'Users' },
  { path: '/reports', label: 'Reports', icon: 'BarChart3' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
]

/**
 * Specializations / Hospital Departments — used in doctor forms
 */
export const SPECIALIZATIONS = [
  'Obstetrics & Gynaecology',
  'Laparoscopic & General Surgery',
  'General Medicine',
  'Critical Care',
  'Orthopaedics',
  'Urology',
  'General Surgery (Shalya)',
  'Paediatric',
  'ENT',
  'Anaesthetist',
  'RMO - Resident Medical Officer',
  'General Physician',
  'Dermatologist',
  'Cardiologist',
  'Pediatrician',
  'Dentist',
  'Neurologist',
]

/**
 * Standard Medical Degrees / Qualifications — used in doctor forms
 */
export const DEGREE_OPTIONS = [
  'MBBS',
  'MBBS, MS',
  'MBBS, MD',
  'M.S. (Obs & Gynae)',
  'MBBS, DNB',
  'MBBS, MCH',
  'MBBS, DGO',
  'MBBS, DCH',
  'MS (Shalya)',
  'BAMS',
  'BAMS (RMO)',
  'BAMS, MD',
  'BMS, PGDNC',
  'Other / Custom...',
]

/**
 * Default time slots
 */
export const DEFAULT_TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
]

/**
 * Staff Role Constants & Navigation Helpers
 */
export const ALL_STAFF = ['superadmin', 'admin', 'doctor', 'receptionist', 'pharmacy', 'assistant_doctor']

export const ROLE_HOME = {
  superadmin: '/',
  admin: '/',
  doctor: '/my-patients',
  receptionist: '/appointments',
  assistant_doctor: '/assistant-patients',
  pharmacy: '/medicine-orders',
}

export function homeForRole(role) {
  return ROLE_HOME[role] || '/'
}

