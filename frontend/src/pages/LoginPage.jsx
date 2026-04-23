import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import api from '../services/api'

export default function LoginPage() {
  const [mode, setMode] = useState('admin') // 'admin' | 'guard'
  const [form, setForm] = useState({ email: '', password: '', phone: '', otp: '' })
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login/', { email: form.email, password: form.password })
      const { tokens, user } = res.data
      login(user, tokens)
      let dest = '/supervisor'
      if (user.role === 'lord') dest = '/lord'
      else if (user.role === 'owner') dest = '/owner'
      else if (user.role === 'admin') dest = '/admin'
      else if (user.role === 'client') dest = '/client'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})?.[0]?.[0] ||
        'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }
  
  const handleGuardOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (!otpSent) {
        const res = await api.post('/auth/guard-send-otp/', { phone: form.phone })
        setOtpSent(true)
        setMessage(res.data.detail || 'OTP sent! Please enter it below.')
        
        // DEV ONLY: Auto-fill OTP if present in response
        if (res.data.otp) {
          setForm(prev => ({ ...prev, otp: res.data.otp }))
        }
      } else {
        const res = await api.post('/auth/guard-verify-otp/', { phone: form.phone, otp: form.otp })
        const { tokens, user, guard_id } = res.data
        // Store guard_id in session if needed or just use user data
        login(user, tokens)
        navigate('/guard-dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed process. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">PG</div>
          <div className="logo-text">Post<span>Guard</span></div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to access your security dashboard</p>

        {/* --- Toggle --- */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '10px' }}>
          <button type="button" onClick={() => { setMode('admin'); setError(''); setMessage(''); setForm({email:'',password:'',phone:'',otp:''}) }} style={{ flex: 1, padding: '10px', border: 'none', background: mode === 'admin' ? 'rgba(124,92,255,0.2)' : 'transparent', color: mode === 'admin' ? '#7C5CFF' : 'var(--clr-muted)', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>Manager Login</button>
          <button type="button" onClick={() => { setMode('guard'); setError(''); setMessage(''); setForm({email:'',password:'',phone:'',otp:''}); setOtpSent(false) }} style={{ flex: 1, padding: '10px', border: 'none', background: mode === 'guard' ? 'rgba(0,229,160,0.2)' : 'transparent', color: mode === 'guard' ? '#00E5A0' : 'var(--clr-muted)', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>Guard Login</button>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}
        {message && <div className="alert alert-success" style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>✓ {message}</div>}

        {mode === 'admin' ? (
          <form onSubmit={handleAdminSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input id="email" type="email" name="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="password" type="password" name="password" className="form-input" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <button id="login-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : '→'} Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleGuardOTP}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input id="phone" type="text" name="phone" className="form-input" placeholder="e.g. 9876543210" value={form.phone} onChange={handleChange} required autoFocus disabled={otpSent} />
            </div>
            {otpSent && (
              <div className="form-group animate-fadeIn">
                <label className="form-label">Enter OTP</label>
                <input id="otp" type="text" name="otp" className="form-input" placeholder="6-digit code" value={form.otp} onChange={handleChange} required autoFocus />
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <button type="button" onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: '#00E5A0', fontSize: '0.75rem', cursor: 'pointer' }}>Change Number</button>
                </div>
              </div>
            )}
            <button id="guard-submit" type="submit" className="btn btn-primary" disabled={loading} style={{ background: 'var(--grad-success)' }}>
              {loading ? <span className="spinner" /> : '→'} {otpSent ? 'Verify OTP & Login' : 'Send OTP'}
            </button>
          </form>
        )}

        <div className="auth-divider">or join the platform</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/register" id="goto-register" className="btn btn-secondary" style={{ flex: 1, fontSize: '0.82rem' }}>
            🔑 I have an invite code
          </Link>
          <Link to="/join" id="goto-join" className="btn btn-secondary" style={{ flex: 1, fontSize: '0.82rem' }}>
            📋 Request to join
          </Link>
        </div>

        <p className="auth-footer" style={{ marginTop: 20, fontSize: '0.75rem' }}>
          PostGuard Security Agency Platform
        </p>
      </div>
    </div>
  )
}

