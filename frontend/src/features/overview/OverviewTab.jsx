import { useEffect, useState } from 'react'
import { MapPin, Shield, ShieldCheck, CreditCard, Banknote, TrendingUp } from 'lucide-react'
import { useAuth } from '../../components/AuthContext'

// Avatar helper
function av(name, size = 36) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'
  const colors = ['#7C5CFF', '#00E5A0', '#5B8CFF', '#FF6B6B', '#FFA940']
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}22`, border: `2px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color, flexShrink: 0
    }}>{initials}</div>
  )
}

export default function OverviewTab({
  stats, sites, guards, supervisors, wallet,
  setTab, setStaffRole, setShowAddSite, setShowAddGuard, setShowAddSup,
}) {
  const { user } = useAuth()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const totalRevenue = sites.reduce((a, s) => a + parseFloat(s.monthly_amount || 0), 0)
  const roleLabel = user?.role === 'owner' ? 'Agency Owner' : user?.role === 'admin' ? 'Agency Administrator' : 'Field Supervisor'

  const statCards = [
    { label: 'Total Sites',   value: stats.site_count || 0,       color: '#5B8CFF', icon: '📍', t: 'sites' },
    { label: 'Total Guards',  value: stats.guard_count || 0,      color: '#7C5CFF', icon: '🛡️', t: 'staff', role: 'guards' },
    { label: 'On Duty Now',   value: stats.guard_onduty || 0,     color: '#00E5A0', icon: '✅', t: 'staff', role: 'guards' },
    { label: 'Supervisors',   value: stats.supervisor_count || 0, color: '#FF9F43', icon: '👔', t: 'staff', role: 'supervisors' },
  ]

  return (
    <div className="tab-content animate-fadeIn">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>🏢 {stats.agency_name || 'Agency Dashboard'}</h1>
          <p>Welcome back, {user?.name} — {roleLabel}</p>
        </div>
        <div style={{ textAlign: 'right', padding: '10px 18px', background: 'rgba(124,92,255,0.08)', borderRadius: '15px', border: '1px solid rgba(124,92,255,0.2)' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7C5CFF', fontFamily: 'monospace', letterSpacing: '1px' }}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card glass-card" style={{ padding: '22px', cursor: 'pointer' }}
            onClick={() => { setTab(s.t); if (s.role) setStaffRole(s.role) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label" style={{ fontSize: '0.78rem', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
              <div style={{ fontSize: '1.8rem' }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '10px' }}>Click to manage →</div>
          </div>
        ))}
      </div>

      {/* Wallet Banner */}
      <div className="card glass-card" style={{ marginTop: '24px', padding: '20px 28px', background: 'linear-gradient(135deg, rgba(124,92,255,0.12) 0%, rgba(0,229,160,0.07) 100%)', border: '1px solid rgba(124,92,255,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '2.2rem' }}>💼</div>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--clr-muted)' }}>Virtual Wallet Balance</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00E5A0' }}>₹{parseFloat(wallet?.balance || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--clr-muted)' }}>Monthly Revenue</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#5B8CFF' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Supervisors & Guards Mini-Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="card glass-card">
          <div className="card-header">
            <div><div className="card-title">👔 Supervisors</div><div className="card-sub">{supervisors.length} total</div></div>
            <button className="btn btn-primary btn-glow" style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              onClick={() => { setTab('staff'); setStaffRole('supervisors') }}>View All →</button>
          </div>
          {supervisors.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-muted)', fontSize: '0.85rem' }}>No supervisors yet.</div>
            : supervisors.slice(0, 3).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {av(s.name, 34)}<div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)' }}>{s.email}</div></div>
              </div>
            ))}
        </div>
        <div className="card glass-card">
          <div className="card-header">
            <div><div className="card-title">🛡️ Guards Overview</div><div className="card-sub">{guards.filter(g => g.is_on_duty).length} on duty</div></div>
            <button className="btn btn-primary btn-glow" style={{ fontSize: '0.8rem', borderRadius: '8px' }}
              onClick={() => { setTab('staff'); setStaffRole('guards') }}>View All →</button>
          </div>
          {guards.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-muted)', fontSize: '0.85rem' }}>No guards yet.</div>
            : guards.slice(0, 3).map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {av(g.name, 34)}<div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.name}</div><div style={{ fontSize: '0.72rem', color: g.is_on_duty ? '#00E5A0' : 'var(--clr-muted)' }}>{g.is_on_duty ? '● On Duty' : '○ Off Duty'}</div></div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card glass-card" style={{ marginTop: '24px' }}>
        <div className="card-header"><div className="card-title">⚡ Quick Actions</div></div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="pill-btn btn-glow" onClick={() => { setTab('sites'); setShowAddSite(true) }}><MapPin size={16} /> Add Site</button>
          <button className="pill-btn btn-glow" onClick={() => { setTab('staff'); setStaffRole('guards'); setShowAddGuard(true) }}><Shield size={16} /> Add Guard</button>
          <button className="pill-btn btn-glow" onClick={() => { setTab('staff'); setStaffRole('supervisors'); setShowAddSup(true) }}><ShieldCheck size={16} /> Add Supervisor</button>
          <button className="pill-btn btn-glow" onClick={() => setTab('payments')}><CreditCard size={16} /> Payments</button>
          <button className="pill-btn btn-glow" onClick={() => setTab('salary')}><Banknote size={16} /> Salary</button>
          {user?.role === 'owner' && <button className="pill-btn btn-glow" onClick={() => setTab('analysis')}><TrendingUp size={16} /> Analysis</button>}
        </div>
      </div>
    </div>
  )
}
