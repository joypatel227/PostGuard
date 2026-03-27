import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../services/api'

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const [supervisors, setSupervisors] = useState([])
  const [requests, setRequests] = useState([])
  const [codes, setCodes] = useState([])
  const [genLoading, setGenLoading] = useState(false)
  const [newCode, setNewCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchSupervisors = useCallback(async () => {
    try { const r = await api.get('/auth/my-users/'); setSupervisors(r.data) } catch {}
  }, [])
  const fetchRequests = useCallback(async () => {
    try { const r = await api.get('/auth/join-requests/'); setRequests(r.data) } catch {}
  }, [])
  const fetchCodes = useCallback(async () => {
    try { const r = await api.get('/auth/my-codes/'); setCodes(r.data) } catch {}
  }, [])

  useEffect(() => { fetchSupervisors(); fetchRequests(); fetchCodes() }, [fetchSupervisors, fetchRequests, fetchCodes])

  const generateCode = async () => {
    setGenLoading(true); setNewCode(null)
    try { const r = await api.post('/auth/generate-code/'); setNewCode(r.data); fetchCodes() } catch {}
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
      fetchRequests(); fetchSupervisors()
    } catch (e) { setMsg(`❌ ${e.response?.data?.detail || 'Error'}`) }
  }

  const rejectReq = async (id) => {
    try { await api.post(`/auth/join-requests/${id}/reject/`); setMsg('Rejected.'); fetchRequests() } catch {}
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={tab} onTabChange={setTab} />
      <main className="main-content">

        {tab === 'overview' && (
          <>
            <div className="page-header">
              <h1>🛡 Admin Dashboard</h1>
              <p>Manage your supervisors and team</p>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{supervisors.length}</div>
                <div className="stat-label">Supervisors</div>
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
              <div className="card-header"><div className="card-title">Quick Actions</div></div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setTab('requests')}>📋 Review Requests {pendingCount > 0 && `(${pendingCount})`}</button>
                <button className="btn btn-secondary" onClick={() => setTab('codes')}>🔑 Generate Supervisor Code</button>
                <button className="btn btn-secondary" onClick={() => setTab('supervisors')}>👥 View Supervisors</button>
              </div>
            </div>
          </>
        )}

        {tab === 'supervisors' && (
          <>
            <div className="page-header"><h1>👥 Supervisors</h1><p>Supervisors under your management</p></div>
            <div className="card">
              <div className="table-wrap">
                {supervisors.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">👤</div><p>No supervisors yet.</p></div>
                ) : (
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th></tr></thead>
                    <tbody>
                      {supervisors.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.name}</strong></td>
                          <td style={{ color: 'var(--clr-muted)' }}>{s.email}</td>
                          <td style={{ color: 'var(--clr-muted)' }}>{s.phone}</td>
                          <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                          <td style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>{new Date(s.date_joined).toLocaleDateString()}</td>
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
            <div className="page-header"><h1>📋 Join Requests</h1><p>Supervisor requests awaiting approval</p></div>
            {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
            <div className="card">
              <div className="table-wrap">
                {requests.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">📭</div><p>No requests yet.</p></div>
                ) : (
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td style={{ color: 'var(--clr-muted)' }}>{r.email}</td>
                          <td style={{ color: 'var(--clr-muted)' }}>{r.phone}</td>
                          <td style={{ color: 'var(--clr-muted)', fontSize: '0.8rem', maxWidth: 140 }}>{r.message || '—'}</td>
                          <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                          <td>{r.status === 'pending' && (
                            <div className="action-row">
                              <button className="btn btn-success" onClick={() => approveReq(r.id)}>✓</button>
                              <button className="btn btn-danger" onClick={() => rejectReq(r.id)}>✗</button>
                            </div>
                          )}</td>
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
            <div className="page-header"><h1>🔑 Invite Codes</h1><p>Generate codes to onboard supervisors</p></div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Generate Supervisor Code</div>
                  <div className="card-sub">Valid for 48 hours, single-use</div>
                </div>
                <button id="admin-generate-code-btn" className="btn btn-primary" style={{ width: 'auto' }} onClick={generateCode} disabled={genLoading}>
                  {genLoading ? <span className="spinner" /> : '✨'} Generate
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
                  <div className="empty-state"><div className="empty-icon">🔐</div><p>No codes yet.</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>For</th>
                        <th>Status</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map(c => {
                        const isActive = !c.used && new Date(c.expires_at) > new Date()
                        return (
                          <tr key={c.id}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 4 }}>{c.code}</span></td>
                            <td><span className={`badge badge-${c.role_for}`}>{c.role_for}</span></td>
                            <td><span className={`badge ${isActive ? 'badge-pending' : 'badge-approved'}`}>{c.used ? 'Used' : isActive ? 'Active' : 'Expired'}</span></td>
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
                        )
                      })}
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
