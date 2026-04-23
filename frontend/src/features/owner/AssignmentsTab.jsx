import React, { useState } from 'react';
import { 
  Users, MapPin, Calendar, Clock, DollarSign, Settings, Bell, ChevronRight, 
  Search, Plus, Shield, UserCheck, X, FileText, CheckCircle, AlertTriangle, 
  ArrowUpRight, Target, ClipboardList, TrendingUp, LogOut, Download, Mail, 
  Map as MapIcon, Lock, Unlock, Phone, Building, History, Check, ShieldAlert,
  Edit2, Trash2, Maximize2, Minimize2, CheckSquare, Upload, Camera, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { format12h, isSiteOpen, typeLabel } from '../../utils/helpers';

const AssignmentsTab = ({
  stats,
  sites,
  guards,
  assignmentFilter,
  setAssignmentFilter,
  guardAssignmentStatusFilter,
  setGuardAssignmentStatusFilter,
  setConfirmDelete,
  toggleDuty,
  setAssignModal,
  setOvertimeModal,
  toggleSite,
  setEditSiteData,
  setShowAddSite,
  markAttendance,
  undoAttendance,
  av,
  setTab,
  setShowAddClient,
  fetchGuards
}) => {
  return (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <h1>🛡️ Guard Assignments</h1>
              <p>Manage site capacities and vacant positions</p>
            </div>

            {/* Filter Toolbar */}
            <div className="card glass-card" style={{ marginBottom: '24px', padding: '16px 20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Shift Status:</span>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'allocated', label: 'Fully Allocated' },
                    { id: 'unallocated', label: 'Has Vacancies' }
                  ].map(f => (
                    <button key={f.id} onClick={() => setAssignmentFilter(f.id)} className={`pill-btn ${assignmentFilter === f.id ? 'active' : ''}`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Guard Status:</span>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
                  {[
                    { id: 'all', label: '📄 All Guards' },
                    { id: 'onduty', label: '✅ Present' },
                    { id: 'offduty', label: '🔴 Absent' }
                  ].map(f => (
                    <button key={f.id} onClick={() => setGuardAssignmentStatusFilter(f.id)} className={`pill-btn ${guardAssignmentStatusFilter === f.id ? 'active' : ''}`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {sites.map(site => {
                // Filter shifts within the site
                const filteredShifts = (site.shifts || []).filter(shift => {
                  const assignedCount = guards.filter(g => g.site === site.id && g.shift === shift.id).length
                  const vacancies = Math.max(0, (site.num_securities || 0) - assignedCount)
                  
                  if (assignmentFilter === 'all') return true
                  if (assignmentFilter === 'allocated') return vacancies === 0
                  if (assignmentFilter === 'unallocated') return vacancies > 0
                  return true
                })

                if (assignmentFilter !== 'all' && filteredShifts.length === 0) return null

                return (
                  <div key={site.id} className="card glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                      <div style={{ fontSize: '1.5rem' }}>{typeLabel[site.site_type] || '📍'}</div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{site.name}</h3>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>Capacity: {site.num_securities} per shift</div>
                        <div style={{ marginTop: '4px' }}>
                            {site.client_user ? (
                                <span style={{ fontSize: '0.65rem', color: '#00E5A0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={10}/> Manager: {site.client_user_name}
                                </span>
                            ) : (
                                <button className="btn-link" style={{ fontSize: '0.65rem', color: 'var(--clr-primary)', padding: 0, textDecoration: 'underline' }} onClick={() => { setTab('sites'); setShowAddClient(site.id); }}>
                                    🔑 Setup Client Login
                                </button>
                            )}
                        </div>
                      </div>
                      {(() => {
                        const { isOpen, activeShift } = isSiteOpen(site)
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span style={{ background: isOpen ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)', color: isOpen ? '#00E5A0' : 'var(--clr-muted)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                              {isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                            </span>
                            {activeShift && <span style={{ fontSize: '0.6rem', color: 'var(--clr-muted)' }}>{activeShift.name} · {format12h(activeShift.start_time)}–{format12h(activeShift.end_time)}</span>}
                          </div>
                        )
                      })()}
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                      {filteredShifts.map(shift => {
                        const shiftGuards = guards.filter(g => g.site === site.id && g.shift === shift.id)
                        // Count guards who are present/on-duty (not explicitly absent)
                        const activeGuards = shiftGuards.filter(g => g.today_attendance?.status !== 'absent')
                        const fillPercent = Math.min(100, (activeGuards.length / (site.num_securities || 1)) * 100)
                        const vacancies = Math.max(0, (site.num_securities || 0) - activeGuards.length)

                        // Guard Status filter — attendance-based
                        const filteredShiftGuards = shiftGuards.filter(g => {
                          if (guardAssignmentStatusFilter === 'all') return true
                          const att = g.today_attendance?.status
                          // 'present' = not explicitly absent (default = present)
                          if (guardAssignmentStatusFilter === 'onduty') return att !== 'absent'
                          // 'absent' = explicitly marked absent
                          if (guardAssignmentStatusFilter === 'offduty') return att === 'absent'
                          return true
                        })

                        return (
                          <div key={shift.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{shift.name} Shift</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)' }}>{format12h(shift.start_time)} - {format12h(shift.end_time)}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: vacancies === 0 ? '#FF6B6B' : '#00E5A0' }}>
                                  {activeGuards.length} / {site.num_securities}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', textTransform: 'uppercase' }}>Filled</div>
                              </div>
                            </div>

                            {/* Capacity Bar */}
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                              <div style={{ width: `${fillPercent}%`, height: '100%', background: vacancies === 0 ? 'var(--clr-danger)' : 'var(--grad-primary)', transition: 'width 0.5s ease' }} />
                            </div>

                            {/* Guard List */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                              {filteredShiftGuards.map(g => {
                                let statusColor = 'var(--clr-muted)'
                                let statusText = 'Assigned'
                                
                                // ── Shift time window calculation ────────────────────────────────
                                const now = new Date()
                                const curTime = now.getHours() * 60 + now.getMinutes()
                                const [sH, sM] = (shift.start_time || "00:00").split(':').map(Number)
                                const [eH, eM] = (shift.end_time || "00:00").split(':').map(Number)
                                const startMin = sH * 60 + sM
                                const endMin = eH * 60 + eM
                                const isOvernight = endMin < startMin

                                let isShiftLiveTime = false
                                let isPastTime = false
                                let isFutureTime = false

                                if (isOvernight) {
                                  // Overnight: live = after start OR before end
                                  isShiftLiveTime = curTime >= startMin || curTime <= endMin
                                  if (!isShiftLiveTime) {
                                    // Morning-after window: after end, before start (e.g. 7AM–7PM)
                                    // We want this to be FUTURE for today's upcoming night shift
                                    isPastTime = false
                                    isFutureTime = true
                                  }
                                } else {
                                  isShiftLiveTime = curTime >= startMin && curTime <= endMin
                                  isPastTime = curTime > endMin
                                  isFutureTime = curTime < startMin
                                }
                                
                                if (!shift) return null

                                // ── 3-case status matrix ─────────────────────────────────────────
                                const hasAttendance = g.today_attendance
                                const hasAbs = hasAttendance?.status === 'absent'
                                const hasPresent = hasAttendance?.status === 'present' || hasAttendance?.status === 'late'

                                if (isFutureTime) {
                                  if (hasAbs) {
                                    statusColor = '#FF6B6B'; statusText = 'Pre-Absent'
                                  } else {
                                    statusColor = 'var(--clr-muted)'; statusText = `Starts at ${format12h(shift.start_time)}`
                                  }
                                } else if (isShiftLiveTime) {
                                  if (hasAbs) {
                                    statusColor = '#FF6B6B'; statusText = 'ABSENT'
                                  } else {
                                    statusColor = '#00E5A0'
                                    statusText = hasAttendance?.status === 'late' ? 'LATE' : 'ON DUTY'
                                  }
                                } else if (isPastTime) {
                                  if (hasAbs) {
                                    statusColor = '#FF6B6B'; statusText = 'ABSENT'
                                  } else {
                                    statusColor = '#00E5A0'
                                    statusText = `PRESENT + DONE AT ${format12h(shift.end_time).toUpperCase()}`
                                  }
                                }

                                // ── Action buttons ───────────────────────────────────────────────
                                const markAbsentBtn = (
                                  <button
                                    onClick={async () => {
                                      try {
                                        if (hasAttendance) {
                                          await api.patch(`/company/attendance/${hasAttendance.id}/`, { status: 'absent' })
                                        } else {
                                          const actingDate = new Date()
                                          if (isOvernight && curTime <= endMin) {
                                            actingDate.setDate(actingDate.getDate() - 1)
                                          }
                                          await api.post('/company/attendance/', {
                                            guard: g.id, site: site.id, shift: shift.id,
                                            status: 'absent', date: actingDate.toISOString().split('T')[0]
                                          })
                                        }
                                        fetchGuards()
                                      } catch(e) { console.error(e) }
                                    }}
                                    style={{ flex: 1, padding: '3px 0', background: 'rgba(255,107,107,0.12)', border: 'none', borderRadius: '5px', color: '#FF6B6B', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                                  >🔴 Mark Absent</button>
                                )
                                const undoAbsentBtn = (
                                  <button
                                    onClick={async () => {
                                      await api.patch(`/company/attendance/${hasAttendance.id}/`, { status: 'present' })
                                      fetchGuards()
                                    }}
                                    style={{ flex: 1, padding: '3px 0', background: 'rgba(0,229,160,0.12)', border: 'none', borderRadius: '5px', color: '#00E5A0', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                                  >✅ Undo Absent</button>
                                )
                                const reassignBtn = (
                                  <button
                                    onClick={() => setAssignModal({ open: true, shift, site })}
                                    title="Change Shift"
                                    style={{ padding: '3px 6px', background: 'rgba(124,92,255,0.12)', border: 'none', borderRadius: '5px', color: '#7C5CFF', fontSize: '0.6rem', cursor: 'pointer' }}
                                  >🔄</button>
                                )

                                return (
                                  <div key={g.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: `1px solid ${statusColor === '#00E5A0' ? 'rgba(0,229,160,0.15)' : statusColor === '#FF6B6B' ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.05)'}`, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                      <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>{g.guard_type === 'temporary' ? '⏱ Temp' : '🛡 Regular'}</div>
                                      {(g.all_today_attendances || []).filter(a => a.is_overtime).length > 0 && (
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#FFA940', background: 'rgba(255,169,64,0.12)', padding: '1px 5px', borderRadius: 4 }}>
                                          🕐 +{(g.all_today_attendances || []).filter(a => a.is_overtime).length} OT
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.62rem', color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>{statusText}</span>
                                    </div>
                                    {/* Actions */}
                                    {!isPastTime && (
                                      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                        {hasAbs ? undoAbsentBtn : markAbsentBtn}
                                        {reassignBtn}
                                      </div>
                                    )}
                                    {/* Overtime log button - show for guards with attendance and site with multiple shifts */}
                                    {hasPresent && (site.shifts || []).length > 1 && (
                                      <button
                                        onClick={() => setOvertimeModal({ guard: g, site })}
                                        style={{ marginTop: '2px', padding: '3px 6px', background: 'rgba(255,169,64,0.1)', border: '1px dashed rgba(255,169,64,0.3)', borderRadius: '5px', color: '#FFA940', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                                      >🕐 + Log Overtime</button>
                                    )}
                                  </div>
                                )
                              })}
                              {/* Vacant slots: count absent guards as needing replacement */}
                              {Array.from({ length: Math.max(0, site.num_securities - activeGuards.length) }).map((_, i) => (
                                <button 
                                  key={`vacant-${i}`} 
                                  onClick={() => setAssignModal({ open: true, shift, site })}
                                  className="btn-ghost vacant-slot-btn"
                                  style={{ padding: '8px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '100%', minHeight: '42px' }}
                                >
                                  <span>+</span>
                                  <span style={{ fontSize: '0.7rem' }}>Assign</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Available Guards Section */}
            <div className="card glass-card" style={{ marginTop: '30px' }}>
              <div className="card-header">
                <div className="card-title">🛡️ Guards Manager</div>
                <div className="card-sub">
                  Displaying {guards.filter(g => {
                    if (guardAssignmentStatusFilter === 'onduty') return g.is_on_duty
                    if (guardAssignmentStatusFilter === 'offduty') return !g.is_on_duty
                    return true
                  }).length} guards
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {guards
                  .filter(g => {
                    if (guardAssignmentStatusFilter === 'onduty') return g.is_on_duty
                    if (guardAssignmentStatusFilter === 'offduty') return !g.is_on_duty
                    return true
                  })
                  .map(g => (
                    <div key={g.id} className="table-row-hover" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {av(g.name, 32)}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{g.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>{g.guard_type} • <span style={{ color: g.is_on_duty ? '#00E5A0' : '#FF6B6B' }}>{g.is_on_duty ? 'On Duty' : 'Off Duty'}</span></div>
                      </div>
                      <button className="btn-icon" style={{ color: g.is_on_duty ? '#FF6B6B' : 'var(--clr-primary)' }} onClick={() => toggleDuty(g.id)}>
                        {g.is_on_duty ? '⏹️' : '➕'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
    </div>
  );
};

export default AssignmentsTab;
