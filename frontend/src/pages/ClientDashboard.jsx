import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LogOut, CreditCard, Clock, Check, Upload, Eye, Download,
  User, Shield, MapPin, LayoutDashboard, X, ChevronRight,
  AlertCircle, CheckCircle, RefreshCw, Building2, Send
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import api from '../services/api'
import InvoiceModal from '../components/InvoiceModal'

// ── Small helpers ─────────────────────────────────────────────────────────────
const fmtMoney = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const monthLabel = (m, y) => `${new Date(0, m - 1).toLocaleString('default', { month: 'long' })} ${y}`

const StatusBadge = ({ status }) => {
  const map = {
    pending:  { color: '#FFA940', bg: 'rgba(255,169,64,0.12)',  icon: '⏳', label: 'Pending' },
    verified: { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',   icon: '✅', label: 'Verified' },
    rejected: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: '❌', label: 'Rejected' },
    paid:     { color: '#00E5A0', bg: 'rgba(0,229,160,0.12)',   icon: '✅', label: 'Paid' },
    due:      { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: '🔴', label: 'Due' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: s.bg, color: s.color }}>
      {s.icon} {s.label}
    </span>
  )
}

export default function ClientDashboard() {
  const { user, logout, theme, toggleTheme } = useAuth()
  const navigate  = useNavigate()
  const { tab: urlTab } = useParams()
  const [tab, setTab] = useState(() => urlTab || sessionStorage.getItem('client_tab') || 'overview')

  useEffect(() => {
    setTab(urlTab || 'overview')
  }, [urlTab])
  const [loading, setLoading]     = useState(true)
  const [sites, setSites]         = useState([])
  const [bills, setBills]         = useState([])
  const [payments, setPayments]   = useState([])
  const [guards, setGuards]       = useState([])
  const [toast, setToast]         = useState('')
  const toastRef = useRef(null)

  // Invoice modal state
  const [viewInvoiceSite, setViewInvoiceSite] = useState(null)
  const [viewInvoiceBill, setViewInvoiceBill] = useState(null)
  const [receiptModal, setReceiptModal]       = useState(null)

  // Payment form state
  const [payForm, setPayForm] = useState({ bill: '', amount_paid: '', paid_at: new Date().toISOString().split('T')[0], notes: '', screenshot: null })
  const [payLoading, setPayLoading] = useState(false)
  const [payFilter, setPayFilter]   = useState('all')
  const [billFilter, setBillFilter] = useState('all')
  const [notifications, setNotifications] = useState([]) // { id, message, type, read }
  const [deletePrompt, setDeletePrompt]   = useState(null)
  const prevPayments = useRef([])

  // ── Mobile-Style Back Button Logic ───────────────────────────────────────────
  const backState = useRef({ modalsOpen: false, tab: 'overview' })
  const lastBackPress = useRef(0)

  useEffect(() => {
    backState.current = { 
      modalsOpen: !!(viewInvoiceSite || viewInvoiceBill || receiptModal || deletePrompt), 
      tab: tab 
    }
  }, [viewInvoiceSite, viewInvoiceBill, receiptModal, deletePrompt, tab])

  useEffect(() => {
    window.history.pushState({ active_dashboard: true }, '')
    const handlePop = () => {
      const state = backState.current
      if (state.modalsOpen) {
        setViewInvoiceSite(null)
        setViewInvoiceBill(null)
        setReceiptModal(null)
        setDeletePrompt(null)
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

  useEffect(() => { sessionStorage.setItem('client_tab', tab) }, [tab])

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 3000)
  }

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const [sitesR, billsR, paymentsR, guardsR] = await Promise.all([
        api.get('/company/sites/'),
        api.get('/billing/bills/'),
        api.get('/billing/payments/'),
        api.get('/company/guards/').catch(() => ({ data: [] })),
      ])
      setSites(sitesR.data || [])
      setBills(billsR.data || [])
      const newPayments = paymentsR.data || []
      
      // Detect newly verified/rejected payments since last fetch
      const prev = prevPayments.current
      if (prev.length > 0) {
        newPayments.forEach(np => {
          const old = prev.find(op => op.id === np.id)
          if (old && old.status === 'pending' && np.status === 'verified') {
            const billObj = billsR.data.find(b => b.id === np.bill)
            const billLabel = billObj ? monthLabel(billObj.bill_month, billObj.bill_year) : `Bill #${np.bill}`
            const paid = parseFloat(np.amount_paid)
            const remaining = billObj ? parseFloat(billObj.remaining) : null
            let msg = `✅ Your payment of ₹${paid.toLocaleString('en-IN')} for ${billLabel} has been verified!`
            if (remaining === 0) msg += ' Bill is now FULLY SETTLED.'
            else if (remaining > 0) msg += ` Remaining balance: ₹${remaining.toLocaleString('en-IN')}`
            setNotifications(n => [{ id: Date.now(), message: msg, type: 'success', read: false }, ...n])
          } else if (old && old.status === 'pending' && np.status === 'rejected') {
            const billObj = billsR.data.find(b => b.id === np.bill)
            const billLabel = billObj ? monthLabel(billObj.bill_month, billObj.bill_year) : `Bill #${np.bill}`
            setNotifications(n => [{ id: Date.now(), message: `❌ Your payment for ${billLabel} was rejected. Please re-submit or contact the agency.`, type: 'error', read: false }, ...n])
          }
        })
      }
      prevPayments.current = newPayments
      setPayments(newPayments)
      setGuards(guardsR.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  const sendHeartbeat = useCallback(async () => {
    try { await api.post('/auth/heartbeat/') } catch {}
  }, [])

  useEffect(() => {
    if (user?.role !== 'client') { navigate('/login'); return }
    fetchData()
    
    // Poll every 20s to detect payment verifications in real time (silent background refresh)
    const pollInterval = setInterval(() => fetchData(false), 20000)
    
    // Heartbeat every 10 seconds to keep status as 'Live'
    sendHeartbeat()
    const iv = setInterval(sendHeartbeat, 10000)
    return () => { clearInterval(iv); clearInterval(pollInterval) }
  }, [user, navigate, fetchData, sendHeartbeat])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalBilled    = bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  const totalDue       = bills.reduce((s, b) => s + parseFloat(b.remaining || 0), 0)
  const totalPaid      = totalBilled - totalDue
  const pendingBills   = bills.filter(b => parseFloat(b.remaining) > 0).length
  const site           = sites[0] // primary site

  const filteredBills = bills.filter(b => {
    if (billFilter === 'paid')    return parseFloat(b.remaining) === 0
    if (billFilter === 'pending') return parseFloat(b.remaining) > 0
    return true
  })

  const filteredPayments = payments.filter(p => {
    if (payFilter === 'verified') return p.status === 'verified'
    if (payFilter === 'pending')  return p.status === 'pending'
    if (payFilter === 'rejected') return p.status === 'rejected'
    return true
  })

  const submitPayment = async (e) => {
    e.preventDefault()
    if (!payForm.bill || !payForm.amount_paid || !payForm.paid_at) {
      showToast('❌ Please fill all required fields')
      return
    }
    setPayLoading(true)
    try {
      const fd = new FormData()
      Object.entries(payForm).forEach(([k, v]) => { if (v) fd.append(k, v) })
      await api.post('/billing/payments/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      showToast('✅ Payment submitted! Awaiting agency verification.')
      setPayForm({ bill: '', amount_paid: '', paid_at: new Date().toISOString().split('T')[0], notes: '', screenshot: null })
      fetchData()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Submission failed'}`)
    } finally {
      setPayLoading(false)
    }
  }

  const handleDeleteRequest = async (e) => {
    e.preventDefault()
    if (!deletePrompt.reason) { showToast('❌ A reason is required.'); return; }
    try {
      await api.post(`/billing/payments/${deletePrompt.id}/request-delete/`, { reason: deletePrompt.reason })
      showToast('✉️ Deletion request sent to agency.')
      setDeletePrompt(null)
      fetchData(false)
    } catch {
      showToast('❌ Failed to request deletion.')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--clr-bg)' }}>
        <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
      </div>
    )
  }

  // ── Sidebar items ──────────────────────────────────────────────────────────
  const navItems = [
    { id: 'overview',  icon: <LayoutDashboard size={20}/>, label: 'Overview'     },
    { id: 'invoices',  icon: <CreditCard size={20}/>,      label: 'Invoices'     },
    { id: 'payments',  icon: <Send size={20}/>,            label: 'Payments'     },
    { id: 'guards',    icon: <Shield size={20}/>,          label: 'Guard Roster' },
    { id: 'profile',   icon: <User size={20}/>,            label: 'Profile'      },
  ]

  const handleTabChange = (tabId) => {
    navigate(`/client/${tabId}`)
    setTab(tabId)
  }

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">PG</div>
          <span className="logo-text">Post<span style={{ color: 'var(--clr-primary)' }}>Guard</span></span>
        </div>

        <div style={{ padding: '12px 16px', margin: '0 12px 8px', background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.12)', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.65rem', color: '#00E5A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Site Client</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site?.name || 'Your Site'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{site?.agency_name}</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${tab === item.id ? 'active glow-active' : ''}`} onClick={() => handleTabChange(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-chevron"><ChevronRight size={16}/></span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer glass-footer" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Site Manager</div>
            </div>
            <button className="btn-icon" onClick={logout} title="Logout" style={{ color: '#FF6B6B', flexShrink: 0 }}>
              <LogOut size={17}/>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">

        {/* ════════════ OVERVIEW ════════════ */}
        {tab === 'overview' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <div>
                <h1>🏙️ {site?.name || 'Site Dashboard'}</h1>
                <p>{site?.address || 'Site Management Panel'}</p>
              </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {notifications.filter(n => !n.read).length > 0 && (
              <button className="btn" style={{ background: 'rgba(124,92,255,0.15)', color: '#7C5CFF', fontSize: '0.8rem', position: 'relative' }} onClick={() => setTab('payments')}>
                🔔 {notifications.filter(n => !n.read).length} Update{notifications.filter(n => !n.read).length > 1 ? 's' : ''}
              </button>
            )}
          </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {[
                { label: 'Total Billed',   value: fmtMoney(totalBilled),  color: '#7C5CFF', icon: '📋', sub: `${bills.length} invoice${bills.length !== 1 ? 's' : ''}` },
                { label: 'Total Paid',     value: fmtMoney(totalPaid),    color: '#00E5A0', icon: '✅', sub: `${bills.filter(b => parseFloat(b.remaining) === 0).length} cleared` },
                { label: 'Outstanding',    value: fmtMoney(totalDue),     color: '#FF6B6B', icon: '⚠️', sub: `${pendingBills} pending bill${pendingBills !== 1 ? 's' : ''}` },
                { label: 'Guards On-Site', value: guards.filter(g => g.is_on_duty).length, color: '#5B8CFF', icon: '🛡️', sub: `${guards.length} assigned total` },
              ].map((s, i) => (
                <div key={i} className="stat-card glass-card" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-label" style={{ fontSize: '0.75rem', marginBottom: 8 }}>{s.label}</div>
                      <div style={{ fontSize: typeof s.value === 'number' ? '2.8rem' : '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', marginTop: 6 }}>{s.sub}</div>
                    </div>
                    <div style={{ fontSize: '1.8rem' }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Invoices */}
            <div className="card glass-card" style={{ marginTop: 24 }}>
              <div className="card-header">
                <div><div className="card-title">📄 Recent Invoices</div><div className="card-sub">Your latest billing records</div></div>
                <button className="btn btn-primary btn-glow" style={{ fontSize: '0.8rem' }} onClick={() => handleTabChange('invoices')}>View All →</button>
              </div>
              {bills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--clr-muted)' }}>No invoices received yet.</div>
              ) : bills.slice(0, 3).map(bill => (
                <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: parseFloat(bill.remaining) > 0 ? 'rgba(255,107,107,0.1)' : 'rgba(0,229,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {parseFloat(bill.remaining) > 0 ? <Clock size={18} color="#FFA940"/> : <Check size={18} color="#00E5A0"/>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{monthLabel(bill.bill_month, bill.bill_year)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)' }}>{fmtDate(bill.bill_date)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem' }}>{fmtMoney(bill.amount)}</div>
                      <StatusBadge status={parseFloat(bill.remaining) === 0 ? 'paid' : 'due'} />
                    </div>
                    <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => { setViewInvoiceSite(site); setViewInvoiceBill(bill); }}>
                      <Eye size={14}/> View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment CTA if outstanding */}
            {totalDue > 0 && (
              <div className="card glass-card" style={{ marginTop: 20, padding: '20px 24px', background: 'linear-gradient(135deg, rgba(124,92,255,0.1) 0%, rgba(255,107,107,0.07) 100%)', border: '1px solid rgba(124,92,255,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: '2rem' }}>💳</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>Outstanding Balance: {fmtMoney(totalDue)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginTop: 2 }}>Submit your payment proof for agency verification</div>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-glow" onClick={() => handleTabChange('payments')}>Pay Now →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ INVOICES ════════════ */}
        {tab === 'invoices' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <div><h1>📄 Invoices</h1><p>All billing records from {site?.agency_name}</p></div>
            </div>

            {/* Filter pills */}
            <div className="card glass-card" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', fontWeight: 600 }}>Filter:</span>
              {['all', 'pending', 'paid'].map(f => (
                <button key={f} className={`pill-btn ${billFilter === f ? 'active' : ''}`} style={{ padding: '5px 14px', fontSize: '0.78rem', textTransform: 'capitalize' }} onClick={() => setBillFilter(f)}>
                  {f === 'all' ? '📋 All' : f === 'pending' ? '🔴 Due' : '✅ Paid'}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--clr-muted)' }}>{filteredBills.length} record{filteredBills.length !== 1 ? 's' : ''}</span>
            </div>

            {filteredBills.length === 0 ? (
              <div className="card glass-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📭</div>
                <h3 style={{ marginBottom: 8 }}>No invoices found</h3>
                <p style={{ color: 'var(--clr-muted)' }}>Your agency will send invoices here once generated.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredBills.map(bill => {
                  const isPaid = parseFloat(bill.remaining) === 0
                  return (
                    <div key={bill.id} className="card glass-card animate-fadeIn" style={{ padding: '20px 24px', border: isPaid ? '1px solid rgba(0,229,160,0.15)' : '1px solid rgba(255,107,107,0.12)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <div style={{ width: 52, height: 52, borderRadius: 12, background: isPaid ? 'rgba(0,229,160,0.1)' : 'rgba(255,107,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                            {isPaid ? '✅' : '📋'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Bill — {monthLabel(bill.bill_month, bill.bill_year)}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginTop: 4 }}>
                              Generated: {fmtDate(bill.bill_date)}
                              {bill.due_date && <> · Due: {fmtDate(bill.due_date)}</>}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <StatusBadge status={isPaid ? 'paid' : 'due'} />
                              <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--clr-muted)', fontWeight: 600 }}>
                                {bill.bill_type?.toUpperCase()} INVOICE
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{fmtMoney(bill.amount)}</div>
                          {!isPaid && (
                            <div style={{ fontSize: '0.82rem', color: '#FF6B6B', fontWeight: 700, marginTop: 2 }}>
                              Due: {fmtMoney(bill.remaining)}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                            <button className="btn" style={{ padding: '7px 14px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 5 }}
                              onClick={() => { setViewInvoiceSite(site); setViewInvoiceBill(bill) }}>
                              <Eye size={14}/> View Invoice
                            </button>
                            {!isPaid ? (
                              <button className="btn btn-primary btn-glow" style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                                onClick={() => { setPayForm(p => ({ ...p, bill: bill.id, amount_paid: bill.remaining })); handleTabChange('payments') }}>
                                💳 Pay ₹{parseFloat(bill.remaining).toLocaleString('en-IN')}
                              </button>
                            ) : (
                              <button className="btn" style={{ padding: '7px 14px', fontSize: '0.8rem', background: 'rgba(0,229,160,0.1)', color: '#00E5A0', cursor: 'default' }}>
                                ✅ Settled
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════ PAYMENTS ════════════ */}
        {tab === 'payments' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <div><h1>💳 Payments</h1><p>Submit and track your payment proofs</p></div>
            </div>

            {/* Notifications Banner */}
            {notifications.length > 0 && (
              <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.map(n => (
                  <div key={n.id} style={{ padding: '14px 20px', borderRadius: 8, background: n.type === 'success' ? 'rgba(0,229,160,0.15)' : 'rgba(255,107,107,0.15)', border: `1px solid ${n.type === 'success' ? '#00E5A0' : '#FF6B6B'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.9rem', color: n.type === 'success' ? '#00E5A0' : '#FF6B6B' }}>
                      {n.message}
                    </div>
                    <button style={{ background: 'none', border: 'none', color: 'currentcolor', cursor: 'pointer', opacity: 0.7 }} onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Submit Payment Form */}
            <div className="card glass-card" style={{ marginBottom: 28, padding: '28px', border: '1px solid rgba(124,92,255,0.2)', background: 'linear-gradient(135deg, rgba(124,92,255,0.05) 0%, rgba(0,0,0,0) 60%)' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={18} color="#7C5CFF"/> Submit Payment Proof
              </div>
              <form onSubmit={submitPayment}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Select Bill *</label>
                    <select className="form-input" value={payForm.bill} onChange={e => setPayForm(p => ({ ...p, bill: e.target.value }))} required style={{ width: '100%' }}>
                      <option value="">— Choose an invoice —</option>
                      {bills.filter(b => parseFloat(b.remaining) > 0).map(b => (
                        <option key={b.id} value={b.id}>
                          {monthLabel(b.bill_month, b.bill_year)} — Due {fmtMoney(b.remaining)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Amount Paid (₹) *</label>
                    <input className="form-input" style={{ width: '100%' }} type="number" placeholder="Enter amount" value={payForm.amount_paid} onChange={e => setPayForm(p => ({ ...p, amount_paid: e.target.value }))} required min="1" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Payment Date *</label>
                    <input className="form-input" style={{ width: '100%' }} type="date" value={payForm.paid_at} onChange={e => setPayForm(p => ({ ...p, paid_at: e.target.value }))} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Payment Screenshot</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', color: payForm.screenshot ? '#00E5A0' : 'var(--clr-muted)' }}>
                      <Upload size={15}/>
                      {payForm.screenshot ? payForm.screenshot.name : 'Upload screenshot (optional)'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPayForm(p => ({ ...p, screenshot: e.target.files[0] }))} />
                    </label>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
                    <input className="form-input" style={{ width: '100%' }} placeholder="Transaction ID, bank name, etc." value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary btn-glow" disabled={payLoading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {payLoading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/> : <Send size={16}/>}
                    {payLoading ? 'Submitting...' : 'Submit Payment'}
                  </button>
                  <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setPayForm({ bill: '', amount_paid: '', paid_at: new Date().toISOString().split('T')[0], notes: '', screenshot: null })}>
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {/* Payment History */}
            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-header" style={{ padding: '20px 24px' }}>
                <div><div className="card-title">🧾 Payment History</div><div className="card-sub">{payments.length} submission{payments.length !== 1 ? 's' : ''}</div></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['all', 'pending', 'verified', 'rejected'].map(f => (
                    <button key={f} className={`pill-btn ${payFilter === f ? 'active' : ''}`} style={{ padding: '4px 12px', fontSize: '0.72rem', textTransform: 'capitalize' }} onClick={() => setPayFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>
              {filteredPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-muted)' }}>No payment records yet.</div>
              ) : (
                <div className="table-wrap">
                  <table >
                    <thead><tr><th>Bill</th><th>Amount</th><th>Date</th><th>Notes</th><th>Proof</th><th>Status</th><th style={{ width: '50px' }}></th></tr></thead>
                    <tbody>
                      {filteredPayments.map(p => {
                        const bill = bills.find(b => b.id === p.bill)
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{bill ? monthLabel(bill.bill_month, bill.bill_year) : `Bill #${p.bill}`}</td>
                            <td style={{ fontWeight: 700, color: '#00E5A0' }}>{fmtMoney(p.amount_paid)}</td>
                            <td style={{ color: 'var(--clr-muted)', fontSize: '0.82rem' }}>{fmtDate(p.paid_at)}</td>
                            <td style={{ color: 'var(--clr-muted)', fontSize: '0.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                            <td>
                              {p.screenshot_url ? (
                                <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(124,92,255,0.1)', color: '#7C5CFF' }} 
                                  onClick={(e) => { e.preventDefault(); setReceiptModal(p.screenshot_url); }}>
                                  👁️ View
                                </button>
                              ) : <span style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>No image</span>}
                            </td>
                            <td><StatusBadge status={p.status} /></td>
                            <td>
                               <div style={{ position: 'relative' }}>
                                 <button style={{ background: 'none', border: 'none', color: 'var(--clr-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 8px' }}
                                   onClick={() => setDeletePrompt({ id: p.id, reason: '' })}
                                   title="Request Deletion"
                                 >⋮</button>
                               </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ GUARDS ════════════ */}
        {tab === 'guards' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <div><h1>🛡️ Guard Roster</h1><p>All security personnel assigned to your site</p></div>
            </div>

            {/* Site Info Strip */}
            {site && (
              <div className="card glass-card" style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(91,140,255,0.08) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(91,140,255,0.15)' }}>
                {[
                  { label: 'Site', value: site.name, icon: '🏢' },
                  { label: 'Type', value: site.site_type, icon: '📍' },
                  { label: 'Required Guards', value: `${site.num_securities} per shift`, icon: '🛡️' },
                  { label: 'Shifts', value: `${(site.shifts || []).length} configured`, icon: '🕐' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shifts */}
            {(site?.shifts || []).length > 0 && (
              <div className="card glass-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
                <div className="card-title" style={{ marginBottom: 12 }}>⏰ Active Shifts</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {(site?.shifts || []).map(sh => (
                    <div key={sh.id} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.15)', fontSize: '0.85rem' }}>
                      <strong>{sh.name}</strong> — {sh.start_time.slice(0,5)} to {sh.end_time.slice(0,5)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guards Grid */}
            {guards.length === 0 ? (
              <div className="card glass-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛡️</div>
                <h3>No guards assigned yet</h3>
                <p style={{ color: 'var(--clr-muted)', marginTop: 8 }}>Contact your security agency to assign guards to this site.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {guards.map(g => (
                  <div key={g.id} className="card glass-card animate-fadeIn" style={{ padding: '18px 20px', border: g.is_on_duty ? '1px solid rgba(0,229,160,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: g.is_on_duty ? 'linear-gradient(135deg, #00E5A0, #009966)' : 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, flexShrink: 0 }}>
                        {g.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{g.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)' }}>{g.phone}</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, background: g.is_on_duty ? 'rgba(0,229,160,0.12)' : 'rgba(255,255,255,0.05)', color: g.is_on_duty ? '#00E5A0' : 'var(--clr-muted)' }}>
                        {g.is_on_duty ? '● On Duty' : '○ Off Duty'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                      <div style={{ flex: 1, fontSize: '0.72rem', color: 'var(--clr-muted)' }}>
                        <div>Type: <strong style={{ color: g.guard_type === 'regular' ? '#5B8CFF' : '#FFA940' }}>{g.guard_type}</strong></div>
                        {g.shift_name && <div>Shift: <strong>{g.shift_name}</strong></div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ PROFILE ════════════ */}
        {tab === 'profile' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header"><h1>👤 Your Profile</h1><p>Account information</p></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card glass-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #00E5A0, #009966)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 800 }}>
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{user?.name}</div>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,229,160,0.1)', color: '#00E5A0', fontSize: '0.72rem', fontWeight: 700 }}>Site Manager</span>
                  </div>
                </div>
                {[
                  { label: 'Email',   value: user?.email },
                  { label: 'Phone',   value: user?.phone },
                  { label: 'Site',    value: site?.name || '—' },
                  { label: 'Agency',  value: site?.agency_name || '—' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--clr-muted)', fontSize: '0.82rem' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="card glass-card" style={{ padding: '28px' }}>
                <div className="card-title" style={{ marginBottom: 16 }}>📊 Account Summary</div>
                {[
                  { label: 'Total Invoices',  value: bills.length, color: '#7C5CFF' },
                  { label: 'Paid Invoices',   value: bills.filter(b => parseFloat(b.remaining) === 0).length, color: '#00E5A0' },
                  { label: 'Pending Invoices',value: bills.filter(b => parseFloat(b.remaining) > 0).length, color: '#FF6B6B' },
                  { label: 'My Payments',     value: payments.length, color: '#5B8CFF' },
                  { label: 'Verified',        value: payments.filter(p => p.status === 'verified').length, color: '#00E5A0' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--clr-muted)', fontSize: '0.82rem' }}>{row.label}</span>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: row.color }}>{row.value}</span>
                  </div>
                ))}
                <button className="btn" style={{ width: '100%', marginTop: 20, background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={logout}>
                  <LogOut size={16}/> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={!!viewInvoiceSite}
        site={viewInvoiceSite}
        bill={viewInvoiceBill}
        bankAccount={null}
        onClose={() => { setViewInvoiceSite(null); setViewInvoiceBill(null) }}
        onSent={() => {}}
        isClient={true}
      />

      {/* Receipt Modal Viewer */}
      {receiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setReceiptModal(null)}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={(e) => { e.stopPropagation(); window.open(receiptModal, '_blank'); }}>↗ Open in New Tab</button>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); setReceiptModal(null); }}>✕ Close Dialog</button>
          </div>
          <img src={receiptModal} alt="Payment Receipt" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Delete Request Prompt Modal */}
      {deletePrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleDeleteRequest} className="card glass-card animate-fadeIn" style={{ width: '400px', padding: '25px', background: 'var(--clr-surface)' }}>
            <h3 style={{ marginBottom: 15 }}>Request Deletion</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-muted)', marginBottom: 20 }}>
              To delete this payment record, please supply a reason. A request will automatically be appended to the payment notes.
            </p>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason</label>
            <textarea 
              className="form-input" 
              style={{ width: '100%', minHeight: '80px', marginBottom: 20 }} 
              value={deletePrompt.reason} 
              onChange={e => setDeletePrompt(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g.: Uploaded wrong screenshot..."
              autoFocus 
              required
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setDeletePrompt(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast-popup animate-fadeIn">{toast}</div>}
    </div>
  )
}
