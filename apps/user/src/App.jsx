import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Doctors from './pages/Doctors'
import Hospitalization from './pages/Hospitalization'
import MedicineOrders from './pages/MedicineOrders'
import Patients from './pages/Patients'
import MyPatients from './pages/MyPatients'
import Register from './pages/Register'
import Staff from './pages/Staff'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Login from './pages/Login'
import PrescriptionPage from './pages/PrescriptionPage'
import ManualPrescriptionPage from './pages/ManualPrescriptionPage'
import { useAuth } from './hooks/useAuth'
import { homeForRole, ALL_STAFF } from './utils/constants'
import './App.css'
import Prescription from './pages/Invoices/Prescription/Prescription'
import HospitalBill from './pages/Invoices/HospitalBill/HospitalBill'
import DischargeSummary from './pages/Invoices/DischargeSummary/DischargeSummary'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

/**
 * Role guard — mirrors the backend permission matrix (docs/implementation-plan.md §5.2).
 * Frontend hiding is UX only; the API is the real enforcer.
 */
function RequireRole({ roles, children }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user?.role)} state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RequireRole roles={['superadmin', 'admin']}><Dashboard /></RequireRole>} />
        <Route path="appointments" element={<RequireRole roles={['superadmin', 'admin', 'doctor', 'receptionist']}><Appointments /></RequireRole>} />
        <Route path="hospitalization" element={<RequireRole roles={['superadmin', 'admin', 'receptionist']}><Hospitalization /></RequireRole>} />
        <Route
          path="invoices"
          element={<Navigate to="/invoices/prescriptions" replace />}
        />

        <Route
          path="invoices/prescriptions"
          element={
            <RequireRole roles={['superadmin', 'admin', 'doctor', 'receptionist']}>
              <Prescription />
            </RequireRole>
          }
        />

<Route
  path="invoices/hospital-bills"
  element={
    <RequireRole roles={['superadmin', 'admin', 'receptionist']}>
      <HospitalBill />
    </RequireRole>
  }
/>

<Route
  path="invoices/discharge-summaries"
  element={
    <RequireRole roles={['superadmin', 'admin', 'receptionist']}>
      <DischargeSummary />
    </RequireRole>
  }
/>

        <Route path="medicine-orders" element={<RequireRole roles={['superadmin', 'admin', 'pharmacy', 'receptionist', 'doctor']}><MedicineOrders /></RequireRole>} />
        <Route path="doctors" element={<RequireRole roles={['superadmin', 'admin']}><Doctors /></RequireRole>} />
        <Route path="patients" element={<RequireRole roles={['superadmin', 'admin', 'receptionist', 'pharmacy']}><Patients /></RequireRole>} />
        <Route path="my-patients" element={<RequireRole roles={['doctor', 'admin', 'superadmin']}><MyPatients /></RequireRole>} />
        <Route path="prescribe/:bookingId" element={<RequireRole roles={['doctor', 'admin', 'superadmin']}><PrescriptionPage /></RequireRole>} />
        <Route path="manual-prescribe" element={<RequireRole roles={['doctor', 'admin', 'superadmin']}><ManualPrescriptionPage /></RequireRole>} />
        <Route path="register" element={<RequireRole roles={['superadmin', 'admin', 'receptionist']}><Register /></RequireRole>} />
        <Route path="staff" element={<RequireRole roles={['superadmin']}><Staff /></RequireRole>} />
        <Route path="reports" element={<RequireRole roles={['superadmin', 'admin']}><Reports /></RequireRole>} />
        <Route path="settings" element={<RequireRole roles={['superadmin']}><Settings /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
