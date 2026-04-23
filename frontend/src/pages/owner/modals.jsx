import React, { useState, useEffect } from 'react';
import { FI, FormCard } from '../../components/FormElements';
export function AssignGuardModal({ isOpen, shift, site, guards, onAssign, onCancel }) {
  const [selectedGuard, setSelectedGuard] = useState('')
  const [guardType, setGuardType] = useState('temporary')

  // Auto-detect if guard is already regular for this site
  useEffect(() => {
    if (!selectedGuard) return
    const g = guards.find(gu => gu.id === parseInt(selectedGuard))
    if (g && g.site === site?.id) {
      setGuardType('regular')
    } else {
      setGuardType('temporary')
    }
  }, [selectedGuard, site, guards])
  
  if (!isOpen) return null

  const doIntervalsOverlap = (i1, i2) => Math.max(i1[0], i2[0]) < Math.min(i1[1], i2[1]);
  const getIntervals = (startTime, endTime) => {
    const [sh, sm] = (startTime || "00:00").split(':').map(Number);
    const [eh, em] = (endTime || "00:00").split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return startMin <= endMin ? [[startMin, endMin]] : [[startMin, 1440], [0, endMin]];
  };
  const isClashing = (s1, e1, s2, e2) => {
    if (!s1 || !e1 || !s2 || !e2) return false;
    const ivs1 = getIntervals(s1, e1);
    const ivs2 = getIntervals(s2, e2);
    return ivs1.some(i => ivs2.some(j => doIntervalsOverlap(i, j)));
  };

  const offDutyGuards = guards.filter(g => {
    if (g.shift === shift?.id) return false;
    if (!g.shift_start_time || !g.shift_end_time) return true;
    return !isClashing(shift?.start_time, shift?.end_time, g.shift_start_time, g.shift_end_time);
  });

  const selectedGuardObj = guards.find(g => g.id === parseInt(selectedGuard))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card glass-card" style={{ width: '100%', maxWidth: '500px', padding: '30px', border: '1px solid var(--clr-primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛡️</div>
          <h2 style={{ fontSize: '1.4rem' }}>Assign Guard to {shift?.name}</h2>
          <p style={{ color: 'var(--clr-muted)', fontSize: '0.88rem', marginTop: '8px' }}>
            Site: {site?.name}
          </p>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <FI label="Select Guard" value={selectedGuard} onChange={e => setSelectedGuard(e.target.value)} 
              options={[{ v: '', l: 'Select Guard' }, ...offDutyGuards.map(g => ({ v: g.id, l: `${g.name} (${g.phone})` }))]} />
          
          <FI label="Assignment Type" value={guardType} onChange={e => setGuardType(e.target.value)} 
              options={[{ v: 'regular', l: 'Regular (Permanent)' }, { v: 'temporary', l: 'Temporary (Once)' }]} />

          {selectedGuardObj && (
            <div style={{ marginTop: '5px' }}>
              {selectedGuardObj.site === site?.id ? (
                <span className="badge" style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0', fontSize: '0.7rem' }}>✨ Regular Staff at this Site</span>
              ) : selectedGuardObj.site ? (
                <span className="badge" style={{ background: 'rgba(255,169,64,0.15)', color: '#FFA940', fontSize: '0.7rem' }}>⚠️ From Site: {selectedGuardObj.site_name}</span>
              ) : (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--clr-muted)', fontSize: '0.7rem' }}>⚪ Unassigned Guard</span>
              )}
            </div>
          )}

          {guardType === 'temporary' && selectedGuardObj && (
            <div style={{ background: 'rgba(124,92,255,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(124,92,255,0.2)', marginTop: '5px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-primary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>💰 Quick Salary Info</div>
              <div style={{ fontSize: '0.85rem' }}>Daily Salary: <strong>₹{selectedGuardObj.daily_rate}</strong> will be recorded for today.</div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '28px' }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-glow" onClick={() => onAssign({ guardId: selectedGuard, guardType })} disabled={!selectedGuard}>Assign Now</button>
        </div>
      </div>
    </div>
  )
}

export function TransferModal({ isOpen, guard, sites, onTransfer, onCancel, guards, bankAccounts = [] }) {
  const [f, setF] = useState({ 
    site: guard?.site || '', 
    shift: guard?.shift || '',
    guard_type: guard?.guard_type || 'regular'
  })
  
  if (!isOpen) return null

  const site = sites.find(s => s.id === parseInt(f.site))
  const shifts = site?.shifts || []
  const isFull = site && guards.filter(g => g.site === site.id && g.shift === parseInt(f.shift) && g.is_on_duty).length >= site.num_securities

  return (
    <FormCard title={`🚀 Transfer — ${guard?.name}`} 
      onSubmit={e => { e.preventDefault(); onTransfer(guard.id, f) }} 
      onCancel={onCancel}
      color="rgba(91,140,255,0.4)">
      <FI label="New Site" value={f.site} onChange={e => setF(p => ({ ...p, site: e.target.value, shift: '' }))} 
          options={[{ v: '', l: 'Select Site' }, ...sites.map(s => ({ v: s.id, l: s.name }))]} bankAccounts={bankAccounts} />
      <FI label="New Shift" value={f.shift} onChange={e => setF(p => ({ ...p, shift: e.target.value }))} 
          options={[{ v: '', l: 'Select Shift' }, ...shifts.map(s => {
            const count = guards.filter(g => g.site === site.id && g.shift === s.id && g.is_on_duty).length
            const full = count >= (site.num_securities || 0)
            return { v: s.id, l: `${s.name} (${count}/${site.num_securities || 0})${full ? ' (FULL)' : ''}`, disabled: full }
          })]} disabled={!f.site} bankAccounts={bankAccounts} />
      <FI label="Assignment Type" value={f.guard_type} onChange={e => setF(p => ({ ...p, guard_type: e.target.value }))} 
          options={[{ v: 'regular', l: 'Regular (Permanent)' }, { v: 'temporary', l: 'Temporary (Once)' }]} bankAccounts={bankAccounts} />
      {isFull && (
        <div style={{ gridColumn: '1/-1', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', padding: '12px', borderRadius: '10px', color: '#FF6B6B', fontSize: '0.85rem' }}>
          ⚠️ Capacity Full! Site already has {site?.num_securities} guards at this shift.
        </div>
      )}
    </FormCard>
  )
}

