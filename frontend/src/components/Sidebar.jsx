import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import UserProfileModal from './UserProfileModal'

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const navigate = useNavigate()

  const lordItems = [
    { id: 'overview', icon: '🏠', label: 'Overview' },
    { id: 'admins', icon: '👥', label: 'Admins' },
    { id: 'requests', icon: '📋', label: 'Join Requests' },
    { id: 'codes', icon: '🔑', label: 'Invite Codes' },
  ]

  const adminItems = [
    { id: 'overview', icon: '🏠', label: 'Overview' },
    { id: 'supervisors', icon: '👥', label: 'Supervisors' },
    { id: 'requests', icon: '📋', label: 'Join Requests' },
    { id: 'codes', icon: '🔑', label: 'Invite Codes' },
  ]

  const supervisorItems = [
    { id: 'overview', icon: '🏠', label: 'Overview' },
  ]

  const items =
    user?.role === 'lord'
      ? lordItems
      : user?.role === 'admin'
      ? adminItems
      : supervisorItems

  return (
    <>
      <aside className="sidebar">
        <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="logo-icon">PG</div>
          <span className="logo-text">Post<span style={{ color: 'var(--clr-primary)' }}>Guard</span></span>
        </Link>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {items.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip" onClick={() => setIsProfileOpen(true)}>
            <div className="user-avatar">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="user-info">
              <strong>{user?.name}</strong>
              <small style={{ textTransform: 'capitalize' }}>{user?.role}</small>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 14, width: '100%', justifyContent: 'flex-start', paddingLeft: 0 }}
            onClick={logout}
          >
            🚪 Sign out
          </button>
        </div>
      </aside>

      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </>
  )
}
