import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import api from '../services/api'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login/', form)
      const { tokens, user } = res.data
      login(user, tokens)
      // Redirect based on role
      let dest = '/supervisor'
      if (user.role === 'lord') dest = '/lord'
      else if (user.role === 'owner') dest = '/owner'
      else if (user.role === 'admin') dest = '/admin'
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

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">PG</div>
          <div className="logo-text">Post<span>Guard</span></div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to access your security dashboard</p>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : '→'} Sign In
          </button>
        </form>

        <div className="auth-divider">or join the platform</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            to="/register"
            id="goto-register"
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '0.82rem' }}
          >
            🔑 I have an invite code
          </Link>
          <Link
            to="/join-request"
            id="goto-join"
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '0.82rem' }}
          >
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
