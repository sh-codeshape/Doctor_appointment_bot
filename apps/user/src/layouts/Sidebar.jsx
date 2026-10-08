import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Bed,
  Pill,
  Users,
  UserPlus,
  ClipboardList,
  BarChart3,
  ReceiptText,
  ChevronDown,
  Settings,
  LogOut,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/common/Modal'
import styles from './Sidebar.module.css'

const iconMap = {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Bed,
  Pill,
  Users,
  UserPlus,
  ClipboardList,
  BarChart3,
  ReceiptText,
  Settings,
}

// Nav per role — exact labels preserved
const NAV_BY_ROLE = {
  superadmin: [
    { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/appointments', label: 'Appointments (OPD)', icon: 'CalendarCheck' },
    { path: '/hospitalization', label: 'Hospitalization (IPD)', icon: 'Bed' },
    { path: '/medicine-orders', label: 'Medicine Orders', icon: 'Pill' },
    { path: '/doctors', label: 'Doctors', icon: 'Stethoscope' },
    { path: '/patients', label: 'Patients', icon: 'Users' },
    { path: '/register', label: 'Register Patient', icon: 'UserPlus' },
    { path: '/manual-prescribe', label: 'Manual Prescribe', icon: 'Stethoscope' },
    { path: '/reports', label: 'Reports', icon: 'BarChart3' },
    { path: '/settings', label: 'Settings', icon: 'Settings' },
    {
  path: '/invoices', label: 'Invoices', icon: 'ReceiptText',
  children: [
    {
      path: '/invoices/prescriptions',
      label: 'Prescription',
    },
    {
      path: '/invoices/hospital-bills',
      label: 'Hospital Bill',
    },
    {
      path: '/invoices/discharge-summaries',
      label: 'Discharge Summary',
    },
  ],
},
  ],
  admin: [
    { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/appointments', label: 'Appointments (OPD)', icon: 'CalendarCheck' },
    { path: '/hospitalization', label: 'Hospitalization (IPD)', icon: 'Bed' },
    //Invoices
    { path: '/invoices', label: 'Invoices', icon: 'ReceiptText',
  children: [
    {
      path: '/invoices/prescriptions',
      label: 'Prescription',
    },
    {
      path: '/invoices/hospital-bills',
      label: 'Hospital Bill',
    },
    {
      path: '/invoices/discharge-summaries',
      label: 'Discharge Summary',
    },
  ],
},
    { path: '/medicine-orders', label: 'Medicine Orders', icon: 'Pill' },
    { path: '/doctors', label: 'Doctors', icon: 'Stethoscope' },
    { path: '/patients', label: 'Patients', icon: 'Users' },
    { path: '/register', label: 'Register Patient', icon: 'UserPlus' },
    { path: '/manual-prescribe', label: 'Manual Prescribe', icon: 'Stethoscope' },
    { path: '/reports', label: 'Reports', icon: 'BarChart3' },
  ],
  doctor: [
    { path: '/my-patients', label: 'My Patients', icon: 'Users' },
    { path: '/appointments', label: 'Appointments (OPD)', icon: 'CalendarCheck' },
    { path: '/manual-prescribe', label: 'Manual Prescribe', icon: 'Stethoscope' },
  ],
  receptionist: [
    { path: '/appointments', label: 'Appointments (OPD)', icon: 'CalendarCheck' },
    { path: '/hospitalization', label: 'Hospitalization (IPD)', icon: 'Bed' },
    {
      path: '/invoices',
      label: 'Invoices',
      icon: 'ReceiptText',
      children: [
        {
          path: '/invoices/prescriptions',
          label: 'Prescription',
        },
        {
          path: '/invoices/hospital-bills',
          label: 'Hospital Bill',
        },
        {
          path: '/invoices/discharge-summaries',
          label: 'Discharge Summary',
        },
      ],
    },
    { path: '/patients', label: 'Patients', icon: 'Users' },
    { path: '/register', label: 'Register Patient', icon: 'UserPlus' },
    { path: '/medicine-orders', label: 'Medicine Orders', icon: 'Pill' },
  ],
  pharmacy: [
    { path: '/medicine-orders', label: 'Medicine Orders', icon: 'Pill' },
    { path: '/patients', label: 'Patients', icon: 'Users' },
  ],
  assistant_doctor: [
    { path: '/appointments', label: 'Appointments (OPD)', icon: 'CalendarCheck' },
    { path: '/patients', label: 'Patients', icon: 'Users' },
    { path: '/medicine-orders', label: 'Medicine Orders', icon: 'Pill' },
  ],
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [expandedInvoices, setExpandedInvoices] = useState(
  location.pathname.startsWith('/invoices')
)
  const navItems = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.admin

  const sidebarClass = [
    styles.sidebar,
    collapsed ? styles.collapsed : '',
    mobileOpen ? styles.mobileOpen : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    logout()
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${mobileOpen ? styles.visible : ''}`}
        onClick={onCloseMobile}
      />
      <aside className={sidebarClass}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIconWrapper}>
            <div className={styles.brandLogoCircle}>
              <img 
                src="/image/image.png" 
                alt="KG Nanda Hospital Logo" 
                className={styles.brandLogoImg} 
              />
            </div>
            <span className={styles.statusDot} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>KG Nanda Hospital</span>
            <span className={styles.brandSub}>DASHBOARD</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
         {navItems.map((item) => {
  const Icon = iconMap[item.icon] || LayoutDashboard

  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)

  const hasChildren =
    Array.isArray(item.children) && item.children.length > 0

  const isInvoices = item.path === '/invoices'

  const isExpanded =
    isInvoices && expandedInvoices

  return (
    <div
      key={item.path}
      className={styles.navGroup}
    >
      {hasChildren ? (
        <button
          type="button"
          className={`${styles.navItem} ${
            isActive ? styles.active : ''
          }`}
          onClick={() => {
            setExpandedInvoices((prev) => !prev)
          }}
          title={collapsed ? item.label : undefined}
        >
          <div className={styles.iconBox}>
            <Icon
              size={18}
              className={styles.navIcon}
            />
          </div>

          <span className={styles.navLabel}>
            {item.label}
          </span>

          {!collapsed && (
            <ChevronDown
              size={17}
              className={`${styles.expandIcon} ${
                isExpanded ? styles.expanded : ''
              }`}
            />
          )}
        </button>
      ) : (
        <NavLink
          to={item.path}
          className={`${styles.navItem} ${
            isActive ? styles.active : ''
          }`}
          onClick={onCloseMobile}
          title={collapsed ? item.label : undefined}
        >
          <div className={styles.iconBox}>
            <Icon
              size={18}
              className={styles.navIcon}
            />
          </div>

          <span className={styles.navLabel}>
            {item.label}
          </span>
        </NavLink>
      )}

      {/* Invoice submenu */}
      {hasChildren && isExpanded && !collapsed && (
        <div className={styles.subMenu}>
          {item.children.map((child) => {
            const childActive =
              location.pathname === child.path

            return (
              <NavLink
                key={child.path}
                to={child.path}
                className={`${styles.subMenuItem} ${
                  childActive
                    ? styles.subMenuItemActive
                    : ''
                }`}
                onClick={onCloseMobile}
              >
                <span className={styles.subMenuDot} />

                <span>
                  {child.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
})}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <button 
            className={styles.logoutBtn} 
            onClick={() => setShowLogoutModal(true)} 
            title="Logout"
            type="button"
          >
            <LogOut size={18} className={styles.logoutIcon} />
            <span className={styles.logoutLabel}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <Modal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          title="Confirm Sign Out"
          footer={
            <>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={handleConfirmLogout}
              >
                <LogOut size={16} />
                <span>Yes, Logout</span>
              </button>
            </>
          }
        >
          <div className={styles.logoutModalBody}>
            <div className={styles.logoutModalIcon}>
              <LogOut size={24} />
            </div>
            <div>
              <h3 className={styles.logoutModalHeading}>Are you sure you want to logout?</h3>
              <p className={styles.logoutModalText}>
                You will be signed out from your current session in the KG Nanda Hospital dashboard.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}



