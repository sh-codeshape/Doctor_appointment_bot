import { AppError } from './errorHandler.js'

/**
 * Role-based access control.
 * authMiddleware runs first (sets req.admin = { id, email, role, doctorId, staffCode }).
 * requireRole blocks anything not listed — including legacy/unknown roles
 * (e.g. leftover 'staff'), which get a 403, never a silent pass.
 *
 * Permission matrix (see docs/implementation-plan.md §5.2):
 * - superadmin: everything (incl. /users, /settings)
 * - admin: everything operational + /users (staff mgmt), no /settings
 * - doctor: own bookings/patients only (scoped from JWT doctorId)
 * - receptionist: patients + bookings + register + medicine-orders read-only
 * - pharmacy: medicine-orders full + patient read
 */
export function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.admin?.role
    if (!role || !allowed.includes(role)) {
      return next(new AppError(`Forbidden: ${role || 'unknown'} cannot access this resource`, 403))
    }
    next()
  }
}

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  PHARMACY: 'pharmacy',
  ASSISTANT_DOCTOR: 'assistant_doctor',
}
