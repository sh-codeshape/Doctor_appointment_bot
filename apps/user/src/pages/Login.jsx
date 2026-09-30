import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  UserCheck
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { homeForRole } from '../utils/constants'
import { mockUsers, mockUserPasswords } from '../data/mockData'
import styles from './Login.module.css'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@docbot.com', label: 'Admin' },
  { role: 'Superadmin', email: 'super@kgnanda.com', label: 'Super Admin' },
  { role: 'Doctor', email: 'doctor@kgnanda.com', label: 'Doctor' },
  { role: 'Receptionist', email: 'reception@kgnanda.com', label: 'Reception' },
  { role: 'Pharmacy', email: 'pharmacy@kgnanda.com', label: 'Pharmacy' },
]

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')

  // Redirect if already logged in — to the role home
  if (isAuthenticated) {
    navigate(homeForRole(user?.role), { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const loggedIn = await login(email, password)
      navigate(homeForRole(loggedIn?.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail, roleName) => {
    setEmail(demoEmail)
    setPassword(mockUserPasswords[demoEmail] || '')
    setSelectedRole(roleName || '')
    setError('')
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCardContainer}>
        {/* Left Side: Hospital Image */}
        <div className={styles.imagePanel}>
          <img 
            src="/hospital-building.png" 
            alt="KG Nanda Hospital Building" 
            className={styles.buildingImage}
          />
          <div className={styles.imageOverlay} />
        </div>

        {/* Right Side: Admin Portal Login Form */}
        <div className={styles.formPanel}>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Lock size={22} />
            </div>
            <div>
              <h1 className={styles.title}>KG Nanda Hospital</h1>
              <p className={styles.subtitle}>Dashboard - Whatsapp Booking Management</p>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="login-email">
                Email
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                  id="login-email"
                  className={styles.formInput}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSelectedRole('')
                  }}
                  placeholder="name@hospital.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="login-password">
                Password
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  id="login-password"
                  className={styles.formInput}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security token"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !email || !password}
              id="login-submit"
            >
              <span>{loading ? 'Signing in...' : 'Login'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>

            <div className={styles.securityBadge}>
              <ShieldCheck size={15} />
              <span>End-to-end encrypted hospital network</span>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}

