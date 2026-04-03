import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import api from '../services/api'

export default function RegisterWithCodePage() {
  const [step, setStep] = useState(1)  // 1 = enter code, 2 = fill details, 3 = OTP
  const [form, setForm] = useState({ code: '', name: '', email: '', phone: '', password: '', confirm: '', otp: '', agency_id: '' })
  const [devOtp, setDevOtp] = useState('')   // shows OTP on screen in dev mode
  const [roleContext, setRoleContext] = useState({ role: '', agency: '' })
  const [agencies, setAgencies] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Only used if they are registering as an owner
    api.get('/company/public-agencies/').then(r => setAgencies(r.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const verifyCode = async (e) => {
    e.preventDefault()
    if (form.code.length !== 6) {
      setError('Code must be exactly 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/validate-code/', { code: form.code })
      setRoleContext({ role: res.data.role_for, agency: res.data.agency_name })
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired invite code.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/send-otp/', { phone: form.phone })
      // Dev mode: API returns otp in response for easy testing
      if (res.data?.otp) setDevOtp(res.data.otp)
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Check your phone number.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        otp: form.otp,
        agency_id: form.agency_id
      }
      const res = await api.post('/auth/use-code/', payload)
      const { tokens, user } = res.data
      login(user, tokens)
      let dest = '/supervisor'
      if (user.role === 'lord') dest = '/lord'
      else if (user.role === 'owner') dest = '/owner'
      else if (user.role === 'admin') dest = '/admin'
      navigate(dest, { replace: true })
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.detail ||
        Object.entries(data || {}).map(([k, v]) => `${k}: ${v[0]}`).join(' | ') ||
        'Registration failed.'
      )
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

        <h1 className="auth-title">Join PostGuard</h1>
        <p className="auth-sub">
          {step === 1 && 'Enter your unique 6-digit invite code'}
          {step === 2 && (
            <span>
              Registering as <strong>{roleContext.role}</strong>
              {roleContext.agency && ` for ${roleContext.agency}`}
            </span>
          )}
          {step === 3 && `Verify your phone number: ${form.phone}`}
        </p>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        {step === 1 && (
          <form onSubmit={verifyCode}>
            <div className="form-group">
              <label className="form-label">Invite Code</label>
              <input
                id="invite-code-input"
                name="code"
                className="form-input code-input"
                placeholder="A1B2C3"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                maxLength={6}
                required
                autoFocus
              />
            </div>
            <button id="verify-code-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Continue →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSendOtp}>
            {roleContext.role === 'owner' && (
              <div className="form-group">
                <label className="form-label">Assign to Agency</label>
                <select name="agency_id" className="form-input" value={form.agency_id} onChange={handleChange} required>
                  <option value="">-- Select Agency --</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginTop: 4 }}>
                  You must select the agency that the Lord created for you.
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input id="reg-name" name="name" className="form-input" placeholder="Your full name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input id="reg-email" type="email" name="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input id="reg-phone" name="phone" className="form-input" placeholder="+91 9876543210" value={form.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="reg-password" type="password" name="password" className="form-input" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input id="reg-confirm" type="password" name="confirm" className="form-input" placeholder="Repeat password" value={form.confirm} onChange={handleChange} required />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 0.4 }} onClick={() => setStep(1)}>Back</button>
              <button id="reg-next-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Register'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit}>
            {devOtp && (
              <div className="alert alert-info" style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: '0.75rem', marginBottom: 4, opacity: 0.8 }}>🔧 DEV MODE — Your OTP</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: 10, color: 'var(--clr-accent)' }}>{devOtp}</div>
                <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.7 }}>Also printed in Django console. Remove in production.</div>
              </div>
            )}
            <div className="form-group" style={{ textAlign: 'center' }}>
              <label className="form-label">Verification Code (OTP)</label>
              <input
                id="reg-otp"
                name="otp"
                className="form-input code-input"
                placeholder="000000"
                value={form.otp}
                onChange={handleChange}
                maxLength={6}
                required
                autoFocus
                style={{ letterSpacing: 12 }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginTop: 12 }}>
                We've sent a 6-digit code to your phone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 0.4 }} onClick={() => setStep(2)}>Back</button>
              <button id="reg-submit-btn" type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Verify & Finish'}
              </button>
            </div>
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
