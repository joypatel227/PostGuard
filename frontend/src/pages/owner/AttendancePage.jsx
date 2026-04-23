import React, { useState, useEffect, useCallback } from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import api from '../../services/api';
import { format12h } from '../../utils/helpers';
import { 
  Calendar, Search, FileText, CheckCircle, AlertTriangle
} from 'lucide-react';

export default function AttendancePage() {
  const { sites, guards, showToast } = useOwnerData();

  const [attendanceMode, setAttendanceMode] = useState('daily'); // 'daily' or 'monthly'
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attendanceWhatsApp, setAttendanceWhatsApp] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');

    const fetchAttendance = useCallback(async () => {  
      try {  
        setAttLoading(true)  
        if (attendanceMode === 'monthly') {  
          const r = await api.get(`/company/attendance/?month=${attendanceMonth}`)  
          setMonthlyAttendanceRecords(r.data)  
        } else {  
          const r = await api.get(`/company/attendance/?date=${attendanceDate}`)  
          setAttendanceRecords(r.data)  
        }  
      } catch {} finally { setAttLoading(false) }  
    }, [attendanceDate, attendanceMonth, attendanceMode])  

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance, attendanceDate, attendanceMonth, attendanceMode]);

      return (
    <div className="tab-content animate-fadeIn">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div><h1>📋 Attendance</h1><p>Daily guard presence &amp; time tracking for {stats.agency_name}</p></div>
        <div className="tab-pills" style={{ display: 'flex', gap: '8px', background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '12px' }}>
          {[{ id: 'daily', label: '📅 Daily Roster' }, { id: 'monthly', label: '📊 Monthly Excel' }].map(m => (
            <button key={m.id} onClick={() => setAttendanceMode(m.id)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                background: attendanceMode === m.id ? 'var(--clr-primary)' : 'transparent',
                color: attendanceMode === m.id ? '#fff' : 'var(--clr-muted)' }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Daily Roster ── */}
      {attendanceMode === 'daily' && (
        <div className="animate-fadeIn">
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
            <input type="date" className="input" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}
              style={{ padding: '8px 12px', width: 'auto', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            <div className="card glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Records for {new Date(attendanceDate).toLocaleDateString()}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>{attLoading ? 'Loading...' : `${attendanceRecords.length} records found`}</div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr><th>Guard</th><th>Type</th><th>Site</th><th>Shift</th><th>Status</th><th>Time</th><th>Actions</th></tr></thead>
                  <tbody>
                    {guards.filter(g => g.site && g.shift).length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--clr-muted)' }}>No guards assigned to any sites.</td></tr>
                    ) : guards.filter(g =>
                        g.site && g.shift &&
                        (g.name.toLowerCase().includes(attendanceSearch.toLowerCase()) || g.phone.includes(attendanceSearch))
                      ).map(g => {
                      const a = attendanceRecords.find(r => r.guard === g.id)
                      const siteName = sites.find(s => s.id === g.site)?.name || 'Unknown'
                      const shiftObj = sites.flatMap(s => s.shifts || []).find(s => s.id === g.shift)
                      const shiftName = shiftObj ? `${shiftObj.name} (${format12h(shiftObj.start_time)} - ${format12h(shiftObj.end_time)})` : 'Unknown'
                      return (
                        <tr key={g.id}>
                          <td><strong>{g.name}</strong></td>
                          <td><span className="badge" style={{ background: g.guard_type === 'regular' ? 'rgba(91,140,255,0.15)' : 'rgba(255,169,64,0.15)', color: g.guard_type === 'regular' ? '#5B8CFF' : '#FFA940' }}>{g.guard_type}</span></td>
                          <td>{siteName}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--clr-muted)' }}>{shiftName}</td>
                          <td>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase',
                              background: a ? (a.status === 'present' || a.status === 'late' ? 'rgba(0,229,160,0.15)' : 'rgba(255,107,107,0.15)') : 'rgba(255,255,255,0.05)',
                              color: a ? (a.status === 'present' || a.status === 'late' ? '#00E5A0' : '#FF6B6B') : 'var(--clr-muted)' }}>
                              {a ? a.status : 'Auto/Pending'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>{a && a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td>
                            <select className="input" value={a ? a.status : 'present'}
                              onChange={async (e) => {
                                try {
                                  if (a) { await updateAttendance(a.id, { status: e.target.value }) }
                                  else { await createAttendance({ guard: g.id, site: g.site, shift: g.shift, status: e.target.value, date: attendanceDate }) }
                                  fetchAttendance(); fetchGuards()
                                } catch { showToast('❌ Failed to update') }
                              }}
                              style={{ width: '120px', padding: '4px 8px', fontSize: '0.8rem', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <option value="present" style={{ background: '#1e202d', color: '#fff' }}>Present</option>
                              <option value="late" style={{ background: '#1e202d', color: '#fff' }}>Late</option>
                              <option value="absent" style={{ background: '#1e202d', color: '#fff' }}>Absent</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* WhatsApp Bulk Log */}
            <div>
              <div className="card glass-card" style={{ padding: '24px', position: 'sticky', top: '90px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Bulk WhatsApp Log</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginBottom: '16px' }}>Paste daily report from supervisors to auto-mark status. E.g. "Raj - P", "Amit - Absent"</p>
                <textarea className="input" placeholder="Paste text here..." rows={8}
                  value={attendanceWhatsApp} onChange={e => setAttendanceWhatsApp(e.target.value)}
                  style={{ width: '100%', marginBottom: '12px', fontFamily: 'monospace', fontSize: '0.85rem' }} />
                <button className="btn" style={{ width: '100%', background: '#25D366', color: '#000', fontWeight: 'bold' }}
                  onClick={async () => {
                    if (!attendanceWhatsApp.trim()) return
                    try {
                      const r = await bulkAttendance(attendanceWhatsApp)
                      showToast(`✅ ${r.data.count} records processed!`)
                      setAttendanceWhatsApp('')
                      fetchAttendance(); fetchGuards()
                    } catch { showToast('❌ Failed to process text') }
                  }}>
                  Parse WhatsApp Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Grid ── */}
      {attendanceMode === 'monthly' && (
        <div className="card glass-card animate-fadeIn" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Monthly Overview</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>
                Total {monthlyAttendanceRecords.length} logs across {guards.length} guards for this month.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="search-input-wrap" style={{ width: '250px' }}>
                <Search size={16} className="search-icon" />
                <input type="text" placeholder="Search guard..." className="search-input"
                  value={attendanceSearch} onChange={e => setAttendanceSearch(e.target.value)} />
              </div>
              <input type="month" className="input" value={attendanceMonth} onChange={e => setAttendanceMonth(e.target.value)}
                style={{ padding: '8px 12px', width: 'auto', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          <div className="table-responsive custom-scrollbar" style={{ overflowX: 'auto', paddingBottom: '16px' }}>
            {(() => {
              const [y, m] = attendanceMonth.split('-')
              const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate()
              const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1)
              return (
                <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--clr-bg)', padding: '16px', minWidth: '220px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Guard Details</th>
                      {daysArr.map(d => <th key={d} style={{ padding: '16px 8px', minWidth: '40px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--clr-muted)', fontSize: '0.85rem' }}>{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {guards.filter(g => g.name.toLowerCase().includes(attendanceSearch.toLowerCase()) || g.phone.includes(attendanceSearch))
                      .map(g => {
                        const gSite = sites.find(s => s.id === g.site)
                        return (
                          <tr key={g.id} className="table-row-hover">
                            <td style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--clr-bg)', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                              <div style={{ fontWeight: 600 }}>{g.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', marginTop: '4px' }}>
                                {gSite?.name || 'Unassigned'} • <span style={{ color: g.guard_type === 'regular' ? '#5B8CFF' : '#FFA940' }}>{g.guard_type}</span>
                              </div>
                            </td>
                            {daysArr.map(d => {
                              const isoDate = `${attendanceMonth}-${d.toString().padStart(2, '0')}`
                              const dayLogs = monthlyAttendanceRecords.filter(r => r.guard === g.id && r.date === isoDate)
                              let cellContent = null
                              if (dayLogs.length > 0) {
                                const mainLog = dayLogs[0]
                                const isPresent = mainLog.status === 'present' || mainLog.status === 'late'
                                const hasOT = dayLogs.length > 1 || dayLogs.some(l => l.is_overtime)
                                let bg = isPresent ? 'rgba(0,229,160,0.15)' : 'rgba(255,107,107,0.15)'
                                let clr = isPresent ? '#00E5A0' : '#FF6B6B'
                                let text = mainLog.status === 'present' ? 'P' : mainLog.status === 'late' ? 'L' : 'A'
                                if (hasOT) { bg = 'rgba(91,140,255,0.15)'; clr = '#5B8CFF'; text = '+OT' }
                                const cellDesc = dayLogs.map(l => `${l.status}${l.is_overtime ? ' (OT)' : ''}`).join(', ')
                                cellContent = (
                                  <div title={`${isoDate} - ${cellDesc}`} className="animate-fadeIn"
                                    style={{ width: '32px', height: '32px', margin: '0 auto', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color: clr, fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px', border: `1px solid ${bg.replace('0.15', '0.4')}` }}>
                                    {text}
                                  </div>
                                )
                              }
                              return (
                                <td key={d} style={{ padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                  <div style={{ width: '32px', height: '32px', margin: '0 auto' }}>{cellContent}</div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
