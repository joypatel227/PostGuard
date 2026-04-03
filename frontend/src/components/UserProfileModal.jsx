import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, login, logout, theme, toggleTheme } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Profile editing
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' })

  // Initialize edit form when opening modal
  useEffect(() => {
    if (user) {
      setEditForm({ name: user.name, email: user.email, phone: user.phone || '' })
    }
  }, [user, isOpen])

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

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await api.put('/auth/me/', editForm)
      // Login method in AuthContext safely updates localStorage/sessionStorage
      login(r.data, { access: sessionStorage.getItem('access_token'), refresh: sessionStorage.getItem('refresh_token') })
      setIsEditing(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile.')
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

        {isEditing ? (
          <form className="card" style={{ padding: 20, marginBottom: 24 }} onSubmit={handleUpdateProfile}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Edit Profile</h3>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Phone</label>
              <input className="form-input" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div className="user-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{user?.name}</h3>
              <p style={{ color: 'var(--clr-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>{user?.email}</p>
              <div className={`badge badge-${user?.role}`} style={{ marginTop: 8 }}>{user?.role}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>Edit</button>
          </div>
        )}

        <div className="card" style={{ padding: 20, marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={logout} style={{ width: '100%' }}>
            🚪 Sign out
          </button>
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
