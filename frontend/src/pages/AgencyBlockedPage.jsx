import { Link } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function AgencyBlockedPage() {
  const { logout } = useAuth()

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo" style={{ justifyContent: 'center' }}>
          <div className="logo-icon">PG</div>
          <div className="logo-text">Post<span>Guard</span></div>
        </div>
        
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔐</div>
        
        <h1 className="auth-title" style={{ color: 'var(--clr-danger)' }}>Access Restricted</h1>
        <p className="auth-sub" style={{ fontSize: '1.1rem', marginBottom: '32px' }}>
          Your agency access has been suspended or deleted.<br/>
          <strong>Please call your owner for start.</strong>
        </p>

        <div className="card" style={{ padding: '20px', background: 'var(--clr-surface-2)', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--clr-muted)' }}>
            If you believe this is an error, please contact your agency administrator or system support.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={logout} style={{ width: '100%' }}>
          Back to Login
        </button>
      </div>
    </div>
  )
}
