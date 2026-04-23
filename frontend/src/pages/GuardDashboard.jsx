import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, MapPin, Clock, Calendar, CheckCircle, Wallet, Shield } from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import api from '../services/api'
function format12h(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

const formatCurrency = (val) => {
  const num = parseFloat(val || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  return `₹${num.toLocaleString('en-IN')}`;
};
const formatFullCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export default function GuardDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [guard, setGuard] = useState(null)
  const [salaryHistory, setSalaryHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGuardData = useCallback(async () => {
    try {
      if (!user?.guard_id) {
        // Fallback: request full user profile to fetch guard_id if missing from local state
        const meRes = await api.get('/auth/me/')
        if (!meRes.data.guard_id) throw new Error("No linked guard profile found.")
        user.guard_id = meRes.data.guard_id
      }
      
      const res = await api.get(`/company/guards/${user.guard_id}/`)
      setGuard(res.data)

      try {
        const histRes = await api.get('/salary/my-history/')
        setSalaryHistory(histRes.data)
      } catch (hErr) {
        console.warn("Salary history unavailable", hErr)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const sendHeartbeat = useCallback(async () => {
    try { await api.post('/auth/heartbeat/') } catch {}
  }, [])

  useEffect(() => {
    if (user?.role !== 'guard') {
      navigate('/login')
      return
    }
    fetchGuardData()
    
    // Heartbeat to keep live status
    sendHeartbeat()
    const iv = setInterval(sendHeartbeat, 15000)
    return () => clearInterval(iv)
  }, [user, navigate, fetchGuardData, sendHeartbeat])

  if (loading) {
    return (
      <div className="layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
      </div>
    )
  }

  if (!guard) {
    return (
      <div className="layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="card text-center" style={{ padding: 40 }}>
          <Shield size={48} color="#FF6B6B" style={{ margin: '0 auto 16px' }} />
          <h3>Profile Not Found</h3>
          <p style={{ color: 'var(--clr-muted)', margin: '16px 0' }}>Your guard profile could not be loaded or is inactive.</p>
          <button className="btn btn-primary" onClick={logout}>Back to Login</button>
        </div>
      </div>
    )
  }

  const { today_attendance } = guard
  const isPresent = today_attendance?.status === 'present' || today_attendance?.status === 'late'
  const isAbsent = today_attendance?.status === 'absent'

  return (
    <div className="layout" style={{ paddingBottom: '80px', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {guard.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{guard.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>{guard.phone} · {guard.agency_name}</div>
          </div>
        </div>
        <button className="btn-icon" onClick={logout} style={{ color: 'var(--clr-danger)', background: 'rgba(255,107,107,0.1)' }}>
          <LogOut size={20} />
        </button>
      </header>

      <main style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        
        {/* Status Card */}
        {(() => {
          const att = guard.today_attendance
          const now = new Date()
          const curMin = now.getHours() * 60 + now.getMinutes()

          let statusText = 'NO SHIFT ASSIGNED'
          let statusColor = 'var(--clr-muted)'
          let cardBorder = 'var(--clr-muted)'
          let shiftInfo = ''

          if (guard.shift && guard.shift_start_time && guard.shift_end_time) {
            const [sH, sM] = guard.shift_start_time.split(':').map(Number)
            const [eH, eM] = guard.shift_end_time.split(':').map(Number)
            const startMin = sH * 60 + sM
            const endMin = eH * 60 + eM

            const isOvernight = endMin < startMin
            let isLive = false
            let isPast = false
            let isFuture = false

            if (isOvernight) {
              isLive = curMin >= startMin || curMin <= endMin
              if (!isLive) {
                isPast = curMin > endMin && curMin < startMin
                isFuture = !isPast
              }
            } else {
              isLive = curMin >= startMin && curMin <= endMin
              isPast = curMin > endMin
              isFuture = curMin < startMin
            }

            const hasAbs = att?.status === 'absent'
            const hasPresent = att?.status === 'present' || att?.status === 'late'

            if (isFuture) {
              if (hasAbs) { statusText = 'ABSENT'; statusColor = '#FF6B6B'; cardBorder = '#FF6B6B' }
              else { statusText = `Starts at ${guard.shift_start_time}`; statusColor = 'var(--clr-muted)'; cardBorder = 'var(--clr-muted)' }
            } else if (isLive) {
              if (hasAbs) { statusText = 'ABSENT'; statusColor = '#FF6B6B'; cardBorder = '#FF6B6B' }
              else { statusText = att?.status === 'late' ? 'LATE' : 'ON DUTY'; statusColor = '#00E5A0'; cardBorder = '#00E5A0' }
            } else if (isPast) {
              if (hasAbs) { statusText = 'ABSENT'; statusColor = '#FF6B6B'; cardBorder = '#FF6B6B' }
              else { statusText = `PRESENT + DONE AT ${format12h(guard.shift_end_time).toUpperCase()}`; statusColor = '#00E5A0'; cardBorder = '#00E5A0' }
            }
            shiftInfo = `${guard.shift_name} · ${guard.shift_start_time.slice(0,5)} – ${guard.shift_end_time.slice(0,5)}`
          } else if (guard.is_on_duty || guard.is_scheduled_on_duty) {
            statusText = 'ON DUTY'; statusColor = '#00E5A0'; cardBorder = '#00E5A0'
          }

          return (
            <div className="card glass-card animate-fadeIn" style={{ borderTop: `4px solid ${cardBorder}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Duty Status</h2>
                <div className="badge" style={{ background: `${statusColor}22`, color: statusColor, padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700 }}>
                  {statusText}
                </div>
              </div>
              {shiftInfo && <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '16px' }}>🕐 {shiftInfo}</div>}
          
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <MapPin size={20} style={{ color: '#7C5CFF', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginBottom: '4px' }}>Current Assigned Site</div>
                    <div style={{ fontWeight: 600 }}>{guard.site ? guard.site_name : 'No active assignment'}</div>
                  </div>
                </div>
                {guard.shift && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <Clock size={20} style={{ color: '#00E5A0', marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginBottom: '4px' }}>Shift ({guard.shift_name})</div>
                      <div style={{ fontWeight: 600 }}>{guard.shift_start_time ? `${guard.shift_start_time.slice(0,5)} – ${guard.shift_end_time?.slice(0,5)}` : 'View Assignments tab'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}


        {/* Advanced Salary Card */}
        <div className="card glass-card animate-fadeIn" style={{ animationDelay: '0.1s', background: 'linear-gradient(165deg, rgba(30,32,45,0.95), rgba(15,18,28,1))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Wallet size={20} style={{ color: '#5B8CFF' }} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Financial Dashboard</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
             <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '3px solid #00E5A0' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Earned this Month</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#00E5A0' }}>{formatCurrency(guard.amount_earned_month)}</div>
             </div>
             <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '3px solid #FF6B6B' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Paid this Month</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FF6B6B' }}>{formatCurrency(guard.amount_paid_month)}</div>
             </div>
          </div>

          <div style={{ background: 'var(--grad-primary)', borderRadius: '14px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 15px 30px -10px rgba(124,92,255,0.4)' }}>
             <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: '2px' }}>NET PAYABLE DUES</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.02em' }}>{formatCurrency(guard.amount_earned_month - guard.amount_paid_month)}</div>
             </div>
             <div style={{ textAlign: 'right', opacity: 0.8 }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Daily Rate</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{parseInt(guard.daily_rate)}</div>
             </div>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
             <span style={{ color: 'var(--clr-muted)' }}>Status</span>
             <span style={{ color: '#00E5A0', fontWeight: 700 }}>● Active & Tracked</span>
          </div>
        </div>

        {/* Bank Account Information */}
        <div className="card glass-card animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Shield size={20} style={{ color: '#FF8C42' }} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Registered Bank Details</h2>
          </div>
          
          <div style={{ background: 'rgba(255,140,66,0.05)', border: '1px solid rgba(255,140,66,0.15)', borderRadius: '14px', padding: '20px' }}>
            {(!guard.bank_name && !guard.upi_id) ? (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--clr-muted)', fontSize: '0.88rem' }}>
                Bank details not registered. Contact your agency owner to add them.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>Bank Name</span>
                  <span style={{ fontWeight: 700 }}>{guard.bank_name || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>Account Number</span>
                  <span style={{ fontWeight: 800, letterSpacing: '0.05em' }}>{guard.account_no || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>IFSC Code</span>
                  <span style={{ fontWeight: 700 }}>{guard.ifsc_code || '—'}</span>
                </div>
                {guard.upi_id && (
                  <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>UPI ID</span>
                    <span style={{ fontWeight: 700, color: '#00E5A0' }}>{guard.upi_id}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payout History */}
        {salaryHistory.length > 0 && (
          <div className="card glass-card animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div style={{ display: 'flex', justifySelf: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={20} style={{ color: '#00E5A0' }} />
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Salary History</h2>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>Last 6 months</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {salaryHistory.map(rec => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: `3px solid ${rec.amount_paid > 0 ? '#00E5A0' : 'rgba(255,255,255,0.1)'}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{new Date(rec.year, rec.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '2px' }}>
                      {rec.days_present} days present &bull; {rec.payment_mode || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: rec.amount_paid > 0 ? '#00E5A0' : '#fff' }}>
                      {formatFullCurrency(rec.amount_paid)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', fontWeight: 600 }}>PAID</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Attendance */}
        <div className="card glass-card animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Calendar size={20} style={{ color: '#FFC107' }} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Today's Attendance</h2>
          </div>
          
          {!today_attendance ? (
             <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: 'var(--clr-muted)' }}>
                No attendance marked for today yet.
             </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: isPresent ? 'rgba(0,229,160,0.05)' : 'rgba(255,107,107,0.05)', border: `1px solid ${isPresent ? 'rgba(0,229,160,0.2)' : 'rgba(255,107,107,0.2)'}`, borderRadius: '8px' }}>
              <CheckCircle size={32} color={isPresent ? '#00E5A0' : '#FF6B6B'} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: isPresent ? '#00E5A0' : '#FF6B6B', textTransform: 'uppercase' }}>
                  {today_attendance.status}
                </div>
                {today_attendance.check_in && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)', marginTop: '4px' }}>
                    Checked in at: {format12h(today_attendance.check_in.split('T')[1]?.slice(0, 5) || today_attendance.check_in)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
