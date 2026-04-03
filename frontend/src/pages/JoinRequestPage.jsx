import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function JoinRequestPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', requested_role: 'admin', message: '', raw_password: '', agency: '' })
  const [agencies, setAgencies] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch public list of agencies for selection
    api.get('/company/public-agencies/').then(r => setAgencies(r.data)).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/join-request/', form)
      setSuccess(true)
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.detail ||
        Object.entries(data || {}).map(([k, v]) => `${k}: ${v[0]}`).join(' | ') ||
        'Submission failed. Try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-bg">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
          <h1 className="auth-title">Request Submitted!</h1>
          <p className="auth-sub" style={{ marginBottom: 28 }}>
            Your join request has been sent. You'll be notified once it's approved.
            An account will be created and credentials shared with you.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">PG</div>
          <div className="logo-text">Post<span>Guard</span></div>
        </div>

        <h1 className="auth-title">Request to Join</h1>
        <p className="auth-sub">Submit a request — you'll get access once approved</p>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">I want to join as</label>
            <div className="role-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div
                id="role-admin"
                className={`role-option ${form.requested_role === 'admin' ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, requested_role: 'admin' })}
              >
                <div className="role-icon">👔</div>
                <div className="role-name">Admin</div>
              </div>
              <div
                id="role-supervisor"
                className={`role-option ${form.requested_role === 'supervisor' ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, requested_role: 'supervisor' })}
              >
                <div className="role-icon">🧑‍💼</div>
                <div className="role-name">Supervisor</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input id="jr-name" name="name" className="form-input" placeholder="Your full name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="jr-email" type="email" name="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input id="jr-phone" name="phone" className="form-input" placeholder="+91 9876543210" value={form.phone} onChange={handleChange} required />
          </div>

          {(form.requested_role === 'admin' || form.requested_role === 'supervisor') && (
            <div className="form-group">
              <label className="form-label">Agency</label>
              <select name="agency" className="form-input" value={form.agency} onChange={handleChange} required>
                <option value="">-- Select your Agency --</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password Setup</label>
            <input 
              id="jr-password" 
              type="password" 
              name="raw_password" 
              className="form-input" 
              placeholder="Min 6 characters" 
              value={form.raw_password} 
              onChange={handleChange} 
              required 
              minLength={6}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginTop: 4 }}>
              Set your password now so you can login immediately upon approval.
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Message (optional)</label>
            <textarea
              id="jr-message"
              name="message"
              className="form-input"
              placeholder="Brief note about yourself or your agency..."
              value={form.message}
              onChange={handleChange}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button id="jr-submit-btn" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : '📋'} Submit Request
          </button>
        </form>

        <p className="auth-footer">
          Have an invite code? <Link to="/register">Register here</Link>
          {' · '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
