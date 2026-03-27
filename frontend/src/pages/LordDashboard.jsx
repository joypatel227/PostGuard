import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../services/api'
import { useAuth } from '../components/AuthContext'

export default function LordDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [admins, setAdmins] = useState([])
  const [requests, setRequests] = useState([])
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [newCode, setNewCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchAdmins = useCallback(async () => {
    try { const r = await api.get('/auth/my-users/'); setAdmins(r.data) } catch {}
  }, [])

  const fetchRequests = useCallback(async () => {
    try { const r = await api.get('/auth/join-requests/'); setRequests(r.data) } catch {}
  }, [])

  const fetchCodes = useCallback(async () => {
    try { const r = await api.get('/auth/my-codes/'); setCodes(r.data) } catch {}
  }, [])

  useEffect(() => {
    fetchAdmins()
    fetchRequests()
    fetchCodes()
  }, [fetchAdmins, fetchRequests, fetchCodes])

  const generateCode = async () => {
    setGenLoading(true)
    setNewCode(null)
    try {
      const r = await api.post('/auth/generate-code/')
      setNewCode(r.data)
      fetchCodes()
    } catch {}
    setGenLoading(false)
  }

  const copyCode = (codeStr) => {
    navigator.clipboard.writeText(codeStr)
    setMsg('📋 Code copied to clipboard!')
    setTimeout(() => setMsg(''), 2000)
  }

  const deleteCode = async (id) => {
    if (!window.confirm('Are you sure you want to delete this active code?')) return
    try {
      await api.delete(`/auth/codes/${id}/`)
      setMsg('🗑 Code deleted.')
      fetchCodes()
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.detail || 'Error deleting code'}`)
    }
  }

  const approveReq = async (id) => {
    try {
      const r = await api.post(`/auth/join-requests/${id}/approve/`)
      setMsg(`✅ Approved! Temp password: ${r.data.temp_password}`)
      fetchRequests()
      fetchAdmins()
    } catch (e) {
      setMsg(`❌ ${e.response?.data?.detail || 'Error'}`)
    }
  }

  const rejectReq = async (id) => {
    try {
      await api.post(`/auth/join-requests/${id}/reject/`)
      setMsg('Request rejected.')
      fetchRequests()
    } catch {}
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={tab} onTabChange={setTab} />
      <main className="main-content">

        {tab === 'overview' && (
          <>
            <div className="page-header">
              <h1>⚡ Lord Dashboard</h1>
              <p>Full control over the PostGuard platform</p>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{admins.length}</div>
                <div className="stat-label">Total Admins</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-label">Pending Requests</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{codes.filter(c => !c.used).length}</div>
                <div className="stat-label">Active Codes</div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Quick Actions</div>
                  <div className="card-sub">Common lord actions</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setTab('requests')}>📋 Review Join Requests {pendingCount > 0 && `(${pendingCount})`}</button>
                <button className="btn btn-secondary" onClick={() => setTab('codes')}>🔑 Generate Admin Code</button>
                <button className="btn btn-secondary" onClick={() => setTab('admins')}>👥 View All Admins</button>
              </div>
            </div>
          </>
        )}

        {tab === 'admins' && (
          <>
            <div className="page-header">
              <h1>👥 Admins</h1>
              <p>All admin accounts on the platform</p>
            </div>
            <div className="card">
              <div className="table-wrap">
                {admins.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">👤</div><p>No admins yet. Generate an invite code to add one.</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th></tr>
                    </thead>
                    <tbody>
                      {admins.map(a => (
                        <tr key={a.id}>
                          <td><strong>{a.name}</strong></td>
                          <td style={{ color: 'var(--clr-muted)' }}>{a.email}</td>
                          <td style={{ color: 'var(--clr-muted)' }}>{a.phone}</td>
                          <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                          <td style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>{new Date(a.date_joined).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'requests' && (
          <>
            <div className="page-header">
              <h1>📋 Join Requests</h1>
              <p>People requesting admin access</p>
            </div>
            {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
            <div className="card">
              <div className="table-wrap">
                {requests.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">📭</div><p>No join requests yet.</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td style={{ color: 'var(--clr-muted)' }}>{r.email}</td>
                          <td style={{ color: 'var(--clr-muted)' }}>{r.phone}</td>
                          <td style={{ color: 'var(--clr-muted)', fontSize: '0.8rem', maxWidth: 160 }}>{r.message || '—'}</td>
                          <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                          <td>
                            {r.status === 'pending' && (
                              <div className="action-row">
                                <button className="btn btn-success" onClick={() => approveReq(r.id)}>✓ Approve</button>
                                <button className="btn btn-danger" onClick={() => rejectReq(r.id)}>✗ Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'codes' && (
          <>
            <div className="page-header">
              <h1>🔑 Invite Codes</h1>
              <p>Generate 6-letter codes to onboard admins directly</p>
            </div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Generate New Admin Code</div>
                  <div className="card-sub">Code expires in 48 hours and can only be used once</div>
                </div>
                <button id="generate-code-btn" className="btn btn-primary" style={{ width: 'auto' }} onClick={generateCode} disabled={genLoading}>
                  {genLoading ? <span className="spinner" /> : '✨'} Generate Code
                </button>
              </div>
              {newCode && (
                <div className="code-display">
                  <span className="code-value">{newCode.code}</span>
                  <button className="copy-btn" onClick={() => copyCode(newCode.code)}>📋 Copy</button>
                </div>
              )}
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Code History</div></div>
              <div className="table-wrap">
                {codes.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">🔐</div><p>No codes generated yet.</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Code</th><th>For</th><th>Status</th><th>Expires</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {codes.map(c => {
                        const isActive = !c.used && new Date(c.expires_at) > new Date()
                        return (
                          <tr key={c.id}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 4 }}>{c.code}</span></td>
                            <td><span className={`badge badge-${c.role_for}`}>{c.role_for}</span></td>
                            <td>
                              <span className={`badge ${isActive ? 'badge-pending' : 'badge-approved'}`}>
                                {c.used ? 'Used' : isActive ? 'Active' : 'Expired'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>{new Date(c.expires_at).toLocaleString()}</td>
                            <td>
                              <div className="action-row">
                                <button className="btn btn-ghost" onClick={() => copyCode(c.code)} title="Share/Copy">🔗</button>
                                {isActive && (
                                  <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => deleteCode(c.id)} title="Delete Active Code">🗑</button>
                                )}
                              </div>
                            </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
