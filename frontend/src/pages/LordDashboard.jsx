import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  AreaChart, Area, ResponsiveContainer, Tooltip 
} from 'recharts'
import { 
  Search, Plus, Check, X, 
  ArrowUpRight, Users as UsersIcon, Building2, 
  UserCheck, Info, Key, LayoutDashboard
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import api from '../services/api'
import { useAuth } from '../components/AuthContext'

export default function LordDashboard() {
  const { user } = useAuth()
  const { tab: urlTab } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(() => urlTab || sessionStorage.getItem('lord_active_tab') || 'overview')
  
  useEffect(() => {
    setTab(urlTab || 'overview')
  }, [urlTab])

  useEffect(() => {
    sessionStorage.setItem('lord_active_tab', tab)
  }, [tab])
  const [admins, setAdmins] = useState([])
  const [codes, setCodes] = useState([])
  const [agencies, setAgencies] = useState([])
  const [totalNetwork, setTotalNetwork] = useState(0)
  const [agencyCount, setAgencyCount] = useState(0)
  const [liveNetwork, setLiveNetwork] = useState(0)
  const [liveUserList, setLiveUserList] = useState([])
  const [trends, setTrends] = useState({ agencies: [], users: [], live: [] })
  const [loading, setLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [showAddAgency, setShowAddAgency] = useState(false)
  const [newAgencyForm, setNewAgencyForm] = useState({ name: '' })
  const [showAddOwner, setShowAddOwner] = useState(false)
  const [newOwnerForm, setNewOwnerForm] = useState({ name: '', email: '', phone: '', password: '', agency_id: '' })
  const [openMenu, setOpenMenu] = useState(null)
  const [newCode, setNewCode] = useState(null)
  const [codeFilter, setCodeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  // ── Mobile-Style Back Button Logic ───────────────────────────────────────────
  const backState = useRef({ formsOpen: false, tab: 'overview' })
  const lastBackPress = useRef(0)

  useEffect(() => {
    backState.current = { formsOpen: !!(showAddAgency || showAddOwner), tab: tab }
  }, [showAddAgency, showAddOwner, tab])

  useEffect(() => {
    window.history.pushState({ active_dashboard: true }, '')
    const handlePop = () => {
      const state = backState.current
      if (state.formsOpen) {
        setShowAddAgency(false)
        setShowAddOwner(false)
        window.history.pushState({ active_dashboard: true }, '') 
        return
      }
      if (state.tab !== 'overview') {
        setTab('overview')
        window.history.pushState({ active_dashboard: true }, '')
        return
      }
      const now = Date.now()
      if (now - lastBackPress.current < 2000) {
        window.history.back()
        return
      } else {
        lastBackPress.current = now
        showToast('Press Back again to exit')
        window.history.pushState({ active_dashboard: true }, '')
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])
  // ───────────────────────────────────────────────────────────────────────────

  const showToast = (text) => {
    setToast('')
    // Force remount so animation replays
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setToast(text))
    })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  const fetchAdmins = useCallback(async () => {
    try { const r = await api.get('/auth/my-users/'); setAdmins(r.data) } catch {}
  }, [])

  const fetchCodes = useCallback(async () => {
    try { const r = await api.get('/auth/my-codes/'); setCodes(r.data) } catch {}
  }, [])

  const fetchAgencies = useCallback(async () => {
    try { const r = await api.get('/company/agencies/'); setAgencies(r.data) } catch {}
  }, [])

  const fetchNetworkStats = useCallback(async () => {
    try { 
      const r = await api.get('/auth/lord-stats/')
      setTotalNetwork(r.data.total_network) 
      setAgencyCount(r.data.agency_count)
      setLiveNetwork(r.data.live_users || 0)
      setLiveUserList(r.data.live_user_list || [])
      
      setTrends(prev => {
        const liveHistory = prev.live || []
        const newLive = [...liveHistory, { value: r.data.live_users || 0 }].slice(-15)
        return {
          agencies: r.data.charts?.agencies || [],
          users: r.data.charts?.users || [],
          live: newLive
        }
      })
    } catch {}
  }, [])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Lightweight heartbeat to keep session 'Live'
  const sendHeartbeat = useCallback(async () => {
    try { await api.post('/auth/heartbeat/') } catch {}
  }, [])

  // Auto-refresh logic
  useEffect(() => {
    fetchAdmins(); fetchAgencies(); fetchNetworkStats();
    fetchCodes();
    
    // Heartbeat every 5 seconds (Lightweight)
    const hInterval = setInterval(sendHeartbeat, 5000)
    
    // Stats update every 15 seconds (Heavy Trends)
    const sInterval = setInterval(() => {
      fetchNetworkStats();
      fetchCodes();
    }, 15000)
    
    return () => {
      clearInterval(hInterval)
      clearInterval(sInterval)
    }
  }, [tab, sendHeartbeat, fetchNetworkStats, fetchCodes])

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
    showToast('📋 Copied to clipboard!')
  }

  const deleteCode = async (id) => {
    if (!window.confirm('Delete this active code? It can no longer be used.')) return
    // Remove instantly from UI before the API call
    setCodes(prev => prev.filter(c => c.id !== id))
    if (newCode?.id === id) setNewCode(null)
    try {
      await api.delete(`/auth/codes/${id}/delete/`)
      showToast('🗑️ Invite Code Successfully Deleted!')
      fetchCodes()
    } catch (e) {
      // Restore on failure by refetching
      fetchCodes()
      setMsg(`❌ ${e.response?.data?.detail || 'Error deleting code'}`)
    }
  }



  const handleCreateAgency = async (e) => {
    e.preventDefault()
    try {
      await api.post('/company/agencies/', newAgencyForm)
      showToast('🏢 Agency added successfully!')
      setShowAddAgency(false)
      setNewAgencyForm({ name: '' })
      fetchAgencies()
    } catch (e) {
      showToast('❌ Failed to add agency.')
    }
  }

  const handleCreateOwner = async (e) => {
    e.preventDefault()
    
    // Phone validation
    const phoneRegex = /^(\d{10}|\+\d{8,15})$/
    if (!phoneRegex.test(newOwnerForm.phone.replace(/[\s-]/g, ''))) {
      showToast('❌ Invalid phone. Use 10 digits or +CountryCode')
      return
    }

    try {
      await api.post('/auth/create-owner/', newOwnerForm)
      showToast('👥 Owner created successfully!')
      setShowAddOwner(false)
      setNewOwnerForm({ name: '', email: '', phone: '', password: '', agency_id: '' })
      fetchAdmins()
    } catch (e) {
      const eMsg = e.response?.data?.detail || 'Registration failed'
      showToast(`❌ ${eMsg}`)
    }
  }

  const handleDeleteAgency = async (id) => {
    if (!window.confirm("Are you sure? This will delete the agency and ALL owners, supervisors, guards, and sites under it!")) return
    try {
      await api.delete(`/company/agencies/${id}/`)
      showToast('🏢 Agency & All Data Successfully Deleted!')
      fetchAgencies()
    } catch {
      showToast('❌ Failed to delete agency')
    }
  }

  const handleDeleteOwner = async (id) => {
    if (!window.confirm("Are you sure? This will delete this owner and ALL data associated with them!")) return
    try {
      await api.delete(`/auth/users/${id}/delete/`)
      showToast('👤 Owner Account Successfully Deleted!')
      fetchAdmins()
    } catch {
      showToast('❌ Failed to delete owner')
    }
  }


  const renderAvatar = (name) => (
    <div className="avatar-circle" style={{ 
      background: 'var(--grad-primary)',
      fontSize: '0.8rem',
      width: '32px',
      height: '32px'
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )

  const sparklineData = [
    { value: 400 }, { value: 300 }, { value: 600 }, { value: 800 }, 
    { value: 500 }, { value: 900 }, { value: 1100 }
  ]

  const isOnline = (lastSeen) => {
    if (!lastSeen) return false
    const lastDate = new Date(lastSeen)
    const diffMins = (new Date() - lastDate) / (1000 * 60)
    return diffMins < 5
  }

  const renderStatusOrb = (lastSeen) => {
    const online = isOnline(lastSeen)
    return (
      <div className={`status-orb ${online ? 'online pulsing' : 'offline'}`} 
        title={online ? 'Online now' : 'Offline'} 
      />
    )
  }

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={tab} onTabChange={setTab} />
      <main className="main-content">

        {tab === 'overview' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <h1>⚡ Lord Dashboard</h1>
              <p>Full control over the PostGuard platform</p>
            </div>
            
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {[
                { label: 'Total Agencies', value: agencyCount, color: '#5B8CFF', data: trends.agencies },
                { label: 'Total Network', value: totalNetwork, color: '#7C5CFF', data: trends.users },
                { label: 'Live Now', value: liveNetwork, color: '#00E5A0', isLive: true, data: trends.live, sub: liveUserList }
              ].map((stat, i) => (
                <div key={i} className="stat-card glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-label">
                        {stat.label}
                        {stat.isLive && (
                          <span className="live-indicator-dot pulsing" style={{ marginLeft: '8px', display: 'inline-block', width: '8px', height: '8px', background: '#00E5A0', borderRadius: '50%' }} />
                        )}
                      </div>
                      <div className="stat-value count-up-pop" key={stat.value} style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '8px', display: 'inline-block' }}>
                        {stat.value}
                      </div>
                      {stat.isLive && stat.sub && stat.sub.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex' }}>
                            {stat.sub.map((u, idx) => (
                              <div key={u.id} title={`${u.name} (${u.role})`} style={{ 
                                width: '24px', height: '24px', 
                                borderRadius: '50%', background: 'var(--grad-primary)', 
                                border: '2px solid var(--clr-bg)', marginLeft: idx === 0 ? 0 : '-8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff'
                              }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <small style={{ color: 'var(--clr-muted)', fontSize: '0.75rem' }}>
                            {stat.sub.length === 1 ? '1 user is online' : `${stat.sub.length} users are online`}
                          </small>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                      <ArrowUpRight size={20} style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div style={{ flex: 1, marginTop: '16px', minHeight: '60px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stat.data && stat.data.length > 0 ? stat.data : []}>
                        <defs>
                          <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={stat.color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={stat.color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke={stat.color} 
                          strokeWidth={2.5} 
                          fill={`url(#grad-${i})`} 
                          isAnimationActive={true}
                          dot={{ r: 0 }}
                          activeDot={{ r: 4, fill: stat.color, stroke: '#fff', strokeWidth: 2 }}
                        />
                        <Tooltip 
                          cursor={{ stroke: stat.color, strokeWidth: 1, strokeDasharray: '4 4' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="glass-card" style={{ padding: '4px 8px', fontSize: '0.75rem', border: `1px solid ${stat.color}`, backdropFilter: 'blur(10px)' }}>
                                  {payload[0].value}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>

            <div className="card glass-card" style={{ marginTop: '32px' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Quick Actions</div>
                  <div className="card-sub">Common platform management tasks</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button className="pill-btn btn-glow" onClick={() => navigate('/lord/codes')}>
                  <Key size={18} /> Generate Owner Code
                </button>
                <button className="pill-btn btn-glow" onClick={() => navigate('/lord/admins')}>
                  <UsersIcon size={18} /> View All Owners
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'agencies' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1>🏢 Agencies</h1>
                <p>Registered agencies on the platform</p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="search-input-wrap">
                  <Search size={18} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search agencies..." 
                    className="search-input" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary btn-glow" onClick={() => setShowAddAgency(true)}>
                  <Plus size={18} /> Add Agency
                </button>
              </div>
            </div>

            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                {agencies.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon" style={{ opacity: 0.2 }}><Building2 size={64} /></div>
                    <p>No agencies found.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '20px 24px' }}>AGENCY NAME</th>
                        <th>CREATED AT</th>
                        <th style={{ width: 150 }}>TOTAL OWNERS</th>
                        <th style={{ width: 80, textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agencies
                        .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
                        .map(a => (
                        <tr key={a.id} className="table-row-hover">
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {renderAvatar(a.name)}
                              <strong style={{ fontSize: '1rem' }}>{a.name}</strong>
                            </div>
                          </td>
                          <td style={{ color: 'var(--clr-muted)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="badge badge-admin" style={{ opacity: 0.8 }}>
                              {admins.filter(ow => ow.agency_id === a.id).length} Owners
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                            <div style={{ position: 'relative' }}>
                              <button 
                                className="btn-icon" 
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `ag-${a.id}` ? null : `ag-${a.id}`) }}
                              >
                                ⋮
                              </button>
                              {openMenu === `ag-${a.id}` && (
                                <div className="dropdown-menu glass-card animate-fadeIn" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: '180px' }}>
                                  <button onClick={() => handleDeleteAgency(a.id)} style={{ color: 'var(--clr-danger)', padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <X size={14} /> Delete Agency
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'admins' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1>👥 Owners</h1>
                <p>All owner accounts on the platform</p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="search-input-wrap">
                  <Search size={18} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search owners..." 
                    className="search-input" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary btn-glow" onClick={() => setShowAddOwner(true)}>
                  <Plus size={18} /> Add Owner
                </button>
              </div>
            </div>

            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                {admins.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon" style={{ opacity: 0.2 }}><UsersIcon size={64} /></div>
                    <p>No owners found.</p>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '20px 24px' }}>NAME</th>
                        <th>CONTACT</th>
                        <th>AGENCY</th>
                        <th>STATUS</th>
                        <th>JOINED</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins
                        .filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()))
                        .map(a => (
                        <tr key={a.id} className="table-row-hover">
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ position: 'relative' }}>
                                {renderAvatar(a.name)}
                                {renderStatusOrb(a.last_seen)}
                              </div>
                              <div>
                                <strong style={{ display: 'block' }}>{a.name}</strong>
                                <small style={{ color: 'var(--clr-muted)' }}>{a.role.toUpperCase()}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>{a.email}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>{a.phone}</div>
                          </td>
                          <td><strong>{a.agency_name || '—'}</strong></td>
                          <td>
                            <span className="badge badge-approved" style={{ 
                              background: 'rgba(0, 229, 160, 0.1)', 
                              color: 'var(--clr-success)',
                              boxShadow: '0 0 10px rgba(0, 229, 160, 0.1)'
                            }}>
                              <Check size={12} style={{ marginRight: '4px' }} /> APPROVED
                            </span>
                          </td>
                          <td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>{new Date(a.date_joined).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                            <div style={{ position: 'relative' }}>
                              <button 
                                className="btn-icon" 
                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `own-${a.id}` ? null : `own-${a.id}`) }}
                              >
                                ⋮
                              </button>
                              {openMenu === `own-${a.id}` && (
                                <div className="dropdown-menu glass-card animate-fadeIn" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: '160px' }}>
                                  <button onClick={() => handleDeleteOwner(a.id)} style={{ color: 'var(--clr-danger)', padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <X size={14} /> Delete Owner
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'codes' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <h1>🔑 Invite Codes</h1>
              <p>Generate 6-letter codes to onboard new Agency Owners</p>
            </div>

            <div className="card glass-card" style={{ padding: '32px' }}>
              <div className="card-header" style={{ marginBottom: 0, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Generate New Owner Code</div>
                  <div className="card-sub" style={{ color: 'var(--clr-muted)' }}>Generate securely. Code expires in 48 hours.</div>
                </div>
                <button 
                  id="generate-code-btn" 
                  className="btn btn-primary btn-glow" 
                  style={{ minWidth: '160px', borderRadius: '12px', height: '48px' }} 
                  onClick={generateCode} 
                  disabled={genLoading}
                >
                  {genLoading ? <span className="spinner" /> : '✨ Generate Code'}
                </button>
              </div>
              {newCode && (
                <div className="code-display glass-card" style={{ marginTop: '24px', background: 'rgba(124, 92, 255, 0.05)', border: '1px dashed var(--clr-primary)' }}>
                  <span className="code-value monospace-code" style={{ letterSpacing: '12px' }}>
                    {newCode.code.split('').join(' ')}
                  </span>
                  <button className="copy-btn btn-glow" onClick={() => copyCode(newCode.code)}>📋 Copy</button>
                </div>
              )}
            </div>

            <div className="page-header" style={{ marginTop: '48px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h2>Code History</h2>
                <p>Manage and track all generated invitation codes</p>
              </div>
              <div className="tab-pills" style={{ display: 'flex', gap: '8px', background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '12px' }}>
                {['all', 'active', 'used'].map(f => (
                  <button 
                    key={f} 
                    className={`pill-btn ${codeFilter === f ? 'active' : ''}`}
                    onClick={() => setCodeFilter(f)}
                    style={{ 
                      padding: '8px 16px', 
                      borderRadius: '8px', 
                      border: 'none', 
                      background: codeFilter === f ? 'var(--clr-primary)' : 'transparent',
                      color: codeFilter === f ? '#fff' : 'var(--clr-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                {codes.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">🔐</div><p>No codes generated yet.</p></div>
                ) : (
                  <table style={{ borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '20px 24px' }}>CODE</th>
                        <th>FOR</th>
                        <th>AGENCY</th>
                        <th>STATUS</th>
                        <th>EXPIRES</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes
                        .filter(c => {
                          if (codeFilter === 'all') return true
                          if (codeFilter === 'used') return c.used
                          const isActive = !c.used && new Date(c.expires_at) > new Date()
                          return codeFilter === 'active' ? isActive : true
                        })
                        .map(c => {
                          const isActive = !c.used && new Date(c.expires_at) > new Date()
                          return (
                            <tr key={c.id} className="table-row-hover">
                              <td style={{ padding: '20px 24px' }}>
                                <span className="monospace-code" style={{ fontSize: '1.1rem', color: 'var(--clr-text)' }}>
                                  {c.code.split('').join(' ')}
                                </span>
                              </td>
                              <td><span className={`badge badge-${c.role_for}`} style={{ fontSize: '0.65rem' }}>{c.role_for}</span></td>
                              <td><strong style={{ color: 'var(--clr-text)', opacity: 0.9 }}>{c.agency_name || '—'}</strong></td>
                              <td>
                                <span className={`badge ${isActive ? 'badge-approved' : c.used ? 'badge-primary' : 'badge-rejected'}`} 
                                  style={{ 
                                    padding: '4px 12px', 
                                    boxShadow: isActive ? '0 0 10px rgba(0, 229, 160, 0.2)' : 'none' 
                                  }}>
                                  {c.used ? 'Used' : isActive ? 'Active' : 'Expired'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>{new Date(c.expires_at).toLocaleString()}</td>
                              <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                <div className="action-row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                  <button className="btn-icon" onClick={() => copyCode(c.code)} title="Copy Code">📋</button>
                                  {isActive && (
                                    <button className="btn-icon btn-icon-danger" onClick={() => deleteCode(c.id)} title="Delete Code">🗑</button>
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
          </div>
        )}
      </main>

      {/* Add Agency Modal */}
      {showAddAgency && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: 16 }}>Add New Agency</h2>
            <form onSubmit={handleCreateAgency}>
              <div className="form-group">
                <label className="form-label">Agency Name</label>
                <input 
                  autoFocus
                  required 
                  className="form-input" 
                  placeholder="e.g. Shield Security Co." 
                  value={newAgencyForm.name} 
                  onChange={e => setNewAgencyForm({ ...newAgencyForm, name: e.target.value })} 
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddAgency(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Agency</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Owner Modal */}
      {showAddOwner && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: 16 }}>Create Owner Account</h2>
            <form onSubmit={handleCreateOwner}>
              <div className="form-group">
                <label className="form-label">Assign to Agency</label>
                <select 
                  required 
                  className="form-input" 
                  value={newOwnerForm.agency_id} 
                  onChange={e => setNewOwnerForm({ ...newOwnerForm, agency_id: e.target.value })}
                >
                  <option value="">-- Select Agency --</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input required className="form-input" value={newOwnerForm.name} onChange={e => setNewOwnerForm({ ...newOwnerForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input required type="email" className="form-input" value={newOwnerForm.email} onChange={e => setNewOwnerForm({ ...newOwnerForm, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input required className="form-input" value={newOwnerForm.phone} onChange={e => setNewOwnerForm({ ...newOwnerForm, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input required type="password" minLength={6} className="form-input" value={newOwnerForm.password} onChange={e => setNewOwnerForm({ ...newOwnerForm, password: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddOwner(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Owner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div key={toast + Date.now()} className="toast-popup">{toast}</div>}
    </div>
  )
}
