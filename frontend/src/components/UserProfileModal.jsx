import { useState } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, logout, theme, toggleTheme } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isOpen) return null

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      await api.post('/auth/delete-account/')
      logout()
    } catch (err) {
      alert('Failed to delete account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>User Profile</h2>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1.5rem' }}>&times;</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div className="user-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{user?.name}</h3>
            <p style={{ color: 'var(--clr-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>{user?.email}</p>
            <div className={`badge badge-${user?.role}`} style={{ marginTop: 8 }}>{user?.role}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ display: 'block' }}>Appearance</strong>
              <small style={{ color: 'var(--clr-muted)' }}>Switch between light and dark themes</small>
            </div>
            <button className="btn btn-secondary" onClick={toggleTheme}>
              {theme === 'dark' ? '🌞 Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: 24 }}>
          {!showDeleteConfirm ? (
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => setShowDeleteConfirm(true)}>
              🗑 Delete Account
            </button>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--clr-danger)', fontWeight: 600, marginBottom: 16 }}>
                Are you absolutely sure? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
                  Cancel
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteAccount} disabled={loading}>
                  {loading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
