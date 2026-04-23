import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
// ── Feature Tab Components ────────────────────────────────────────────────────
import OverviewTab from '../features/overview/OverviewTab'
import AttendanceTab from '../features/attendance/AttendanceTab'
import AssignmentsTab from '../features/owner/AssignmentsTab'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts'
import {
  MapPin, Shield, ShieldCheck, Plus, X,
  Search, Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, RotateCcw,
  ToggleLeft, ToggleRight, ClipboardList, Check, Users, User, Key,
  MoreVertical, Clock, Edit, Trash, Trash2, CheckCircle, FileText,
  RefreshCw, ArrowDownLeft, ArrowUpRight, PieChart as PieChartIcon, Layout, Globe
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import api from '../services/api'
import { useAuth } from '../components/AuthContext'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import InvoiceModal from '../components/InvoiceModal'

// ── Stable helpers (module-level — NEVER inside component) ───────────────────
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const agencyCreationYear = 2024; // Baseline for history selection

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

// Returns {isOpen, activeShift} — a site is OPEN if any shift is currently live
function isSiteOpen(site) {
  if (!site?.shifts?.length) return { isOpen: false, activeShift: null }
  const now = new Date()
  const curMin = now.getHours() * 60 + now.getMinutes()
  for (const shift of site.shifts) {
    if (!shift.start_time || !shift.end_time) continue
    const [sH, sM] = shift.start_time.split(':').map(Number)
    const [eH, eM] = shift.end_time.split(':').map(Number)
    const startMin = sH * 60 + sM
    const endMin = eH * 60 + eM
    const isOvernight = endMin < startMin
    const live = isOvernight
      ? (curMin >= startMin || curMin <= endMin)
      : (curMin >= startMin && curMin <= endMin)
    if (live) return { isOpen: true, activeShift: shift }
  }
  return { isOpen: false, activeShift: null }
}

function WheelColumn({ items, value, onChange }) {
  const ref = useRef(null)
  const isInternalScroll = useRef(false)
  const itemHeight = 40

  // Scroll to initial value
  useEffect(() => {
    const idx = items.indexOf(value)
    if (idx !== -1 && ref.current) {
      ref.current.scrollTop = idx * itemHeight
    }
  }, [items])

  const onScroll = () => {
    if (isInternalScroll.current) return
    const top = ref.current.scrollTop
    const idx = Math.round(top / itemHeight)
    if (items[idx] !== undefined && items[idx] !== value) {
      onChange(items[idx])
    }
  }

  return (
    <div className="wheel-column" ref={ref} onScroll={onScroll}>
      {items.map(it => (
        <div key={it} className={`wheel-item ${it === value ? 'selected' : ''}`} 
             onClick={() => { ref.current.scrollTo({ top: items.indexOf(it) * itemHeight, behavior: 'smooth' }) }}>
          {it}
        </div>
      ))}
    </div>
  )
}

function TimeWheelPicker({ value, onChange }) {
  // value is expected as "HH:mm" (24h)
  const [h24, m] = (value || "08:00").split(':')
  const hour24 = parseInt(h24)
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  const hour12Str = hour12.toString().padStart(2, '0')

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
  const periods = ['AM', 'PM']

  const update = (newH12, newM, newPeriod) => {
    let h = parseInt(newH12)
    if (newPeriod === 'PM' && h < 12) h += 12
    if (newPeriod === 'AM' && h === 12) h = 0
    const finalH24 = h.toString().padStart(2, '0')
    onChange(`${finalH24}:${newM}`)
  }

  return (
    <div className="wheel-container">
      <div className="wheel-highlight"></div>
      <WheelColumn items={hours} value={hour12Str} onChange={(val) => update(val, m, ampm)} />
      <div className="wheel-divider"></div>
      <WheelColumn items={minutes} value={m} onChange={(val) => update(hour12Str, val, ampm)} />
      <div className="wheel-divider"></div>
      <WheelColumn items={periods} value={ampm} onChange={(val) => update(hour12Str, m, val)} />
    </div>
  )
}

const formatCurrency = (val) => {
  const num = parseFloat(val || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  return `₹${num.toLocaleString('en-IN')}`;
};
const formatFullCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

function FI({ label, value, onChange, type = 'text', placeholder = '', options, required = false, span, bankAccounts = [] }) {
  return (
    <div className="form-group" style={span ? { gridColumn: '1/-1' } : {}}>
      <label className="form-label">{label}{required && ' *'}</label>
      {type === 'time-wheel' ? (
        <TimeWheelPicker value={value} onChange={(val) => onChange({ target: { value: val } })} />
      ) : options ? (
        <select className="form-input" style={{ color: '#fff' }} value={value} onChange={onChange}>
          {options.map(o => {
            // If it's a bank account option, try to find and append balance
            let labelText = o.l;
            if (labelText.includes('(') && labelText.includes(')') && bankAccounts?.length > 0) {
              const bank = bankAccounts.find(b => b.account_name === o.v);
              if (bank) labelText = `${o.v} — (${formatCurrency(bank.balance)})`;
            }
            return <option key={o.v} value={o.v} style={{ background: '#1e202d', color: '#fff' }}>{labelText}</option>
          })}
        </select>
      ) : (
        <input type={type} className="form-input" placeholder={placeholder}
          value={value} onChange={onChange} required={required} 
          onFocus={e => e.target.select()} />
      )}
    </div>
  )
}

function FormCard({ title, onSubmit, onCancel, children, color = 'rgba(124,92,255,0.4)' }) {
  return (
    <div className="card glass-card" style={{ marginBottom: '16px', padding: '20px', border: `1px solid ${color}` }}>
      <h3 style={{ marginBottom: '14px', fontWeight: 700, fontSize: '1.2rem' }}>{title}</h3>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{children}</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button type="submit" className="btn btn-primary btn-glow" style={{ padding: '10px 20px' }}>Confirm</button>
          <button type="button" className="btn" style={{ background: 'var(--clr-surface-2)', padding: '10px 20px' }} onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

// Edit Guard — own local state so parent re-renders don't reset inputs
function EditGuardForm({ guard, sites, onSave, onCancel, guards, bankAccounts = [] }) {
  const [f, setF] = useState(guard)
  const compactFI = { marginBottom: '12px' }
  const compactLabel = { marginBottom: '6px' }

  return (
    <FormCard title={`✏️ Edit Guard — ${f.name}`} 
      onSubmit={e => { e.preventDefault(); onSave(f) }} 
      onCancel={onCancel} 
      color="rgba(124,92,255,0.6)">
      <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FI label="Guard Name" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required bankAccounts={bankAccounts} />
        <FI label="Phone" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} required bankAccounts={bankAccounts} />
        <FI label="Salary (₹)" value={f.monthly_salary} onChange={e => setF(p => ({ ...p, monthly_salary: e.target.value }))} type="number" bankAccounts={bankAccounts} />
        <FI label="Type" value={f.guard_type} onChange={e => setF(p => ({ ...p, guard_type: e.target.value }))} options={[{ v: 'regular', l: '👤 Regular' }, { v: 'temporary', l: '⏳ Temp' }]} bankAccounts={bankAccounts} />
        
        <div style={{ gridColumn: '1/-1', marginTop: '4px', padding: '10px 14px', background: 'rgba(124,92,255,0.04)', borderRadius: '12px', border: '1px solid rgba(124,92,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem' }}>🏦</span>
            <h4 style={{ margin: 0, fontSize: '0.78rem', color: '#7C5CFF', fontWeight: 700 }}>Bank Details</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FI label="Bank Name" value={f.bank_name || ''} onChange={e => setF(p => ({ ...p, bank_name: e.target.value }))} placeholder="HDFC" bankAccounts={bankAccounts} />
            <FI label="Acc No" value={f.account_no || ''} onChange={e => setF(p => ({ ...p, account_no: e.target.value }))} placeholder="50100..." bankAccounts={bankAccounts} />
            <FI label="IFSC" value={f.ifsc_code || ''} onChange={e => setF(p => ({ ...p, ifsc_code: e.target.value }))} placeholder="HDFC0..." bankAccounts={bankAccounts} />
            <FI label="UPI (Opt)" value={f.upi_id || ''} onChange={e => setF(p => ({ ...p, upi_id: e.target.value }))} placeholder="name@upi" bankAccounts={bankAccounts} />
          </div>
        </div>

        <FI label="Residential Address" value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} span bankAccounts={bankAccounts} placeholder="Full address..." />
      </div>
    </FormCard>
  )
}

// Edit Site — own local state
function EditSiteForm({ site, onSave, onCancel, bankAccounts }) {
  const [f, setF] = useState(site)
  const stOpts = [
    { v: 'flat', l: '🏠 Flat / Residential' }, { v: 'bunglow', l: '🏡 Bunglow / Villa' },
    { v: 'company', l: '🏢 Company / Commercial' }, { v: 'other', l: '📍 Other' }
  ]
  return (
    <FormCard title={`✏️ Edit Site — ${f.name}`}
      onSubmit={e => { e.preventDefault(); onSave(f) }}
      onCancel={onCancel} color="rgba(0,229,160,0.35)">
      <FI label="Site Name" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required bankAccounts={bankAccounts} />
      <FI label="Site Type" value={f.site_type} onChange={e => setF(p => ({ ...p, site_type: e.target.value }))} options={stOpts} bankAccounts={bankAccounts} />
      <FI label="Monthly Amount (₹)" value={f.monthly_amount} onChange={e => setF(p => ({ ...p, monthly_amount: e.target.value }))} type="number" bankAccounts={bankAccounts} />
      <FI label="Invoice Type" value={f.invoice_format || 'normal'} onChange={e => setF(p => ({ ...p, invoice_format: e.target.value }))} options={[
        { v: 'normal', l: '📄 Normal Invoice' },
        { v: 'gst', l: '🧾 GST Invoice' }
      ]} bankAccounts={bankAccounts} />
      {f.invoice_format === 'gst' && (
        <FI label="Client GSTIN" value={f.client_gstin || ''} onChange={e => setF(p => ({ ...p, client_gstin: e.target.value }))} placeholder="24XXXXX1234X1Z5" bankAccounts={bankAccounts} />
      )}
      <FI label="Owner Receives In" value={f.bill_account_name || ''} onChange={e => setF(p => ({ ...p, bill_account_name: e.target.value }))} options={[
        { v: '', l: '— Not Linked —' },
        ...(bankAccounts || []).map(b => ({ v: b.account_name, l: `${b.account_name} (${b.bank_name})` }))
      ]} bankAccounts={bankAccounts} />
      <FI label="Client Sending Acct" value={f.client_account_name || ''} onChange={e => setF(p => ({ ...p, client_account_name: e.target.value }))} placeholder="Client UPI/Bank details" bankAccounts={bankAccounts} />
      <FI label="No. of Guards" value={f.num_securities} onChange={e => setF(p => ({ ...p, num_securities: e.target.value }))} type="number" bankAccounts={bankAccounts} />
      <FI label="Address" value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} span bankAccounts={bankAccounts} />
    </FormCard>
  )
}

// WhatsApp Report Parser Modal
function WhatsAppModal({ isOpen, onClose, onParse, loading }) {
  const [text, setText] = useState('')
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--clr-surface-1)', border: '1px solid #25D366', padding: '28px', borderRadius: '20px', width: '100%', maxWidth: '500px' }}>
        <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#25D366', fontSize: '1.5rem' }}>💬</span> WhatsApp Reporter</h3>
        <p style={{ color: 'var(--clr-muted)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>
          Paste your daily attendance report here. The system will match guard names and update their status (Present, Absent, or Late).
        </p>
        <textarea 
          style={{ width: '100%', height: '200px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', color: '#fff', fontSize: '0.9rem', outline: 'none', marginBottom: '20px' }}
          placeholder="Example:&#10;Ravi Kumar - Present&#10;Sunil - Absent"
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={e => e.target.select()}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#25D366', border: 'none' }} onClick={() => onParse(text)} disabled={loading || !text.trim()}>
            {loading ? 'Processing...' : 'Upload Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TransferModal({ isOpen, guard, sites, onTransfer, onCancel, guards, bankAccounts = [] }) {
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

function AssignGuardModal({ isOpen, shift, site, guards, onAssign, onCancel }) {
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

const InputField = ({ label, icon: Icon, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
      <Icon size={14} /> {label}
    </label>
    <div style={{ position: 'relative' }}>
      {children}
    </div>
  </div>
)

function SalaryPayModal({ isOpen, record, bankAccounts, onPay, onCancel, showToast }) {
  const [f, setF] = useState({ amount: 0, from_bank: '', payment_mode: 'online', notes: '', to_account_details: '' })
  
  useEffect(() => {
    if (record) {
      setF({
        amount: parseFloat(record.running_remaining ?? record.amount_remaining ?? 0).toFixed(2),
        from_bank: '',
        payment_mode: 'online',
        notes: '',
        to_account_details: record.to_account_details || ''
      })
    }
  }, [record, bankAccounts])

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onCancel() }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onCancel])

  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !record) return null

  const dailyRate   = parseFloat(record.daily_rate   || 0)
  const monthSal    = parseFloat(record.monthly_salary || 0)
  const totalDays   = record.total_days  || 30
  const daysPresent = record.days_present || 0
  const earned      = parseFloat(record.amount_earned || 0)
  const runningDue  = parseFloat(record.running_salary_due  || 0)
  const runningRem  = parseFloat(record.running_remaining   ?? record.amount_remaining ?? 0)
  const runningDays = record.running_days  || 0

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    padding: '14px 18px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  const handlePayClick = async () => {
    const amountNum = parseFloat(f.amount);
    if (isNaN(amountNum)) {
      showToast("Please enter a valid salary amount.");
      return;
    }
    if (f.payment_mode === 'online' && !f.from_bank) {
      showToast("Please select a source bank account.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onPay(f);
    } catch (err) {
      // Error handled by onPay wrapper in parent usually, but just in case
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div 
      style={{ 
        position: 'fixed', inset: 0, 
        background: 'rgba(0,0,0,0.85)', 
        backdropFilter: 'blur(16px) saturate(200%)', 
        zIndex: 1400, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        padding: '20px',
        animation: 'fadeIn 0.4s ease-out'
      }}
      onClick={onCancel}
    >
      <style>{`
        .premium-input:focus {
          border-color: #FF6B6B !important;
          background: rgba(255,107,107,0.06) !important;
          box-shadow: 0 0 0 4px rgba(255,107,107,0.15);
        }
        @keyframes modalEnter {
          from { transform: translateY(30px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .salary-modal-premium {
          animation: modalEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div 
        className="card glass-card salary-modal-premium" 
        style={{ 
          width: '100%', maxWidth: '520px', 
          padding: '28px 32px', 
          border: '1px solid rgba(255,255,255,0.12)', 
          borderRadius: '28px',
          position: 'relative',
          background: 'linear-gradient(165deg, rgba(30,32,45,0.98), rgba(15,18,28,1))',
          boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.8)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onCancel}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', padding: '8px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #FF6B6B, #FF8C42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: '0 10px 20px -5px rgba(255,107,107,0.4)' }}>
              <Banknote size={22} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>Salary Payout</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '2px' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>{record.guard_name}</span>
                <span style={{ opacity: 0.3 }}>&bull;</span>
                <span>{new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Card */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Base', val: `${monthSal}` },
              { label: 'Rate', val: `${dailyRate.toFixed(1)}` },
              { label: 'Days', val: `${daysPresent}` },
              { label: 'Earned', val: `${earned.toFixed(0)}`, color: '#00E5A0' },
            ].map((row, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '4px' }}>{row.label}</div>
                <div style={{ fontWeight: 800, color: row.color || '#fff', fontSize: '0.85rem' }}>{row.val}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: '16px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,107,107,0.8)', fontWeight: 800, marginBottom: '2px', textTransform: 'uppercase' }}>
                {runningRem < 0 ? 'Overpaid Balance' : 'Current Due'} ({runningDays}d)
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FF6B6B' }}>₹{runningDue.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,107,107,0.8)', fontWeight: 800, marginBottom: '2px', textTransform: 'uppercase' }}>
                {runningRem < 0 ? 'Negative Net' : 'Net Payable'}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#FF6B6B', textShadow: '0 0 30px rgba(255,107,107,0.3)', letterSpacing: '-0.03em' }}>
                {runningRem < 0 ? '-' : ''}₹{Math.abs(runningRem).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <InputField label="Confirm Payout Amount" icon={CreditCard}>
              <input 
                type="number" 
                className="premium-input" 
                style={inputStyle} 
                value={f.amount} 
                onChange={e => setF(p => ({ ...p, amount: e.target.value }))} 
                onFocus={e => e.target.select()}
                autoFocus
                required 
              />
            </InputField>
          </div>

          <InputField label="Payment Method" icon={ToggleRight}>
            <select 
              className="premium-input" 
              style={{ ...inputStyle, cursor: 'pointer', color: '#fff' }} 
              value={f.payment_mode} 
              onChange={e => setF(p => ({ ...p, payment_mode: e.target.value }))}
            >
              <option value="online" style={{ background: '#1e202d', color: '#fff' }}>Online Transfer</option>
              <option value="offline" style={{ background: '#1e202d', color: '#fff' }}>Cash / Hand</option>
            </select>
          </InputField>

          <InputField label="Source Account" icon={ShieldCheck}>
            <div style={{ position: 'relative' }}>
              <select 
                className="premium-input" 
                style={{ 
                  ...inputStyle, 
                  cursor: f.payment_mode === 'offline' ? 'not-allowed' : 'pointer', 
                  opacity: f.payment_mode === 'offline' ? 0.4 : 1,
                  borderColor: (f.payment_mode === 'online' && !f.from_bank) ? 'rgba(255, 107, 107, 0.4)' : inputStyle.borderColor,
                  boxShadow: (f.payment_mode === 'online' && !f.from_bank) ? '0 0 10px rgba(255, 107, 107, 0.1)' : 'none',
                  color: '#fff',
                  paddingRight: '100px'
                }} 
                value={f.from_bank} 
                onChange={e => setF(p => ({ ...p, from_bank: e.target.value }))} 
                disabled={f.payment_mode === 'offline'}
                required={f.payment_mode === 'online'}
              >
                <option value="" style={{ background: '#1e202d', color: '#fff' }}>— Select Account —</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id} style={{ background: '#1e202d', color: '#fff' }}>
                    {b.account_name} — ({formatCurrency(b.balance)})
                  </option>
                ))}
              </select>
              
              {f.from_bank && (
                <div style={{ 
                  position: 'absolute', 
                  right: '40px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  fontSize: '0.72rem', 
                  fontWeight: 800, 
                  color: '#00E5A0',
                  pointerEvents: 'none',
                  background: 'rgba(0,229,160,0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}>
                  {formatCurrency(bankAccounts.find(b => b.id.toString() === f.from_bank.toString())?.balance)}
                </div>
              )}
            </div>
          </InputField>

          <div style={{ gridColumn: '1 / -1' }}>
            <InputField label="Reference / Notes (Optional)" icon={FileText}>
              <input 
                type="text" 
                className="premium-input" 
                style={inputStyle} 
                placeholder="Transaction ID, Cheque No, etc." 
                value={f.notes} 
                onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
                onFocus={e => e.target.select()}
              />
            </InputField>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '12px', marginTop: '28px' }}>
          <button 
            type="button"
            className="btn" 
            style={{ height: '48px', borderRadius: '14px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }} 
            onClick={onCancel}
          >
            Cancel
          </button>
          
          <button 
            type="button"
            className="btn btn-primary btn-glow" 
            style={{ 
              height: '48px', 
              borderRadius: '14px', 
              background: 'linear-gradient(135deg, #FF6B6B, #FF8C42)', 
              border: 'none',
              fontSize: '1rem',
              fontWeight: 900,
              boxShadow: '0 10px 20px -8px rgba(255,107,107,0.5)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }} 
            disabled={isSubmitting}
            onClick={handlePayClick}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }} />
                Processing...
              </>
            ) : (
              <>Finalize Payout →</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const { tab: urlTab } = useParams()
  const navigate = useNavigate()

  // Valid tabs for each role
  const VALID_TABS = ['overview', 'assignments', 'attendance', 'guards', 'sites', 'staff', 'salary', 'payments', 'wallet', 'bank', 'supervisors', 'analysis', 'visits', 'joinrequests', 'invites']
  const tab = VALID_TABS.includes(urlTab) ? urlTab : 'overview'

  // Navigate to a tab by updating the URL
  const setTab = (newTab) => {
    const role = user?.role || 'owner'
    navigate(`/${role}/${newTab}`, { replace: false })
  }

  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const bankGridRef = useRef(null)
  const showToast = (text) => {
    setToast('')
    requestAnimationFrame(() => requestAnimationFrame(() => setToast(text)))
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

  const [stats, setStats]             = useState({})
  const [sites, setSites]             = useState([])
  const [guards, setGuards]           = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [admins, setAdmins]           = useState([])
  const [codes, setCodes]             = useState([])
  const [wallet, setWallet]           = useState(null)
  const [requests, setRequests]       = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [bankStats, setBankStats]       = useState([])
  const [bankTxns, setBankTxns]         = useState([])
  const [bankStatement, setBankStatement] = useState(null)  // full statement response
  const [activeBankId, setActiveBankId] = useState(null)
  const [txnDateRange, setTxnDateRange] = useState(() => {
    const today = new Date()
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6)
    return {
      start: weekAgo.toISOString().slice(0, 10),
      end:   today.toISOString().slice(0, 10),
    }
  })
  const [showAddBank, setShowAddBank]   = useState(false)
  const [editBankData, setEditBankData] = useState(null)
  const [statementModal, setStatementModal] = useState(null) // bank object for statement download
  const [bankForm, setBankForm]         = useState({ account_name: '', bank_name: '', account_no: '', ifsc: '', upi_id: '', balance: 0, transaction_limit: 2000000, is_default: false })
  const [salaries, setSalaries]         = useState([])
  const [salaryMonth, setSalaryMonth]   = useState(new Date().getMonth() + 1)
  const [salaryYear, setSalaryYear]     = useState(new Date().getFullYear())
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [search, setSearch]           = useState('')
  const [salarySearch, setSalarySearch] = useState('')
  const [billingSearch, setBillingSearch] = useState('')
  const [openMenu, setOpenMenu]       = useState(null)
  const [guardAttendanceFilter, setGuardAttendanceFilter] = useState('all') // 'all', 'present', 'absent'

  // Modals / edit state
  const [showAddSup, setShowAddSup]       = useState(false)
  const [showAddAdmin, setShowAddAdmin]   = useState(false)
  const [showAddGuard, setShowAddGuard]   = useState(false)
  const [showAddSite, setShowAddSite]     = useState(false)
  const [showAddClient, setShowAddClient] = useState(null) // Holds siteId
  const [showWhatsApp, setShowWhatsApp]   = useState(false)
  const [showTransferGuard, setShowTransferGuard] = useState(null)
  const [editSiteData, setEditSiteData]   = useState(null)
  const [editGuardData, setEditGuardData] = useState(null)
  const [invoiceSite, setInvoiceSite]     = useState(null)
  const [viewingHistorySite, setViewingHistorySite] = useState(null)
  const [genLoading, setGenLoading]       = useState(false)
  
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [supForm, setSupForm]     = useState({ name: '', email: '', phone: '', password: '' })
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', password: '', confirm_password: '' })
  const [guardForm, setGuardForm] = useState({ name: '', phone: '', address: '', monthly_salary: 0, advance_paid: 0, guard_type: 'regular', site: '', shift: '' })
  const [siteForm, setSiteForm]   = useState({ name: '', site_type: 'flat', monthly_amount: 0, num_securities: 0, address: '', shift_name: 'Day Shift', shift_start_time: '08:00', shift_end_time: '20:00', invoice_format: 'normal', client_gstin: '', bill_account_name: '', client_account_name: '' })
  const [payingSalary, setPayingSalary] = useState(null)
  const [undoingSalary, setUndoingSalary] = useState(null)

  // Wallet Modals
  const [walletModal, setWalletModal] = useState(null) // 'deposit' | 'withdraw' | 'give_guard' | 'give_sup'
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletForm, setWalletForm] = useState({ amount: '', note: '', source: 'bank', bank_account_id: '', guard_id: '', supervisor_id: '', admin_id: '' })
  const resetWalletForm = () => setWalletForm({ amount: '', note: '', source: 'bank', bank_account_id: '', guard_id: '', supervisor_id: '', admin_id: '' })

  const handleWalletAction = async () => {
    const amt = parseFloat(walletForm.amount)
    if (!amt || amt <= 0) { showToast('❌ Enter a valid amount'); return }
    setWalletLoading(true)
    try {
      if (walletModal === 'deposit') {
        const payload = { amount: amt, note: walletForm.note || 'Deposit', source: walletForm.source }
        if (walletForm.source === 'bank') payload.bank_account_id = walletForm.bank_account_id
        await api.post('/wallet/deposit/', payload)
        showToast('✅ Deposited successfully')
      } else if (walletModal === 'withdraw') {
        const payload = { amount: amt, note: walletForm.note || 'Withdrawal', source: walletForm.source }
        if (walletForm.source === 'bank') payload.bank_account_id = walletForm.bank_account_id
        await api.post('/wallet/withdraw/', payload)
        showToast('✅ Withdrawn successfully')
      } else if (walletModal === 'give_guard') {
        if (!walletForm.guard_id) { showToast('❌ Select a guard'); setWalletLoading(false); return }
        await api.post('/wallet/give-guard/', { amount: amt, note: walletForm.note, guard_id: walletForm.guard_id })
        showToast('✅ Advance given to guard')
        fetchSalaries(salaryMonth, salaryYear)
      } else if (walletModal === 'give_sup') {
        if (!walletForm.supervisor_id) { showToast('❌ Select a supervisor'); setWalletLoading(false); return }
        await api.post('/wallet/give-supervisor/', { amount: amt, note: walletForm.note, supervisor_id: walletForm.supervisor_id })
        showToast('✅ Amount transferred to supervisor')
      } else if (walletModal === 'give_admin') {
        if (!walletForm.admin_id) { showToast('❌ Select an admin'); setWalletLoading(false); return }
        await api.post('/wallet/give-admin/', { amount: amt, note: walletForm.note, admin_id: walletForm.admin_id })
        showToast('✅ Amount transferred to admin')
      }
      setWalletModal(null)
      resetWalletForm()
      fetchWallet()
      fetchBankAccounts()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Transaction failed'}`)
    } finally { setWalletLoading(false) }
  }

  const [assignmentFilter, setAssignmentFilter] = useState('all') // 'all', 'allocated', 'unallocated'
  const [guardAssignmentStatusFilter, setGuardAssignmentStatusFilter] = useState('all') // 'all', 'present', 'absent'

  // Staff Tab
  const [staffRole, setStaffRole] = useState('all') // 'all', 'admins', 'supervisors', 'guards'

  const closeStaffForms = () => {
    setShowAddAdmin(false)
    setShowAddSup(false)
    setShowAddGuard(false)
    setEditGuardData(null)
  }

  // Escape key to close forms
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeStaffForms()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Billing Tab
  const [billingMode, setBillingMode] = useState('overview')
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])

  // Attendance Tab
  const [attendanceMode, setAttendanceMode] = useState('daily') // 'daily' or 'monthly'
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  })
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState([])
  const [attLoading, setAttLoading] = useState(false)
  const [attendanceWhatsApp, setAttendanceWhatsApp] = useState('')

  // Overtime Modal
  const [overtimeModal, setOvertimeModal] = useState(null) // { guard, site, currentShifts }
  const [receiptModal, setReceiptModal] = useState(null)
  const [overtimeShiftId, setOvertimeShiftId] = useState('')
  const [overtimeLoading, setOvertimeLoading] = useState(false)
  const [attendanceSearch, setAttendanceSearch] = useState('')

  const logOvertimeShift = async () => {
    if (!overtimeShiftId || !overtimeModal) return
    setOvertimeLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await api.post('/company/attendance/', {
        guard:       overtimeModal.guard.id,
        site:        overtimeModal.guard.site,
        shift:       parseInt(overtimeShiftId),
        date:        today,
        status:      'present',
        is_overtime: true,
        notes:       `Overtime shift logged by manager`
      })
      showToast(`✅ Overtime shift logged for ${overtimeModal.guard.name}`)
      setOvertimeModal(null)
      setOvertimeShiftId('')
      fetchGuards()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Already logged for this shift'}`)
    } finally { setOvertimeLoading(false) }
  }
  
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

  // Clear search on tab/sub-tab change
  useEffect(() => {
    setSearch('')
    setAttendanceSearch('')
  }, [tab, attendanceMode, staffRole, billingMode, assignmentFilter, guardAssignmentStatusFilter])

  // Real-time Clock
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])  
  // New Secure Delete State
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, name, type, title }
  const [isDeleting, setIsDeleting]       = useState(false)

  // ── Mobile-Style Back Button Logic ───────────────────────────────────────────
  const backState = useRef({ formsOpen: false, tab: 'overview' })
  const lastBackPress = useRef(0)

  // Sync ref without forcing re-binds of the popstate listener
  useEffect(() => {
    backState.current = {
      formsOpen: !!(showAddSup || showAddAdmin || showAddGuard || showAddSite || showWhatsApp || editSiteData || editGuardData),
      tab: tab
    }
  }, [showAddSup, showAddAdmin, showAddGuard, showAddSite, showWhatsApp, editSiteData, editGuardData, tab])

  useEffect(() => {
    // 1. Trap the user manually so the browser back button fires popstate instead of exiting
    window.history.pushState({ active_dashboard: true }, '')

    const handlePop = () => {
      const state = backState.current

      // Condition 1: Close all forms
      if (state.formsOpen) {
        setShowAddSup(false); setShowAddAdmin(false); setShowAddGuard(false); setShowAddSite(false); setShowWhatsApp(false);
        setEditSiteData(null); setEditGuardData(null);
        window.history.pushState({ active_dashboard: true }, '') // Trap again
        return
      }

      // Condition 2: Return to Overview Tab
      if (state.tab !== 'overview') {
        setTab('overview')
        window.history.pushState({ active_dashboard: true }, '') // Trap again
        return
      }

      // Condition 3: At Overview. Press twice to exit.
      const now = Date.now()
      if (now - lastBackPress.current < 2000) {
        window.history.back() // The second press allows actual exit
        return
      } else {
        lastBackPress.current = now
        showToast('Press Back again to exit')
        window.history.pushState({ active_dashboard: true }, '') // Trap again for the 2 sec window
      }
    }

    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])
  // ───────────────────────────────────────────────────────────────────────────

  const fetchStats   = useCallback(async () => { try { const r = await api.get('/auth/owner-stats/'); setStats(r.data) } catch {} }, [])
  const fetchSites   = useCallback(async () => { try { const r = await api.get('/company/sites/'); setSites(r.data) } catch {} }, [])
  const fetchGuards  = useCallback(async () => { try { const r = await api.get('/company/guards/'); setGuards(r.data) } catch {} }, [])
  const fetchSups    = useCallback(async () => { try { const r = await api.get('/auth/agency-users/?role=supervisor'); setSupervisors(r.data) } catch {} }, [])
  const fetchAdmins  = useCallback(async () => { try { const r = await api.get('/auth/agency-users/?role=admin'); setAdmins(r.data) } catch {} }, [])
  const fetchCodes   = useCallback(async () => { try { const r = await api.get('/auth/my-codes/'); setCodes(r.data) } catch {} }, [])
  const fetchWallet  = useCallback(async () => { try { const r = await api.get('/wallet/my/'); setWallet(r.data) } catch {} }, [])
  const fetchRequests = useCallback(async () => { try { const r = await api.get('/auth/join-requests/'); setRequests(r.data) } catch {} }, [])
  const fetchBankAccounts = useCallback(async () => { try { const r = await api.get('/billing/bank-accounts/'); setBankAccounts(r.data) } catch {} }, [])
  const fetchBankStats    = useCallback(async () => { try { const r = await api.get('/billing/bank-accounts/stats/'); setBankStats(r.data) } catch {} }, [])
  const fetchBankTxns = useCallback(async (id, startDate, endDate) => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('start_date', startDate)
      if (endDate)   params.set('end_date',   endDate)
      const q = params.toString()
      const url = `/billing/bank-accounts/${id}/transactions/${q ? '?' + q : ''}`
      const r = await api.get(url)
      setBankStatement(r.data)
      setBankTxns(r.data.transactions || [])
    } catch (err) {
      console.error("Failed to fetch bank txns:", err)
    }
  }, [])
  const fetchPayments     = useCallback(async () => { try { const r = await api.get('/billing/payments/'); setPayments(r.data) } catch {} }, [])
  const fetchBills        = useCallback(async () => { try { const r = await api.get('/billing/bills/'); setBills(r.data) } catch {} }, [])
  const fetchSalaries     = useCallback(async (m, y) => { 
    try { 
      setSalaryLoading(true); 
      const targetM = m || salaryMonth;
      const targetY = y || salaryYear;
      const r = await api.get(`/salary/?month=${targetM}&year=${targetY}`); 
      setSalaries(r.data); 
    } catch {} finally { setSalaryLoading(false); } 
  }, [salaryMonth, salaryYear])

  const handleUndoPayout = async (record) => {
    try {
      await api.post(`/salary/${record.id}/undo/`)
      showToast('✅ Last payment undone and restored')
      setUndoingSalary(null)
      fetchSalaries()
      fetchBankStats()
      fetchBankAccounts()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Failed to undo payment'}`)
    }
  }

  useEffect(() => {
    if (tab !== 'billing') setActiveBankId(null)
  }, [tab])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeBankId && !e.target.closest('.bank-account-card')) {
        setActiveBankId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeBankId])

  useEffect(() => {
    if (tab === 'attendance') fetchAttendance()
    if (tab === 'salary' || tab === 'analysis') fetchSalaries()
  }, [tab, attendanceDate, attendanceMonth, attendanceMode, fetchAttendance, fetchSalaries, salaryMonth, salaryYear])

  // When the 'guards' URL tab is hit (supervisor sidebar), pre-filter staff tab to guards
  useEffect(() => {
    if (urlTab === 'guards') setStaffRole('guards')
    if (urlTab === 'supervisors') setStaffRole('supervisors')
  }, [urlTab])

  useEffect(() => {
    fetchStats(); fetchSites(); fetchGuards(); fetchSups(); fetchAdmins(); fetchCodes(); fetchWallet(); fetchRequests(); fetchBankAccounts(); fetchBankStats(); fetchPayments(); fetchBills()
    api.post('/auth/heartbeat/').catch(() => {}) // Initial heartbeat
    const iv = setInterval(() => { 
      fetchStats(); fetchGuards(); fetchSups(); fetchAdmins(); fetchRequests(); fetchBills()
      api.post('/auth/heartbeat/').catch(() => {})
    }, 5000)
    return () => clearInterval(iv)
  }, [fetchStats, fetchSites, fetchGuards, fetchSups, fetchAdmins, fetchCodes, fetchWallet, fetchRequests, fetchBankAccounts, fetchBankStats, fetchPayments, fetchBills])

  useEffect(() => {
    const h = () => setOpenMenu(null)
    window.addEventListener('click', h)
    
    // Global ESC handler for standard dashboard modals
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        // Close modals in reverse order of priority
        if (receiptModal) setReceiptModal(null)
        else if (invoiceSite) setInvoiceSite(null) 
        else if (viewingHistorySite) setViewingHistorySite(null)
        else if (overtimeModal) setOvertimeModal(null)
        else if (confirmDelete) setConfirmDelete(null)
        else if (showAddSite) setShowAddSite(false)
        else if (showAddGuard) setShowAddGuard(false)
        else if (showAddSup) setShowAddSup(false)
        else if (showAddAdmin) setShowAddAdmin(false)
        else if (showAddClient) setShowAddClient(null)
        else if (editSiteData) setEditSiteData(null)
        else if (editGuardData) setEditGuardData(null)
      }
    }
    window.addEventListener('keydown', handleEsc)

    return () => {
      window.removeEventListener('click', h)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [receiptModal, invoiceSite, viewingHistorySite, overtimeModal, confirmDelete, showAddSite, showAddGuard, showAddSup, showAddAdmin, showAddClient, editSiteData, editGuardData])

  const handleGenerateBillClick = (s) => {
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()
    const hasCurrentMonthBill = bills.some(b => b.site === s.id && b.bill_month === currentMonth && b.bill_year === currentYear)
    
    if (hasCurrentMonthBill) {
      if (!window.confirm(`A bill has already been generated for ${s.name} this month (${new Date(2000, currentMonth - 1).toLocaleString('default', { month: 'long' })} ${currentYear}). Are you sure you want to generate another one?`)) {
        return
      }
    }
    setInvoiceSite({ ...s, agency_name: s.agency_name || user?.agency_name })
  }

  const deleteBill = async (billId) => {
    if (!window.confirm("Are you sure you want to delete/unsend this bill? If the client has already made a payment, this might cause inconsistencies.")) return
    try {
      await api.delete(`/billing/bills/${billId}/`)
      showToast("✅ Bill deleted successfully")
      fetchBills()
      fetchPayments()
    } catch (err) {
      showToast("❌ Failed to delete bill")
    }
  }

  const markBillPaid = async (billId) => {
    if (!window.confirm("Mark this bill as fully paid? This will set remaining amount to 0.")) return
    try {
      await api.patch(`/billing/bills/${billId}/`, { remaining: 0 })
      showToast("✅ Bill marked as paid")
      fetchBills()
    } catch (err) {
      showToast("❌ Failed to update bill")
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  const createSup = async (e) => {
    e.preventDefault()
    const phoneRegex = /^(\d{10}|\+\d{8,15})$/
    if (!phoneRegex.test(supForm.phone.replace(/[\s-]/g, ''))) {
      showToast('❌ Invalid phone. Use 10 digits or +CountryCode')
      return
    }
    try {
      await api.post('/auth/create-agency-user/', { ...supForm, role: 'supervisor' })
      showToast('✅ Supervisor created!')
      setShowAddSup(false); setSupForm({ name: '', email: '', phone: '', password: '' })
      fetchSups(); fetchStats()
    } catch (err) { showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) }
  }
  const createAdmin = async (e) => {
    e.preventDefault()
    const phoneRegex = /^(\d{10}|\+\d{8,15})$/
    if (!phoneRegex.test(adminForm.phone.replace(/[\s-]/g, ''))) {
      showToast('❌ Invalid phone. Use 10 digits or +CountryCode')
      return
    }
    try {
      await api.post('/auth/create-agency-user/', { ...adminForm, role: 'admin' })
      showToast('✅ Admin created!')
      setShowAddAdmin(false); setAdminForm({ name: '', email: '', phone: '', password: '' })
      fetchAdmins(); fetchStats()
    } catch (err) { showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) }
  }

  const createClient = async (e) => {
    e.preventDefault()
    if (!showAddClient) return
    const siteId = showAddClient

    if (clientForm.password !== clientForm.confirm_password) {
      showToast('❌ Passwords do not match')
      return
    }
    if (checkPasswordStrength(clientForm.password).score < 2) {
      showToast('❌ Password is too weak')
      return
    }

    try {
      // 1. Create the user
      const r = await api.post('/auth/create-agency-user/', { ...clientForm, confirm_password: undefined, role: 'client' })
      const newUser = r.data
      
      // 2. Link the user to the site
      await api.patch(`/company/sites/${siteId}/`, { client_user: newUser.id })
      
      showToast('✅ Client Login Created & Linked!')
      setShowAddClient(null)
      setClientForm({ name: '', email: '', phone: '', password: '', confirm_password: '' })
      fetchSites()
    } catch (err) { 
      showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) 
    }
  }

  const unlinkClient = async (siteId) => {
    if (!window.confirm('🗑️ PROCEED WITH DELETION?\n\nThis will permanently delete the Client\'s login account and they will lose all access to the panel immediately.')) return
    try {
      await api.post(`/company/sites/${siteId}/unlink-client/`)
      showToast('🗑️ Client login deleted')
      fetchSites()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Unlink failed'}`)
    }
  }

  const checkPasswordStrength = (p) => {
    if (!p) return { score: 0, label: 'None', color: 'rgba(255,255,255,0.05)', width: '0%' }
    let s = 0
    if (p.length > 5) s++
    if (/[0-9]/.test(p)) s++
    if (/[A-Z]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    
    const levels = [
      { score: 0, label: 'Too Short', color: '#ff4d6d', width: '25%' },
      { score: 1, label: 'Weak',     color: '#ff4d6d', width: '25%' },
      { score: 2, label: 'Fair',     color: '#ffa940', width: '50%' },
      { score: 3, label: 'Good',     color: '#5b8cff', width: '75%' },
      { score: 4, label: 'Strong',   color: '#00e5a0', width: '100%' },
    ]
    return levels[s]
  }

  // ── Code Generation ──────────────────────────────────────────────────────────
  const [newCode, setNewCode] = useState(null)
  const generateCode = async (role) => {
    setGenLoading(true); setNewCode(null)
    try { const r = await api.post('/auth/generate-code/', { role }); setNewCode(r.data); fetchCodes(); showToast('✨ Code Generated') } catch { showToast('❌ Failed') }
    setGenLoading(false)
  }
  const copyCode = (codeStr) => {
    navigator.clipboard.writeText(codeStr); showToast('📋 Copied!')
  }
  const deleteCode = async (id) => {
    if (!window.confirm('Delete this active code?')) return
    setCodes(prev => prev.filter(c => c.id !== id))
    if (newCode?.id === id) setNewCode(null)
    try { await api.delete(`/auth/codes/${id}/delete/`); fetchCodes() } catch { fetchCodes(); showToast('❌ Failed') }
  }
  const createGuard = async (e) => {
    e.preventDefault()
    const phoneRegex = /^(\d{10}|\+\d{8,15})$/
    if (!phoneRegex.test(guardForm.phone.replace(/[\s-]/g, ''))) {
      showToast('❌ Invalid phone. Use 10 digits or +CountryCode')
      return
    }
    try {
      await api.post('/company/guards/', guardForm)
      showToast('✅ Guard added!')
      setShowAddGuard(false); setGuardForm({ name: '', phone: '', address: '', monthly_salary: 0, advance_paid: 0, guard_type: 'regular', site: '', shift: '' })
      fetchGuards(); fetchStats()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Failed'
      showToast(`❌ ${msg}`)
    }
  }
  const saveGuard = async (formData) => {
    const phoneRegex = /^(\d{10}|\+\d{8,15})$/
    if (!phoneRegex.test(formData.phone.replace(/[\s-]/g, ''))) {
      showToast('❌ Invalid phone. Use 10 digits or +CountryCode')
      return
    }
    try {
      await api.patch(`/company/guards/${formData.id}/`, formData)
      showToast('✅ Guard updated!')
      setEditGuardData(null); fetchGuards()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Failed'
      showToast(`❌ ${msg}`)
    }
  }
  const toggleDuty = async (id) => {
    const guard = guards.find(g => g.id === id)
    try { 
      const res = await api.post(`/company/guards/${id}/toggle-duty/`); 
      const newStatus = res.data.is_on_duty
      if (newStatus) {
        showToast(`✅ ${guard?.name || 'Guard'} is now ON DUTY`)
      } else {
        const overtime = res.data.overtime
        showToast(overtime
          ? `⏰ ${guard?.name || 'Guard'} marked PRESENT (Late Checkout)`
          : `🔴 ${guard?.name || 'Guard'} is now OFF DUTY (marked Present)`
        )
      }
      fetchGuards(); fetchStats() 
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error === 'capacity_reached') {
        setShowTransferGuard(id)
      } else {
        showToast(`❌ ${err.response?.data?.detail || 'Failed'}`)
      }
    }
  }

  const handleTransfer = async (transferData) => {
    try {
      // 1. Update the guard record with the new site/shift
      await api.patch(`/company/guards/${transferData.id}/`, {
        site: transferData.site,
        shift: transferData.shift,
        guard_type: transferData.guard_type
      })
      // 2. Clear modal and refresh data
      setShowTransferGuard(null)
      fetchGuards()
      // 3. Immediately set them on duty at the new location
      await api.post(`/company/guards/${transferData.id}/toggle-duty/`)
      showToast('✅ Transferred & Set On Duty')
      fetchGuards(); fetchStats()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Transfer failed'}`)
    }
  }
  const deleteGuard = (guard) => {
    setConfirmDelete({ id: guard.id, name: guard.name, type: 'guard', title: 'Delete Guard' })
  }
  const createSite = async (e) => {
    e.preventDefault()
    try {
      await api.post('/company/sites/', siteForm)
      showToast('✅ Site added!')
      setShowAddSite(false); setSiteForm({ name: '', site_type: 'company', address: '', monthly_amount: 0, bill_account_name: '', num_securities: 0, shift_name: 'Day', shift_start_time: '08:00', shift_end_time: '18:00' })
      fetchSites(); fetchStats()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Failed'
      showToast(`❌ ${msg}`)
    }
  }

  const handleWhatsAppReport = async (text) => {
    setGenLoading(true)
    try {
      const res = await api.post('/company/guards/bulk-attendance/', { text })
      showToast(`✅ ${res.data.count} updates processed!`)
      setShowWhatsApp(false)
      fetchGuards()
    } catch (err) {
      showToast('❌ Report parsing failed')
    } finally { setGenLoading(false) }
  }

  const getShiftStatus = (guard) => {
    if (!guard.site || !guard.shift) return 'none'
    const site = sites.find(s => s.id === guard.site)
    const shift = site?.shifts?.find(s => s.id === guard.shift)
    if (!shift) return 'none'

    const [sh, sm] = shift.start_time.split(':').map(Number)
    const [eh, em] = shift.end_time.split(':').map(Number)
    
    const start = new Date(now); start.setHours(sh, sm, 0)
    const end = new Date(now); end.setHours(eh, em, 0)
    
    // Handle overnight shifts
    if (end < start) {
      if (now < end) start.setDate(start.getDate() - 1)
      else end.setDate(end.getDate() + 1)
    }

    const isDuringShift = now >= start && now <= end
    
    if (guard.is_on_duty && isDuringShift) return 'ok'
    if (!guard.is_on_duty && isDuringShift) return 'late'
    if (guard.is_on_duty && !isDuringShift) return 'overtime'
    return 'none'
  }
  const saveSite = async (formData) => {
    try { await api.patch(`/company/sites/${formData.id}/`, formData); showToast('✅ Site updated!'); setEditSiteData(null); fetchSites() } catch { showToast('❌ Failed') }
  }
  
  const executeDelete = async () => {
    if (!confirmDelete) return
    setIsDeleting(true)
    const { id, type } = confirmDelete
    
    let url = ''
    let refreshFuncs = []
    
    if (type === 'site') {
      url = `/company/sites/${id}/`
      refreshFuncs = [fetchSites]
    } else if (type === 'guard') {
      url = `/company/guards/${id}/`
      refreshFuncs = [fetchGuards]
    } else if (type === 'supervisor' || type === 'admin') {
      url = `/auth/agency-users/${id}/delete/`
      refreshFuncs = [fetchSups, fetchAdmins]
    }

    try {
      await api.delete(url)
      setConfirmDelete(null) // Instant feedback: close modal
      showToast('🗑️ Deleted successfully')
      // Fire refreshes in background for smoothness
      refreshFuncs.forEach(f => f())
      fetchStats()
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Deletion failed.'
      showToast(`❌ ${msg}`)
    } finally {
      setIsDeleting(false)
    }
  }
  const toggleSite = async (site) => {
    try { await api.patch(`/company/sites/${site.id}/`, { is_active: !site.is_active }); showToast('🔄 Updated'); fetchSites() } catch {}
  }
  const approveReq = async (id) => {
    try { await api.post(`/auth/join-requests/${id}/approve/`); showToast('✅ Approved!'); fetchRequests(); fetchStats() } catch (err) { showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) }
  }
  const rejectReq = async (id) => {
    try { await api.post(`/auth/join-requests/${id}/reject/`); showToast('🚫 Rejected'); fetchRequests() } catch { showToast('❌ Failed') }
  }

  // ── Shifts ───────────────────────────────────────────────────────────────────
  const createShift = async (siteId, shiftData) => {
    try { await api.post(`/company/sites/${siteId}/shifts/`, shiftData); showToast('✅ Shift added'); fetchSites() } catch { showToast('❌ Failed') }
  }
  const deleteShift = async (id) => {
    if (!window.confirm('Delete shift?')) return
    try { await api.delete(`/company/shifts/${id}/`); showToast('🗑️ Shift deleted'); fetchSites() } catch (err) { showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) }
  }
  const updateShift = async (id, payload) => {
    try { await api.patch(`/company/shifts/${id}/`, payload); showToast('✅ Shift updated'); fetchSites() } catch { showToast('❌ Failed') }
  }
  // ── Modals / Forms for Shifts (Active Data State) ──────────────────────────
  const [activeShiftSite, setActiveShiftSite] = useState(null)
  const [shiftEditData, setShiftEditData] = useState(null)
  const [shiftAddData, setShiftAddData] = useState({ name: 'Night', start_time: '18:00', end_time: '08:00' })
  const [assignModal, setAssignModal] = useState({ open: false, shift: null, site: null })

  const handleAssignGuard = async ({ guardId, guardType }) => {
    try {
      await api.post(`/company/guards/${guardId}/assign/`, {
        site: assignModal.site.id,
        shift: assignModal.shift.id,
        guard_type: guardType
      })
      showToast('✅ Guard assigned successfully')
      setAssignModal({ open: false, shift: null, site: null })
      fetchGuards()
      fetchStats()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Assignment failed'}`)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const av = (name, size = 36) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
  const typeLabel = { flat: '🏠 Flat', bunglow: '🏡 Bunglow', company: '🏢 Company', other: '📍 Other' }
  const fAdmins = (admins || []).filter(a => (a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.email || '').toLowerCase().includes(search.toLowerCase()) || (a.phone || '').includes(search))
  const fSups   = (supervisors || []).filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.email || '').toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search))
  const fGuards = (guards || []).filter(g => {
    const matchesSearch = (g.name || '').toLowerCase().includes(search.toLowerCase()) || (g.phone || '').includes(search);
    if (!matchesSearch) return false;
    if (guardAttendanceFilter === 'all') return true;
    const isAbsent = g.today_attendance?.status === 'absent';
    return guardAttendanceFilter === 'present' ? !isAbsent : isAbsent;
  });
  const fSites  = (sites || []).filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()))

  const allStaffCombined = [
    ...fAdmins.map(x => ({ ...x, internal_role: 'admin' })),
    ...fSups.map(x => ({ ...x, internal_role: 'supervisor' })),
    ...fGuards.map(x => ({ ...x, internal_role: 'guard' }))
  ].sort((a,b) => (a.name || '').localeCompare(b.name || ''))

  const totalSalary = guards.reduce((a, g) => a + parseFloat(g.monthly_salary || 0), 0)
  const totalRevenue = sites.reduce((a, s) => a + parseFloat(s.monthly_amount || 0), 0)
  const PIE_COLORS = ['#7C5CFF', '#00E5A0', '#5B8CFF', '#FF6B6B']

  // ─── Options (kept inside component because they depend on `sites` state) ────
  const siteTypeOpts = [{ v: 'flat', l: '🏠 Flat / Residential' }, { v: 'bunglow', l: '🏡 Bunglow / Villa' }, { v: 'company', l: '🏢 Company / Commercial' }, { v: 'other', l: '📍 Other' }]
  const guardTypeOpts = [{ v: 'regular', l: 'Regular' }, { v: 'temporary', l: 'Temporary' }]
  const siteOpts = [{ v: '', l: '— Unassigned —' }, ...sites.map(s => ({ v: s.id, l: s.name }))]

  return (
    <div className="dashboard-layout" onClick={() => setOpenMenu(null)}>
      <Sidebar activeTab={tab} onTabChange={setTab} />
      <main className="main-content">

        {/* ═══ OVERVIEW ═══════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <OverviewTab
            stats={stats}
            sites={sites}
            guards={guards}
            supervisors={supervisors}
            wallet={wallet}
            setTab={setTab}
            setStaffRole={setStaffRole}
            setShowAddSite={setShowAddSite}
            setShowAddGuard={setShowAddGuard}
            setShowAddSup={setShowAddSup}
          />
        )}

        {/* ═══ ASSIGNMENTS ═══════════════════════════════════════════════════════ */}
        {tab === 'assignments' && (
          <AssignmentsTab
            stats={stats}
            sites={sites}
            guards={guards}
            assignmentFilter={assignmentFilter}
            setAssignmentFilter={setAssignmentFilter}
            guardAssignmentStatusFilter={guardAssignmentStatusFilter}
            setGuardAssignmentStatusFilter={setGuardAssignmentStatusFilter}
            setConfirmDelete={setConfirmDelete}
            toggleDuty={toggleDuty}
            setAssignModal={setAssignModal}
            setOvertimeModal={setOvertimeModal}
            toggleSite={toggleSite}
            setEditSiteData={setEditSiteData}
            setShowAddSite={setShowAddSite}
            av={av}
            setTab={setTab}
            setShowAddClient={setShowAddClient}
            fetchGuards={fetchGuards}
          />
        )}



        {/* ═══ ADMINS ═════════════════════════════════════════════════════════════ */}
        {/* ═══ ATTENDANCE ═══════════════════════════════════════════════════════ */}
        {tab === 'attendance' && (
          <AttendanceTab
            stats={stats}
            guards={guards}
            sites={sites}
            attendanceMode={attendanceMode}
            setAttendanceMode={setAttendanceMode}
            attendanceDate={attendanceDate}
            setAttendanceDate={setAttendanceDate}
            attendanceMonth={attendanceMonth}
            setAttendanceMonth={setAttendanceMonth}
            attendanceRecords={attendanceRecords}
            monthlyAttendanceRecords={monthlyAttendanceRecords}
            attLoading={attLoading}
            fetchAttendance={fetchAttendance}
            fetchGuards={fetchGuards}
            attendanceSearch={attendanceSearch}
            setAttendanceSearch={setAttendanceSearch}
            attendanceWhatsApp={attendanceWhatsApp}
            setAttendanceWhatsApp={setAttendanceWhatsApp}
            showToast={showToast}
          />
        )}



        {(tab === 'staff' || tab === 'guards' || tab === 'supervisors') && (
          <div className="tab-content animate-fadeIn" style={{ position: 'relative' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h1>👥 Staff Management</h1>
                <p>Manage admins, supervisors, and guards</p>
              </div>

              <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', margin: '0 auto' }}>
                <Search size={16} className="search-icon" />
                <input type="text" placeholder="Search staff..." className="search-input" value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '12px' }}>
                  <button 
                    className={`pill-btn ${staffRole === 'all' ? 'active' : ''}`} 
                    onClick={() => { setStaffRole('all'); setSearch(''); closeStaffForms(); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'all' ? 'var(--clr-primary)' : 'transparent', color: staffRole === 'all' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
                  >All</button>
                  {user?.role === 'owner' && (
                    <button 
                      className={`pill-btn ${staffRole === 'admins' ? 'active' : ''}`} 
                      onClick={() => { setStaffRole('admins'); setSearch(''); closeStaffForms(); }}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'admins' ? 'rgba(124,92,255,0.15)' : 'transparent', color: staffRole === 'admins' ? '#7C5CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
                    >Admins</button>
                  )}
                  <button 
                    className={`pill-btn ${staffRole === 'supervisors' ? 'active' : ''}`} 
                    onClick={() => { setStaffRole('supervisors'); setSearch(''); closeStaffForms(); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'supervisors' ? 'rgba(0,229,160,0.15)' : 'transparent', color: staffRole === 'supervisors' ? '#00E5A0' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
                  >Sups</button>
                  <button 
                    className={`pill-btn ${staffRole === 'guards' ? 'active' : ''}`} 
                    onClick={() => { setStaffRole('guards'); setSearch(''); setGuardAttendanceFilter('all'); closeStaffForms(); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'guards' ? 'rgba(91,140,255,0.15)' : 'transparent', color: staffRole === 'guards' ? '#5B8CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
                  >Guards</button>
                </div>

                {staffRole === 'admins' && user?.role === 'owner' && (
                  <button className="btn btn-primary btn-glow" onClick={() => { setAdminForm({ name: '', email: '', phone: '', password: '' }); setShowAddAdmin(true); }}>
                    <Plus size={16} />
                  </button>
                )}
                {staffRole === 'supervisors' && (
                  <button className="btn btn-primary btn-glow" onClick={() => { setSupForm({ name: '', email: '', phone: '', password: '' }); setShowAddSup(true); }}>
                    <Plus size={16} />
                  </button>
                )}
                {staffRole === 'guards' && (
                  <button className="btn btn-primary btn-glow" onClick={() => { setGuardForm({ name: '', phone: '', address: '', monthly_salary: 0, advance_paid: 0, guard_type: 'regular', site: '', shift: '' }); setShowAddGuard(true); }}>
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>

                  {staffRole === 'guards' && (
                    <div className="animate-fadeIn" style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {[
                        { id: 'all', l: 'All', c: 'var(--clr-muted)' },
                        { id: 'present', l: '✅ Present', c: '#00E5A0' },
                        { id: 'absent', l: '🔴 Absent', c: '#FF6B6B' },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setGuardAttendanceFilter(f.id)}
                          style={{ 
                            padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                            background: guardAttendanceFilter === f.id ? (f.id === 'all' ? 'var(--clr-surface-3)' : `${f.c}1c`) : 'transparent',
                            color: guardAttendanceFilter === f.id ? (f.id === 'all' ? '#fff' : f.c) : 'var(--clr-muted)',
                            border: guardAttendanceFilter === f.id ? `1px solid ${f.c}33` : '1px solid transparent'
                          }}
                        >
                          {f.l}
                        </button>
                      ))}
                    </div>
                  )}
                

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: 'var(--clr-surface-2)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
              <button 
                className={`pill-btn ${staffRole === 'all' ? 'active' : ''}`} 
                onClick={() => { setStaffRole('all'); setSearch(''); closeStaffForms(); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'all' ? 'var(--clr-primary)' : 'transparent', color: staffRole === 'all' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >All Staff</button>
              {user?.role === 'owner' && (
                <button 
                  className={`pill-btn ${staffRole === 'admins' ? 'active' : ''}`} 
                  onClick={() => { setStaffRole('admins'); setSearch(''); closeStaffForms(); }}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'admins' ? 'rgba(124,92,255,0.15)' : 'transparent', color: staffRole === 'admins' ? '#7C5CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                >Admins</button>
              )}
              <button 
                className={`pill-btn ${staffRole === 'supervisors' ? 'active' : ''}`} 
                onClick={() => { setStaffRole('supervisors'); setSearch(''); closeStaffForms(); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'supervisors' ? 'rgba(0,229,160,0.15)' : 'transparent', color: staffRole === 'supervisors' ? '#00E5A0' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >Supervisors</button>
              <button 
                className={`pill-btn ${staffRole === 'guards' ? 'active' : ''}`} 
                onClick={() => { setStaffRole('guards'); setSearch(''); setGuardAttendanceFilter('all'); closeStaffForms(); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'guards' ? 'rgba(91,140,255,0.15)' : 'transparent', color: staffRole === 'guards' ? '#5B8CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >Guards</button>
            </div>



            {(showAddAdmin || showAddSup || showAddGuard || editGuardData) && (
              <div style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                zIndex: 999, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' 
              }} onClick={closeStaffForms}>
                <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px' }}>
                  {showAddAdmin && (
                    <FormCard title="➕ Create New Admin" onSubmit={createAdmin} onCancel={() => setShowAddAdmin(false)}>
                      <FI label="Full Name" value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} placeholder="Priya Sharma" required />
                      <FI label="Email" value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="priya@example.com" required />
                      <FI label="Phone" value={adminForm.phone} onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" />
                      <FI label="Password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Min 8 chars" required />
                    </FormCard>
                  )}
                  {showAddSup && (
                    <FormCard title="➕ Create New Supervisor" onSubmit={createSup} onCancel={() => setShowAddSup(false)}>
                      <FI label="Full Name" value={supForm.name} onChange={e => setSupForm(p => ({ ...p, name: e.target.value }))} placeholder="Rahul Sharma" required />
                      <FI label="Email" value={supForm.email} onChange={e => setSupForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="rahul@example.com" required />
                      <FI label="Phone" value={supForm.phone} onChange={e => setSupForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" />
                      <FI label="Password" value={supForm.password} onChange={e => setSupForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Min 8 chars" required />
                    </FormCard>
                  )}
                  {showAddGuard && (
                    <FormCard title="➕ Add New Guard" onSubmit={createGuard} onCancel={() => setShowAddGuard(false)}>
                      <FI label="Full Name" value={guardForm.name} onChange={e => setGuardForm(p => ({ ...p, name: e.target.value }))} placeholder="Ravi Kumar" required />
                      <FI label="Phone" value={guardForm.phone} onChange={e => setGuardForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" required />
                      <FI label="Monthly Salary (₹)" value={guardForm.monthly_salary} onChange={e => setGuardForm(p => ({ ...p, monthly_salary: e.target.value }))} type="number" placeholder="10000" />
                      <FI label="Advance Paid (₹)" value={guardForm.advance_paid || 0} onChange={e => setGuardForm(p => ({ ...p, advance_paid: e.target.value }))} type="number" placeholder="2000" />
                      <FI label="Guard Type" value={guardForm.guard_type} onChange={e => setGuardForm(p => ({ ...p, guard_type: e.target.value }))} options={guardTypeOpts} />
                      <FI label="Assign Site" value={guardForm.site} onChange={e => setGuardForm(p => ({ ...p, site: e.target.value, shift: '' }))} options={siteOpts} />
                      <FI 
                        label="Select Shift" 
                        value={guardForm.shift} 
                        onChange={e => setGuardForm(p => ({ ...p, shift: e.target.value }))} 
                        options={[
                          { v: '', l: '— Select Shift —' },
                          ...(sites.find(s => s.id === parseInt(guardForm.site))?.shifts || []).map(s => {
                            const site = sites.find(st => st.id === parseInt(guardForm.site))
                            const currGuards = guards.filter(g => g.site === site.id && g.shift === s.id).length
                            const isFull = currGuards >= (site.num_securities || 0)
                            return { v: String(s.id), l: `${s.name} (${format12h(s.start_time)} – ${format12h(s.end_time)})${isFull ? ' ⚠ FULL' : ''}`, disabled: isFull }
                          })
                        ]} 
                        disabled={!guardForm.site}
                      />
                      <FI label="Address" value={guardForm.address} onChange={e => setGuardForm(p => ({ ...p, address: e.target.value }))} placeholder="City, Area" />
                    </FormCard>
                  )}
                  {editGuardData && (
                    <div className="card glass-card" style={{ padding: '28px', border: '1px solid rgba(124,92,255,0.4)', position: 'relative' }}>
                      <button className="btn-icon" onClick={() => setEditGuardData(null)} style={{ position: 'absolute', top: '15px', right: '15px' }}><X size={20}/></button>
                      <EditGuardForm guard={editGuardData} sites={sites} guards={guards} bankAccounts={bankAccounts} onSave={saveGuard} onCancel={() => setEditGuardData(null)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                {staffRole === 'all' ? (
                  allStaffCombined.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon" style={{ opacity: 0.2 }}><Users size={60} /></div>
                      <p>No staff members found matching your search.</p>
                    </div>
                  ) : (
                    <table>
                      <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>STAFF MEMBER</th><th>CONTACT</th><th>ROLE / INFO</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th></tr></thead>
                      <tbody>
                        {allStaffCombined.map(s => {
                          const isGuard = s.internal_role === 'guard';
                          const isSup = s.internal_role === 'supervisor';
                          const roleColor = isGuard ? '#5B8CFF' : (isSup ? '#00E5A0' : '#7C5CFF');
                          const site = isGuard ? sites.find(st => st.id === s.site) : null;
                          return (
                            <tr key={`${s.internal_role}-${s.id}`} className="table-row-hover">
                              <td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(s.name)}<div><strong>{s.name}</strong><div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}><span className="badge" style={{ background: `${roleColor}1a`, color: roleColor, fontSize: '0.65rem' }}>{s.internal_role.toUpperCase()}</span></div></div></div></td>
                              <td><div style={{ fontSize: '0.85rem' }}>{s.email || '—'}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{s.phone}</div></td>
                              <td>{isGuard ? (<div style={{ fontSize: '0.85rem' }}>{site?.name || <span style={{ opacity: 0.5 }}>— Unassigned</span>}{s.shift_name && <div style={{ fontSize: '0.73rem', color: '#7C5CFF' }}>{s.shift_name}</div>}</div>) : (<div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>Joined {new Date(s.date_joined).toLocaleDateString()}</div>)}</td>
                              <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  {isGuard && <button className="btn-icon" title="Edit" onClick={() => setEditGuardData(s)}>✏️</button>}
                                  <button className="btn-icon" title="Remove" onClick={() => setConfirmDelete({ id: s.id, name: s.name, type: s.internal_role, title: `Delete ${s.internal_role}` })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : staffRole === 'admins' ? (
                  fAdmins.length === 0 ? <div className="empty-state"><Users size={60} style={{ opacity: 0.2 }} /><p>No admins found.</p></div> :
                  <table>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>ADMIN</th><th>CONTACT</th><th>JOINED</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th></tr></thead>
                    <tbody>{fAdmins.map(a => (<tr key={a.id} className="table-row-hover"><td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(a.name)}<div><strong>{a.name}</strong><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>Admin</div></div></div></td><td><div style={{ fontSize: '0.85rem' }}>{a.email}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{a.phone}</div></td><td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>{new Date(a.date_joined).toLocaleDateString()}</td><td style={{ textAlign: 'right', paddingRight: '24px' }}><button className="btn-icon" onClick={() => setConfirmDelete({ id: a.id, name: a.name, type: 'admin', title: 'Delete Admin' })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button></td></tr>))}</tbody>
                  </table>
                ) : staffRole === 'supervisors' ? (
                  fSups.length === 0 ? <div className="empty-state"><ShieldCheck size={60} style={{ opacity: 0.2 }} /><p>No supervisors found.</p></div> :
                  <table>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>SUPERVISOR</th><th>CONTACT</th><th>JOINED</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th></tr></thead>
                    <tbody>{fSups.map(s => (<tr key={s.id} className="table-row-hover"><td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(s.name)}<div><strong>{s.name}</strong><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>Supervisor</div></div></div></td><td><div style={{ fontSize: '0.85rem' }}>{s.email}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{s.phone}</div></td><td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>{new Date(s.date_joined).toLocaleDateString()}</td><td style={{ textAlign: 'right', paddingRight: '24px' }}><button className="btn-icon" onClick={() => setConfirmDelete({ id: s.id, name: s.name, type: 'supervisor', title: 'Delete Supervisor' })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button></td></tr>))}</tbody>
                  </table>
                ) : (
                  fGuards.length === 0 ? <div className="empty-state"><Shield size={60} style={{ opacity: 0.2 }} /><p>No guards found.</p></div> :
                  <table>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>GUARD</th><th>SITE / STATUS</th><th>TYPE</th><th>SALARY</th><th>ATTENDANCE</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>MANAGE</th></tr></thead>
                    <tbody>
                      {fGuards.map(g => {
                        const site = sites.find(s => s.id === g.site);
                        return (
                          <tr key={g.id} className="table-row-hover">
                            <td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(g.name)}<div><strong>{g.name}</strong><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{g.phone}</div></div></div></td>
                            <td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{site?.name || '— Unassigned'}</div>{g.shift_name && <div style={{ fontSize: '0.73rem', color: '#7C5CFF' }}>{g.shift_name}</div>}</td>
                            <td><span className="badge" style={{ background: g.guard_type === 'regular' ? 'rgba(91,140,255,0.15)' : 'rgba(255,169,64,0.15)', color: g.guard_type === 'regular' ? '#5B8CFF' : '#FFA940' }}>{g.guard_type}</span></td>
                            <td style={{ fontWeight: 600 }}>₹{parseInt(g.monthly_salary || 0)}</td>
                            <td>
                              {g.site && g.shift ? (
                                g.today_attendance?.status === 'absent' ? (
                                  <button onClick={async () => { try { if (g.today_attendance?.id) { await api.patch(`/company/attendance/${g.today_attendance.id}/`, { status: 'present' }) } fetchGuards(); showToast(`✅ ${g.name} restored to Present`) } catch { showToast('❌ Failed') } }} style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#00E5A0', fontWeight: 600, fontSize: '0.8rem' }}>✅ Restore</button>
                                ) : (
                                  <button onClick={async () => { try { if (g.today_attendance?.id) { await api.patch(`/company/attendance/${g.today_attendance.id}/`, { status: 'absent' }) } else { await api.post('/company/attendance/', { guard: g.id, site: g.site, shift: g.shift, status: 'absent', date: new Date().toISOString().split('T')[0] }) } fetchGuards(); showToast(`🔴 ${g.name} marked Absent`) } catch { showToast('❌ Failed') } }} style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#FF6B6B', fontWeight: 600, fontSize: '0.8rem' }}>🔴 Mark Absent</button>
                                )
                              ) : <span style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>Unassigned</span>}
                            </td>
                            <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn-icon" onClick={() => setEditGuardData({ ...g })}>✏️</button>
                                <button className="btn-icon" onClick={() => setConfirmDelete({ id: g.id, name: g.name, type: 'guard', title: 'Delete Guard' })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SITES ════════════════════════════════════════════════════════════ */}
        {tab === 'sites' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div><h1>📍 Sites & Locations</h1><p>{sites.filter(s => isSiteOpen(s).isOpen).length} open now · {sites.filter(s => !isSiteOpen(s).isOpen).length} closed</p></div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="search-input-wrap"><Search size={16} className="search-icon" /><input type="text" placeholder="Search sites..." className="search-input" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <button className="btn btn-primary btn-glow" onClick={() => { setShowAddSite(true); setEditSiteData(null) }}><Plus size={16} /> Add Site</button>
              </div>
            </div>

            {showAddSite && (
              <FormCard title="➕ Add New Site" onSubmit={createSite} onCancel={() => setShowAddSite(false)}>
                <FI label="Site Name" value={siteForm.name} onChange={e => setSiteForm(p => ({ ...p, name: e.target.value }))} placeholder="Sunrise Apartments" required />
                <FI label="Site Type" value={siteForm.site_type} onChange={e => setSiteForm(p => ({ ...p, site_type: e.target.value }))} options={siteTypeOpts} />
                <FI label="Monthly Amount (₹)" value={siteForm.monthly_amount} onChange={e => setSiteForm(p => ({ ...p, monthly_amount: e.target.value }))} type="number" placeholder="25000" />
                <FI label="Invoice Type" value={siteForm.invoice_format || 'normal'} onChange={e => setSiteForm(p => ({ ...p, invoice_format: e.target.value }))} options={[
                  { v: 'normal', l: '📄 Normal Invoice' },
                  { v: 'gst', l: '🧾 GST Invoice' }
                ]} />
                {siteForm.invoice_format === 'gst' && (
                  <FI label="Client GSTIN" value={siteForm.client_gstin || ''} onChange={e => setSiteForm(p => ({ ...p, client_gstin: e.target.value }))} placeholder="24XXXXX1234X1Z5" />
                )}
                <FI label="Owner Receives In" value={siteForm.bill_account_name || ''} onChange={e => setSiteForm(p => ({ ...p, bill_account_name: e.target.value }))} options={[
                  { v: '', l: '— Not Linked —' },
                  ...(bankAccounts || []).map(b => ({ v: b.account_name, l: `${b.account_name} (${b.bank_name})` }))
                ]} />
                <FI label="Client Sending Acct" value={siteForm.client_account_name || ''} onChange={e => setSiteForm(p => ({ ...p, client_account_name: e.target.value }))} placeholder="Client UPI/Bank details" />
                <FI label="No. of Guards" value={siteForm.num_securities} onChange={e => setSiteForm(p => ({ ...p, num_securities: e.target.value }))} type="number" placeholder="2" />
                <FI label="Address" value={siteForm.address} onChange={e => setSiteForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address..." />
                <div style={{ gridColumn: '1/-1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(124, 92, 255, 0.2)' }}>
                    <FI label="Shift Name" value={siteForm.shift_name} onChange={e => setSiteForm(p => ({ ...p, shift_name: e.target.value }))} placeholder="Day Shift" required />
                    <FI label="Start" value={siteForm.shift_start_time} onChange={val => setSiteForm(p => ({ ...p, shift_start_time: val.target.value }))} type="time-wheel" required />
                    <FI label="End" value={siteForm.shift_end_time} onChange={val => setSiteForm(p => ({ ...p, shift_end_time: val.target.value }))} type="time-wheel" required />
                  </div>
                </div>
              </FormCard>
            )}

            {editSiteData && (
              <EditSiteForm
                key={editSiteData.id}
                site={editSiteData}
                onSave={saveSite}
                onCancel={() => setEditSiteData(null)}
                bankAccounts={bankAccounts}
              />
            )}

            {showAddClient && (
              <FormCard 
                title={`🔑 Create Client Login: ${sites.find(s => s.id === showAddClient)?.name}`} 
                onSubmit={createClient} 
                onCancel={() => setShowAddClient(null)}
                color="rgba(0, 229, 160, 0.4)"
              >
                {clientForm.password && (
                  <div className="strength-meter-container">
                    <div className="strength-meter-bar">
                      <div 
                        className="strength-meter-fill" 
                        style={{ 
                          width: checkPasswordStrength(clientForm.password).width, 
                          backgroundColor: checkPasswordStrength(clientForm.password).color 
                        }}
                      />
                    </div>
                    <div className="strength-text">
                      <span style={{ color: checkPasswordStrength(clientForm.password).color }}>
                        STRENGTH: {checkPasswordStrength(clientForm.password).label}
                      </span>
                      {clientForm.confirm_password && (
                        <span style={{ color: clientForm.password === clientForm.confirm_password ? '#00e5a0' : '#ff4d6d' }}>
                          {clientForm.password === clientForm.confirm_password ? '✅ MATCHED' : '❌ MISMATCH'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <FI label="Manager Name" value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" required />
                <FI label="Login Email" value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} placeholder="client@example.com" required />
                <FI label="Phone Number" value={clientForm.phone} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))} placeholder="10 Digits" required />
                <FI label="Password" value={clientForm.password} onChange={e => setClientForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Min 6 chars" required />
                <FI label="Confirm Password" value={clientForm.confirm_password} onChange={e => setClientForm(p => ({ ...p, confirm_password: e.target.value }))} type="password" placeholder="Repeat password" required />
              </FormCard>
            )}

            {fSites.length === 0
              ? <div className="card glass-card"><div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><MapPin size={60} /></div><p>No sites found.</p><button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowAddSite(true)}>Add First Site</button></div></div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {fSites.map(site => (
                  <div key={site.id} className="card glass-card" style={{ padding: '22px', border: isSiteOpen(site).isOpen ? '1px solid rgba(0,229,160,0.25)' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div><div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{site.name}</div><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)' }}>{typeLabel[site.site_type]}</div></div>
                      {(() => {
                        const { isOpen, activeShift } = isSiteOpen(site)
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                            <span className="badge" style={{ background: isOpen ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)', color: isOpen ? '#00E5A0' : 'var(--clr-muted)' }}>
                              {isOpen ? '🟢 OPEN' : '⚫ CLOSED'}
                            </span>
                            {activeShift && <span style={{ fontSize: '0.6rem', color: '#00E5A0' }}>{activeShift.name} running</span>}
                          </div>
                        )
                      })()}
                    </div>
                    {site.address && <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginBottom: '14px' }}>{site.address}</div>}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                      <div><div style={{ fontWeight: 700, color: '#7C5CFF', fontSize: '1.1rem' }}>₹{parseFloat(site.monthly_amount || 0).toLocaleString('en-IN')}</div><div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>Monthly</div></div>
                      <div><div style={{ fontWeight: 700, color: '#5B8CFF', fontSize: '1.1rem' }}>{guards.filter(g => g.site === site.id).length}</div><div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>Guards</div></div>
                      {site.bill_account_name && <div><div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--clr-muted)', marginTop: '4px' }}>{site.bill_account_name}</div><div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>Account</div></div>}
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                        {site.client_user ? (
                            <div style={{ background: 'rgba(0,229,160,0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,229,160,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ padding: '4px', background: 'rgba(0,229,160,0.15)', borderRadius: '50%', color: '#00E5A0', display: 'flex' }}><User size={12}/></div>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#00E5A0', fontWeight: 600 }}>Client Login Active</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)' }}>{site.client_user_name}</div>
                                    </div>
                                </div>
                                <button 
                                    title="Delete Client Login"
                                    onClick={() => unlinkClient(site.id)}
                                    style={{ background: 'rgba(255,77,109,0.1)', border: 'none', borderRadius: '6px', color: '#FF4D6D', padding: '6px', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,109,0.2)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,77,109,0.1)'}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <button className="btn" style={{ width: '100%', background: 'rgba(124,92,255,0.08)', color: '#7C5CFF', border: '1px dashed rgba(124,92,255,0.3)', padding: '10px', fontSize: '0.85rem' }} onClick={() => setShowAddClient(site.id)}>
                                🔑 Generate Client Login
                            </button>
                        )}
                    </div>
                    {/* Shifts Block */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} /> SHIFTS
                        </div>
                        <button className="btn-icon" onClick={() => setActiveShiftSite(site.id)} style={{ fontSize: '0.7rem', color: 'var(--clr-primary)', padding: '2px 8px', background: 'rgba(91,140,255,0.1)' }}>+ Add</button>
                      </div>

                      {/* Add Form */}
                      {activeShiftSite === site.id && (
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(124, 92, 255, 0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)', gap: '10px' }}>
                            <input type="text" className="form-input" placeholder="Shift Name" value={shiftAddData.name} onChange={e => setShiftAddData(p => ({ ...p, name: e.target.value }))} style={{ height: '44px', padding: '6px 12px' }} />
                            <TimeWheelPicker value={shiftAddData.start_time} onChange={(val) => setShiftAddData(p => ({ ...p, start_time: val }))} />
                            <TimeWheelPicker value={shiftAddData.end_time} onChange={(val) => setShiftAddData(p => ({ ...p, end_time: val }))} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px' }} onClick={() => { createShift(site.id, shiftAddData); setActiveShiftSite(null) }}>Add Shift</button>
                            <button className="btn" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px', background: 'var(--clr-surface-2)' }} onClick={() => setActiveShiftSite(null)}>Cancel</button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {site.shifts?.map(s => (
                          <div key={s.id}>
                            {shiftEditData?.id === s.id ? (
                              /* Edit Form inline */
                              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(124, 92, 255, 0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)', gap: '10px' }}>
                                  <input type="text" className="form-input" value={shiftEditData.name} onChange={e => setShiftEditData(p => ({ ...p, name: e.target.value }))} style={{ height: '44px', padding: '6px 12px' }} />
                                  <TimeWheelPicker value={shiftEditData.start_time} onChange={(val) => setShiftEditData(p => ({ ...p, start_time: val }))} />
                                  <TimeWheelPicker value={shiftEditData.end_time} onChange={(val) => setShiftEditData(p => ({ ...p, end_time: val }))} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px' }} onClick={() => { updateShift(s.id, shiftEditData); setShiftEditData(null) }}>Save Changes</button>
                                  <button className="btn" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px', background: 'var(--clr-surface-2)' }} onClick={() => setShiftEditData(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              /* Normal View */
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name}</div>
                                  <div style={{ color: 'var(--clr-muted)' }}>{format12h(s.start_time)} - {format12h(s.end_time)}</div>
                                </div>
                                <div className="dropdown" style={{ position: 'relative' }}>
                                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `shift-${s.id}` ? null : `shift-${s.id}`) }}><MoreVertical size={16} /></button>
                                  {openMenu === `shift-${s.id}` && (
                                    <div className="dropdown-menu animate-fadeIn" style={{ right: 0, minWidth: '120px', zIndex: 10 }}>
                                      <button onClick={() => { setShiftEditData(s); setOpenMenu(null) }}><Edit size={14} /> Edit Shift</button>
                                      <button onClick={() => deleteShift(s.id)} style={{ color: 'var(--clr-danger)' }}><Trash size={14} /> Delete Shift</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px' }}>
                      <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'var(--clr-surface-2)' }} onClick={() => { setEditSiteData({ ...site }); setShowAddSite(false) }}>✏️ Edit Site</button>
                      <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: site.is_active ? 'rgba(255,107,107,0.1)' : 'rgba(0,229,160,0.1)', color: site.is_active ? 'var(--clr-danger)' : '#00E5A0' }} onClick={() => toggleSite(site)}>{site.is_active ? '🔒 Close' : '✅ Open'}</button>
                      <button className="btn-icon" style={{ color: 'var(--clr-danger)' }} onClick={() => setConfirmDelete({ id: site.id, name: site.name, type: 'site', title: 'Delete Site' })}><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {/* ═══ JOIN REQUESTS ════════════════════════════════════════════════════ */}
        {tab === 'joinrequests' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1><ClipboardList size={28} style={{ verticalAlign: 'middle', marginRight: 10 }} />Join Requests</h1>
                <p>Admin applicants requesting to join {stats.agency_name}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="badge" style={{ background: 'rgba(124,92,255,0.15)', color: '#7C5CFF', fontSize: '0.85rem', padding: '8px 14px' }}>
                  {requests.filter(r => r.status === 'pending').length} Pending
                </span>
              </div>
            </div>
            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                {requests.length === 0
                  ? <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><ClipboardList size={60} /></div><p>No join requests yet. Admins can apply via the registration page.</p></div>
                  : <table>
                    <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '18px 24px' }}>APPLICANT</th>
                      <th>CONTACT</th>
                      <th>MESSAGE</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
                    </tr></thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r.id} className="table-row-hover">
                          <td style={{ padding: '14px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {av(r.name)}
                              <div><strong>{r.name}</strong><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>Requesting: <span style={{textTransform: 'capitalize'}}>{r.requested_role}</span></div></div>
                            </div>
                          </td>
                          <td><div style={{ fontSize: '0.85rem' }}>{r.email}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{r.phone}</div></td>
                          <td style={{ color: 'var(--clr-muted)', fontSize: '0.82rem', maxWidth: 180 }}>{r.message || '—'}</td>
                          <td>
                            <span className="badge" style={{
                              background: r.status === 'pending' ? 'rgba(255,159,67,0.15)' : r.status === 'approved' ? 'rgba(0,229,160,0.15)' : 'rgba(255,107,107,0.15)',
                              color: r.status === 'pending' ? '#FF9F43' : r.status === 'approved' ? '#00E5A0' : '#FF6B6B'
                            }}>{r.status}</span>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                            {r.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn" style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }} onClick={() => approveReq(r.id)}><Check size={14} /> Approve</button>
                                <button className="btn btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => rejectReq(r.id)}><X size={14} /> Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CODES ════════════════════════════════════════════════════════════ */}
        {tab === 'invites' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header">
              <h1>🔑 Invite Codes</h1><p>Generate codes to onboard your agency staff</p>
            </div>
            
            <div className="card glass-card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Generate Invitation Code</div>
                  <div className="card-sub">Codes expire in 48 hours and can only be used once.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {user?.role === 'owner' && (
                    <button className="btn btn-secondary" onClick={() => generateCode('admin')} disabled={genLoading}>
                      {genLoading ? <span className="spinner" /> : 'Admin Code'}
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={() => generateCode('supervisor')} disabled={genLoading}>
                    {genLoading ? <span className="spinner" /> : '✨ Supervisor Code'}
                  </button>
                </div>
              </div>
              {newCode && (
                <div className="code-display" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px 24px', borderRadius: '12px', border: '1px solid rgba(0,229,160,0.3)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>New {newCode.role_for} Code</div>
                    <span style={{ fontSize: '1.8rem', fontFamily: 'monospace', letterSpacing: '4px', fontWeight: 800, color: '#00E5A0' }}>{newCode.code}</span>
                  </div>
                  <button className="btn btn-primary btn-glow" onClick={() => copyCode(newCode.code)}>📋 Copy to Clipboard</button>
                </div>
              )}
            </div>

            <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                {codes.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><Key size={60} /></div><p>No codes generated yet.</p></div>
                ) : (
                  <table>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '18px 24px' }}>CODE</th>
                        <th>ROLE</th>
                        <th>STATUS</th>
                        <th>EXPIRES</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map(c => {
                        const isActive = !c.used && new Date(c.expires_at) > new Date()
                        return (
                          <tr key={c.id} className="table-row-hover">
                            <td style={{ padding: '14px 24px' }}><span style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 2, fontWeight: 700 }}>{c.code}</span></td>
                            <td><span className="badge" style={{ background: 'rgba(91,140,255,0.15)', color: '#5B8CFF', textTransform: 'capitalize' }}>{c.role_for}</span></td>
                            <td>
                              <span className="badge" style={{
                                background: c.used ? 'rgba(255,255,255,0.05)' : isActive ? 'rgba(0,229,160,0.15)' : 'rgba(255,107,107,0.15)',
                                color: c.used ? 'var(--clr-muted)' : isActive ? '#00E5A0' : '#FF6B6B'
                              }}>{c.used ? 'Used' : isActive ? 'Active' : 'Expired'}</span>
                            </td>
                            <td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>{new Date(c.expires_at).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn-icon" onClick={() => copyCode(c.code)} title="Copy" style={{ color: '#5B8CFF' }}>🔗</button>
                                {isActive && <button className="btn-icon" onClick={() => deleteCode(c.id)} title="Delete Active Code" style={{ color: 'var(--clr-danger)' }}>🗑</button>}
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
          </div>
        )}

        {/* ═══ MAP ══════════════════════════════════════════════════════════════ */}
        {tab === 'map' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header"><h1>🗺️ Live Map</h1><p>Real-time supervisor & guard locations</p></div>
            <div className="card glass-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
              <div style={{ fontSize: '5rem', marginBottom: '24px' }}>🗺️</div>
              <h2 style={{ marginBottom: '12px' }}>Live Map — Coming Soon</h2>
              <p style={{ color: 'var(--clr-muted)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.8 }}>GPS-based live tracking for supervisors and site-based guard positions will be available in the next release.</p>
            </div>
          </div>
        )}

        {/* ═══ PAYMENTS ═════════════════════════════════════════════════════════ */}
        {tab === 'payments' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', gap: '20px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h1>💳 Billing & Payments</h1>
                <p>Site-wise monthly payment tracking & verifications</p>
              </div>

              <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', margin: '0 auto' }}>
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder={billingMode === 'overview' ? "Search sites..." : "Search site names..."}
                  value={billingSearch} 
                  onChange={e => setBillingSearch(e.target.value)} 
                />
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <div className="tab-pills" style={{ display: 'flex', gap: '8px', background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '12px' }}>
                  <button 
                    className={`pill-btn ${billingMode === 'overview' ? 'active' : ''}`}
                    onClick={() => setBillingMode('overview')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'overview' ? 'var(--clr-primary)' : 'transparent', color: billingMode === 'overview' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  >🏢 Site Bills</button>
                  <button 
                    className={`pill-btn ${billingMode === 'verifications' ? 'active' : ''}`}
                    onClick={() => setBillingMode('verifications')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'verifications' ? 'var(--clr-primary)' : 'transparent', color: billingMode === 'verifications' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                  >
                    ⏳ Pending
                    {payments.filter(p => p.status === 'pending').length > 0 && (
                      <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#FF6B6B', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px' }}>
                        {payments.filter(p => p.status === 'pending').length}
                      </span>
                    )}
                  </button>
                  <button 
                    className={`pill-btn ${billingMode === 'rejections' ? 'active' : ''}`}
                    onClick={() => setBillingMode('rejections')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'rejections' ? 'rgba(255,107,107,0.1)' : 'transparent', color: billingMode === 'rejections' ? '#FF6B6B' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                  >
                    ❌ Rejected
                  </button>
                  <button 
                    className={`pill-btn ${billingMode === 'settled' ? 'active' : ''}`}
                    onClick={() => setBillingMode('settled')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'settled' ? 'rgba(0,229,160,0.1)' : 'transparent', color: billingMode === 'settled' ? '#00E5A0' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                  >
                    ✅ Settled
                  </button>
                </div>
              </div>
            </div>

            {billingMode === 'overview' && (
              <div className="animate-fadeIn">
                <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
                  <div className="stat-card glass-card" style={{ padding: '20px' }}><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Monthly Revenue</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00E5A0' }}>₹{totalRevenue.toLocaleString('en-IN')}</div></div>
                  <div className="stat-card glass-card" style={{ padding: '20px' }}><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Active Sites</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#5B8CFF' }}>{sites.filter(s => s.is_active).length}</div></div>
                  <div className="stat-card glass-card" style={{ padding: '20px' }}><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Sites</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7C5CFF' }}>{sites.length}</div></div>
                </div>
                <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="table-wrap">
                    {sites.length === 0
                      ? <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><CreditCard size={60} /></div><p>No sites yet.</p><button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setTab('sites')}>Add Sites First</button></div>
                      : <table>
                        <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>SITE</th><th>TYPE</th><th>MONTHLY AMOUNT</th><th>OWNER RECEIVES IN</th><th>CLIENT ACCOUNT</th><th>PAYMENT STATUS</th><th>SITE STATUS</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th></tr></thead>
                        <tbody>
                          {sites.filter(s => {
                            if (!billingSearch) return true
                            return (s.name || '').toLowerCase().includes(billingSearch.toLowerCase())
                          }).map(s => {
                            const linkedBank = bankStats.find(b => b.account_name === s.bill_account_name)
                            return (
                            <tr key={s.id} className="table-row-hover">
                              <td style={{ padding: '14px 24px' }}><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{s.address?.slice(0, 38) || '—'}</div></td>
                              <td style={{ fontSize: '0.85rem' }}>{typeLabel[s.site_type]}</td>
                              <td style={{ fontWeight: 700, color: '#00E5A0' }}>₹{parseFloat(s.monthly_amount || 0).toLocaleString('en-IN')}</td>
                              <td style={{ minWidth: '180px' }}>
                                {linkedBank ? (
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5B8CFF' }}>🏦 {linkedBank.account_name}</span>
                                      <span style={{ fontSize: '0.68rem', color: 'var(--clr-muted)' }}>({linkedBank.bank_name})</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, linkedBank.limit_used_pct)}%`, height: '100%', background: linkedBank.limit_used_pct >= 80 ? '#FF6B6B' : linkedBank.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0', transition: 'width 0.5s' }} />
                                      </div>
                                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: linkedBank.limit_used_pct >= 80 ? '#FF6B6B' : linkedBank.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0' }}>{linkedBank.limit_used_pct}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.82rem', color: 'var(--clr-muted)' }}>{s.bill_account_name || '— Not linked'}</span>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: '0.85rem', color: 'var(--clr-text)' }}>{s.client_account_name || '—'}</span>
                              </td>
                              <td>
                                {(() => {
                                  const siteBills = bills.filter(b => b.site === s.id);
                                  const totalRemaining = siteBills.reduce((s, b) => s + parseFloat(b.remaining || 0), 0);
                                  const hasPending = payments.some(p => p.bill_details?.site === s.id && p.status === 'pending');
                                  
                                  if (hasPending) return <span className="badge" style={{ background: 'rgba(255,169,64,0.15)', color: '#FFA940' }}>⏳ In Process</span>;
                                  if (totalRemaining > 0) return <span className="badge" style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B' }}>🔴 Outstanding (₹{totalRemaining.toLocaleString()})</span>;
                                  if (siteBills.length > 0) return <span className="badge" style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }}>✅ Settled</span>;
                                  return <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--clr-muted)' }}>— No Bills</span>;
                                })()}
                              </td>
                              <td><span className="badge" style={{ background: s.is_active ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)', color: s.is_active ? '#00E5A0' : 'var(--clr-muted)' }}>{s.is_active ? 'Active' : 'Closed'}</span></td>
                              <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  {(() => {
                                    const today = new Date()
                                    const cMonth = today.getMonth() + 1
                                    const cYear = today.getFullYear()
                                    const hasGenerated = bills.some(b => b.site === s.id && b.bill_month === cMonth && b.bill_year === cYear)
                                    
                                    return (
                                      <button 
                                        className={`btn ${hasGenerated ? '' : 'btn-primary btn-glow'}`} 
                                        style={{ 
                                          padding: '7px 16px', 
                                          fontSize: '0.8rem', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '6px',
                                          borderRadius: '10px',
                                          background: hasGenerated ? 'rgba(124, 92, 255, 0.15)' : '',
                                          color: hasGenerated ? '#7C5CFF' : '',
                                          border: hasGenerated ? '1px solid rgba(124, 92, 255, 0.3)' : ''
                                        }} 
                                        onClick={() => handleGenerateBillClick(s)}
                                      >
                                        <FileText size={15}/> {hasGenerated ? 'Dup. Bill' : 'Generate Bill'}
                                      </button>
                                    )
                                  })()}
                                  <button 
                                    className="btn" 
                                    style={{ 
                                      padding: '7px 16px', 
                                      fontSize: '0.8rem', 
                                      background: 'rgba(56, 189, 248, 0.1)', 
                                      color: '#38BDF8', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '6px',
                                      border: '1px solid rgba(56, 189, 248, 0.2)',
                                      borderRadius: '10px'
                                    }} 
                                    onClick={() => setViewingHistorySite(s)}
                                  >
                                    <Clock size={14}/> History
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ 
                                      padding: '7px 16px', 
                                      fontSize: '0.8rem', 
                                      background: 'rgba(255,255,255,0.05)', 
                                      color: '#fff', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '6px',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: '10px'
                                    }} 
                                    onClick={() => { setTab('sites'); setEditSiteData({ ...s }) }}
                                  >
                                    <Edit size={14} color="#7C5CFF"/> Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>}
                  </div>
                </div>
              </div>
            )}

            {billingMode !== 'overview' && (
              <div className="card glass-card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrap">
                  {payments.filter(p => {
                    if (billingMode === 'verifications') return ['pending'].includes(p.status);
                    if (billingMode === 'rejections') return ['rejected'].includes(p.status);
                    if (billingMode === 'settled') return ['verified'].includes(p.status);
                    return false;
                  }).length === 0
                    ? <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><CreditCard size={60} /></div><p>No {billingMode} payments found.</p></div>
                    : <table>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '18px 24px' }}>DATE</th>
                          <th>SITE / BILLING</th>
                          <th>SUBMITTED AMOUNT</th>
                          <th>PROOF</th>
                          <th>STATUS</th>
                          <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.filter(p => {
                          if (billingMode === 'verifications') if (p.status !== 'pending') return false;
                          if (billingMode === 'rejections') if (p.status !== 'rejected') return false;
                          if (billingMode === 'settled') if (p.status !== 'verified') return false;
                          
                          if (billingSearch) {
                            const siteName = (p.bill_details?.site_name || '').toLowerCase()
                            if (!siteName.includes(billingSearch.toLowerCase())) return false
                          }
                          return true
                        }).map(p => {
                          const siteName = p.bill_details?.site_name || 'Unknown Site';
                          return (
                          <tr key={p.id} className="table-row-hover">
                            <td style={{ padding: '14px 24px' }}>
                              <div style={{ fontWeight: 600 }}>{p.paid_at}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '3px' }}>
                                Submitted {new Date(p.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{siteName}</div>
                              <div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>
                                {p.bill_details?.bill_type?.toUpperCase()} • {p.bill_details?.bill_month ? `Month ${p.bill_details.bill_month}/${p.bill_details.bill_year}` : ''}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '2px' }}>
                                Total Bill: ₹{parseFloat(p.bill_details?.amount || 0).toLocaleString('en-IN')} · Remaining: ₹{parseFloat(p.bill_details?.remaining || 0).toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: p.status === 'verified' ? '#00E5A0' : '#5B8CFF' }}>
                                ₹{parseFloat(p.amount_paid||0).toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {p.screenshot_url && (
                                  <a href={p.screenshot_url} target="_blank" rel="noreferrer" 
                                    onClick={(e) => { e.preventDefault(); setReceiptModal(p.screenshot_url); }}
                                    style={{ color: '#7C5CFF', fontSize: '0.85rem', textDecoration: 'none' }}>
                                    👁️ Receipt
                                  </a>
                                )}
                                {!p.screenshot_url && <span style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>No Proof</span>}
                              </div>
                            </td>
                            <td>
                              <span className="badge" style={{ 
                                background: p.status === 'pending' ? 'rgba(255,169,64,0.15)' : p.status === 'verified' ? 'rgba(0,229,160,0.15)' : 'rgba(255,107,107,0.15)', 
                                color: p.status === 'pending' ? '#FFA940' : p.status === 'verified' ? '#00E5A0' : '#FF6B6B' 
                              }}>
                                {p.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                              {p.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button 
                                    className="btn" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(0,229,160,0.15)', color: '#00E5A0', fontWeight: 'bold' }}
                                    onClick={async () => {
                                      try {
                                        const res = await api.post(`/billing/payments/${p.id}/verify/`, { action: 'verify' });
                                        fetchPayments();
                                        fetchBankAccounts();
                                        fetchBankStats();
                                        const vs = res.data?.verification_summary;
                                        if (vs) {
                                          if (vs.is_fully_paid) {
                                            showToast(`✅ Verified! Bill FULLY PAID.`);
                                          } else {
                                            showToast(`✅ Verified! Remaining: ₹${vs.remaining}`);
                                          }
                                        }
                                      } catch (err) {
                                        showToast(`❌ Verification failed`);
                                      }
                                    }}
                                  >
                                    Verify
                                  </button>
                                  <button 
                                    className="btn" 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', fontWeight: 'bold' }}
                                    onClick={async () => {
                                      try {
                                        await api.post(`/billing/payments/${p.id}/verify/`, { action: 'reject' });
                                        fetchPayments();
                                        showToast("❌ Payment rejected");
                                      } catch (err) {
                                        showToast("❌ Rejection failed");
                                      }
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--clr-muted)' }}>— Resolved</span>
                              )}
                            </td>
                          </tr>
                          )})}
                      </tbody>
                    </table>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SALARY ═══════════════════════════════════════════════════════════ */}
        {tab === 'salary' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h1>💰 Salary Manager</h1>
                <p>Track earnings, OT, and payouts for your staff</p>
              </div>

              <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', margin: '0 auto' }}>
                <Search size={16} className="search-icon" />
                <input type="text" className="search-input" placeholder="Search staff..." value={salarySearch} onChange={e => setSalarySearch(e.target.value)} />
              </div>
              
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {/* Year/Month Selection with Agency-Creation boundary & No Future Dates */}
                {(() => {
                  const now = new Date()
                  const curY = now.getFullYear()
                  const curM = now.getMonth() + 1
                  
                  const start = stats.agency_created_at ? new Date(stats.agency_created_at) : new Date()
                  const startY = start.getFullYear()
                  const startM = start.getMonth() + 1

                  const years = []
                  for (let y = startY; y <= curY; y++) years.push(y)

                  const months = [
                    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
                    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
                    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
                    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' }
                  ].filter(m => {
                    // Start Year constraint
                    if (salaryYear === startY && m.v < startM) return false
                    // Future Month constraint
                    if (salaryYear === curY && m.v > curM) return false
                    return true
                  })

                  return (
                    <>
                      <select className="form-input" style={{ width: '130px', color: '#fff' }} value={salaryMonth} onChange={e => setSalaryMonth(parseInt(e.target.value))}>
                        {months.map(m => (
                          <option key={m.v} value={m.v} style={{ background: '#1e202d', color: '#fff' }}>{m.l}</option>
                        ))}
                      </select>
                      <select className="form-input" style={{ width: '100px', color: '#fff' }} value={salaryYear} onChange={e => {
                        const newY = parseInt(e.target.value)
                        setSalaryYear(newY)
                        // If switching to start year and current month is before startMonth, reset month
                        if (newY === startY && salaryMonth < startM) setSalaryMonth(startM)
                        // If switching to current year and current month is after curMonth, reset month
                        if (newY === curY && salaryMonth > curM) setSalaryMonth(curM)
                      }}>
                        {years.map(y => (
                          <option key={y} value={y} style={{ background: '#1e202d', color: '#fff' }}>{y}</option>
                        ))}
                      </select>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Monthly Cost</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B6B' }}>₹{salaries.reduce((acc, s) => acc + parseFloat(s.amount_earned), 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Paid</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00E5A0' }}>₹{salaries.reduce((acc, s) => acc + parseFloat(s.amount_paid), 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Pending</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFA940' }}>₹{salaries.reduce((acc, s) => acc + parseFloat(s.total_due), 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Active Staff</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#5B8CFF' }}>{salaries.length}</div>
              </div>
            </div>

            <div className="card glass-card" style={{ padding: 0, overflow: 'auto' }}>
              <div className="table-wrap">
                {salaryLoading ? <div style={{ padding: '100px', textAlign: 'center' }}><div className="spinner"></div></div> :
                salaries.length === 0
                  ? <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><Banknote size={60} /></div><p>No salary records found for this period.</p></div>
                  : <table style={{ minWidth: '1000px', width: '100%' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ padding: '16px 20px', textAlign: 'left' }}>GUARD</th>
                          <th style={{ textAlign: 'left' }}>SALARY / DAY RATE</th>
                          <th style={{ textAlign: 'left' }}>ATTENDANCE</th>
                          <th style={{ textAlign: 'left' }}>EARNED</th>
                          <th style={{ textAlign: 'left', color: '#FFBD59' }}>WALLET</th>
                          <th style={{ textAlign: 'left' }}>PAID</th>
                          <th style={{ textAlign: 'left', color: '#FF6B6B' }}>NET DUE (THIS MONTH)</th>
                          <th style={{ textAlign: 'left' }}>LAST PAID</th>
                          <th style={{ textAlign: 'right', paddingRight: '20px' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaries.filter(s => {
                          if (!salarySearch) return true
                          const term = salarySearch.toLowerCase()
                          return (s.guard_name || '').toLowerCase().includes(term) || (s.guard_phone || '').includes(term)
                        }).map(s => {
                          const monthRem   = parseFloat(s.amount_remaining ?? 0)
                          const dailyRate  = parseFloat(s.daily_rate ?? 0)
                          const totalDays  = s.total_days || 30
                          const otShifts = parseInt(s.notes?.match(/Overtime shifts: (\d+)/)?.[1] || '0')
                          const isFullyPaid = monthRem <= 0
                          return (
                          <tr key={s.id} className="table-row-hover">

                            {/* Guard name + site */}
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {av(s.guard_name)}
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.guard_name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{s.site_name || 'Unassigned'}</div>
                                  {s.guard_phone && <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>{s.guard_phone}</div>}
                                </div>
                              </div>
                            </td>

                            {/* Salary / daily rate  */}
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{parseFloat(s.monthly_salary).toLocaleString('en-IN')}<span style={{ fontWeight: 400, color: 'var(--clr-muted)', fontSize: '0.7rem' }}>/mo</span></div>
                              <div style={{ fontSize: '0.72rem', color: '#7C5CFF', fontWeight: 600, marginTop: '2px' }}>₹{dailyRate.toFixed(2)} <span style={{ color: 'var(--clr-muted)', fontWeight: 400 }}>÷ {totalDays} days</span></div>
                            </td>

                            {/* Attendance */}
                            <td>
                              <div style={{ fontSize: '0.88rem' }}>Present: <strong>{s.days_present}</strong></div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', marginTop: '2px' }}>Absent: {s.days_absent}</div>
                              {otShifts > 0 && <div style={{ fontSize: '0.7rem', color: '#7C5CFF', fontWeight: 600 }}>OT: {otShifts} shifts</div>}
                            </td>

                            {/* Earned */}
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{parseFloat(s.amount_earned).toLocaleString('en-IN')}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{s.days_present} days × ₹{dailyRate.toFixed(0)}</div>
                            </td>

                            {/* Wallet Advance */}
                            <td>
                              {parseFloat(s.advance_given || 0) > 0 ? (
                                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, padding: '4px 8px', background: 'rgba(255,189,89,0.12)', border: '1px solid rgba(255,189,89,0.3)', borderRadius: 8 }}>
                                  <div style={{ fontWeight: 800, color: '#FFBD59', fontSize: '0.9rem' }}>₹{parseFloat(s.advance_given).toLocaleString('en-IN')}</div>
                                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,189,89,0.7)' }}>💼 Wallet Advance</div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>—</span>
                              )}
                            </td>

                            {/* Already paid */}
                            <td>
                              <div style={{ fontWeight: 700, color: '#00E5A0', fontSize: '0.9rem' }}>₹{parseFloat(s.amount_paid).toLocaleString('en-IN')}</div>
                            </td>

                            {/* Month-wise Due → remaining */}
                            <td>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: monthRem < 0 ? '#5B8CFF' : (monthRem === 0 ? '#00E5A0' : '#FF6B6B') }}>
                                {monthRem < 0 ? `−₹${Math.abs(monthRem).toLocaleString('en-IN')}` : (monthRem === 0 ? '₹0' : `₹${monthRem.toLocaleString('en-IN')}`)}
                              </div>
                              {monthRem < 0 && <div style={{ fontSize: '0.65rem', color: '#5B8CFF', marginTop: '2px', fontWeight: 600 }}>Advance Given</div>}
                            </td>

                            {/* Last paid */}
                            <td>
                              <div style={{ fontSize: '0.82rem' }}>
                                {s.paid_at ? new Date(s.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : <span style={{ color: 'var(--clr-muted)' }}>Never</span>}
                              </div>
                              {s.paid_at && <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{s.days_since_last_paid} days ago</div>}
                            </td>

                            {/* Pay button */}
                            <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {parseFloat(s.amount_paid) > 0 && (
                                  <button
                                    title="Undo last payment"
                                    onClick={() => setUndoingSalary(s)}
                                    style={{
                                      padding: '8px',
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: '10px',
                                      color: 'var(--clr-muted)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.borderColor = 'rgba(255,107,107,0.3)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--clr-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                  >
                                    <RotateCcw size={16} />
                                  </button>
                                )}
                                <button
                                  className="btn"
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    background: isFullyPaid ? 'rgba(0,229,160,0.08)' : 'linear-gradient(135deg,#FF6B6B,#FF8C42)',
                                    color: isFullyPaid ? '#00E5A0' : '#fff',
                                    border: isFullyPaid ? '1px solid rgba(0,229,160,0.25)' : 'none',
                                    borderRadius: '10px',
                                    cursor: isFullyPaid ? 'default' : 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                  onClick={() => !isFullyPaid && setPayingSalary(s)}
                                  disabled={isFullyPaid}
                                >
                                  {isFullyPaid ? '✅ Paid' : '💵 Pay Now'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>}
              </div>
            </div>

            <SalaryPayModal
              isOpen={!!payingSalary}
              record={payingSalary}
              bankAccounts={bankAccounts}
              onCancel={() => setPayingSalary(null)}
              showToast={showToast}
              onPay={async (payload) => {
                try {
                  await api.post(`/salary/${payingSalary.id}/pay/`, payload)
                  showToast('✅ Salary payment recorded')
                  setPayingSalary(null)
                  fetchSalaries()
                  fetchBankStats()
                  fetchBankAccounts()
                } catch (err) {
                  showToast(`❌ ${err.response?.data?.detail || 'Payment failed'}`)
                }
              }}
            />
          </div>
        )}

        {/* ═══ ANALYSIS (Owner only) ════════════════════════════════════════════ */}
        {tab === 'analysis' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1>📈 Business Analysis</h1>
                <p>Operational & financial overview for {stats.agency_name}</p>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', textAlign: 'right' }}>
                Last refreshed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* ── Top Financial Stat Cards (unchanged) ── */}
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Revenue / Month</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00E5A0' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Salary Cost / Month</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B6B' }}>₹{totalSalary.toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Gross Profit</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: totalRevenue - totalSalary >= 0 ? '#5B8CFF' : '#FF6B6B' }}>₹{(totalRevenue - totalSalary).toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', marginTop: '4px' }}>
                  {totalRevenue > 0 ? `${Math.round(((totalRevenue - totalSalary) / totalRevenue) * 100)}% margin` : '—'}
                </div>
              </div>
              <div className="stat-card glass-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Wallet Balance</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7C5CFF' }}>₹{parseFloat(wallet?.balance || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* ── Live Attendance Summary ── */}
            {(() => {
              const assignedGuards = guards.filter(g => g.site && g.shift)
              const presentToday = assignedGuards.filter(g => g.today_attendance?.status === 'present' || g.today_attendance?.status === 'late')
              const absentToday = assignedGuards.filter(g => g.today_attendance?.status === 'absent')
              const pendingToday = assignedGuards.filter(g => !g.today_attendance)
              const unassigned = guards.filter(g => !g.site || !g.shift)
              const total = assignedGuards.length || 1
              return (
                <div className="card glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div className="card-title">📅 Today's Attendance — Live</div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)' }}>{assignedGuards.length} assigned guards total</div>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Close the day? All guards with no attendance today will be marked ABSENT.')) return
                            const today = new Date().toISOString().split('T')[0]
                            const unrecorded = guards.filter(g => g.site && g.shift && !g.today_attendance)
                            let count = 0
                            for (const g of unrecorded) {
                              try {
                                await api.post('/company/attendance/', {
                                  guard: g.id, site: g.site, shift: g.shift,
                                  status: 'absent', date: today
                                })
                                count++
                              } catch {}
                            }
                            await fetchGuards()
                            showToast(`🗓 Day closed — ${count} guard(s) marked Absent`)
                          }}
                          style={{ padding: '6px 12px', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', color: '#FF6B6B', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}
                        >
                          🗓 Close Day
                        </button>
                      </div>
                    </div>
                  {/* Visual bar */}
                  <div style={{ display: 'flex', height: '10px', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', gap: '2px' }}>
                    <div style={{ width: `${(presentToday.length / total) * 100}%`, background: '#00E5A0', transition: 'width 0.6s ease' }} />
                    <div style={{ width: `${(absentToday.length / total) * 100}%`, background: '#FF6B6B', transition: 'width 0.6s ease' }} />
                    <div style={{ width: `${(pendingToday.length / total) * 100}%`, background: 'rgba(255,255,255,0.1)', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {[
                      { label: 'Present', count: presentToday.length, color: '#00E5A0', bg: 'rgba(0,229,160,0.08)', icon: '✅' },
                      { label: 'Absent', count: absentToday.length, color: '#FF6B6B', bg: 'rgba(255,107,107,0.08)', icon: '🔴' },
                      { label: 'Pending', count: pendingToday.length, color: '#FFA940', bg: 'rgba(255,169,64,0.08)', icon: '⏳' },
                      { label: 'Unassigned', count: unassigned.length, color: 'var(--clr-muted)', bg: 'rgba(255,255,255,0.03)', icon: '—' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: s.bg, borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.count}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Two column row: Pie charts + Guard Breakdown ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>

              {/* Pie charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  {
                    title: 'Attendance Today',
                    data: [
                      { name: 'Present', value: guards.filter(g => g.today_attendance?.status === 'present' || g.today_attendance?.status === 'late').length },
                      { name: 'Absent', value: guards.filter(g => g.today_attendance?.status === 'absent').length },
                      { name: 'Pending', value: guards.filter(g => g.site && !g.today_attendance).length },
                    ]
                  },
                  {
                    title: 'Guard Types',
                    data: [
                      { name: 'Regular', value: guards.filter(g => g.guard_type === 'regular').length },
                      { name: 'Temporary', value: guards.filter(g => g.guard_type === 'temporary').length },
                    ]
                  },
                  {
                    title: 'Site Status Now',
                    data: [
                      { name: 'Open', value: sites.filter(s => isSiteOpen(s).isOpen).length },
                      { name: 'Closed', value: sites.filter(s => !isSiteOpen(s).isOpen).length },
                    ]
                  },
                  {
                    title: 'Guard Assignment',
                    data: [
                      { name: 'Assigned', value: guards.filter(g => g.site && g.shift).length },
                      { name: 'Unassigned', value: guards.filter(g => !g.site || !g.shift).length },
                    ]
                  },
                ].map((c, i) => (
                  <div key={i} className="card glass-card" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--clr-muted)' }}>{c.title}</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={c.data} cx="50%" cy="50%" outerRadius={50} innerRadius={22} dataKey="value" paddingAngle={3}>
                          {c.data.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v}`, n]} contentStyle={{ background: 'var(--clr-surface-1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.78rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {c.data.map((d, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--clr-muted)' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          {d.name}: <strong style={{ color: '#fff' }}>{d.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Guard Financial Breakdown */}
              <div className="card glass-card" style={{ padding: '24px' }}>
                <div className="card-title" style={{ marginBottom: '16px' }}>💰 Guard Cost Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const regular = guards.filter(g => g.guard_type === 'regular')
                    const temp = guards.filter(g => g.guard_type === 'temporary')
                    const regSalary = regular.reduce((s, g) => s + parseFloat(g.monthly_salary || 0), 0)
                    const tempEarned = temp.reduce((s, g) => s + (g.days_present_month || 0) * (g.daily_rate || 0), 0)
                    const totalAdv = guards.reduce((s, g) => s + parseFloat(g.advance_paid || 0), 0)
                    const rows = [
                      { label: 'Regular Guards', sub: `${regular.length} guards`, val: `₹${regSalary.toLocaleString('en-IN')}`, color: '#5B8CFF' },
                      { label: 'Temp Guards (earned)', sub: `${temp.length} guards this month`, val: `₹${Math.round(tempEarned).toLocaleString('en-IN')}`, color: '#FFA940' },
                      { label: 'Advance Paid Out', sub: 'across all guards', val: `₹${Math.round(totalAdv).toLocaleString('en-IN')}`, color: '#FF6B6B' },
                      { label: 'Total Payroll', sub: 'regular + temp earned', val: `₹${Math.round(regSalary + tempEarned).toLocaleString('en-IN')}`, color: '#00E5A0' },
                    ]
                    return rows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', borderLeft: `3px solid ${r.color}` }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.label}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>{r.sub}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: r.color, fontSize: '1rem' }}>{r.val}</div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>

            {/* ── Bank Account Health ── */}
            {bankStats.length > 0 && (
              <div className="card glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div className="card-title">💳 Bank Account Health</div>
                  <button className="btn" style={{ fontSize: '0.78rem', padding: '6px 14px', background: 'rgba(124,92,255,0.15)', color: '#7C5CFF' }} onClick={() => setTab('bank')}>View Details →</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {['Account', 'Bank', 'Balance', 'Credited', 'Debited', 'Transactions', 'Limit Used'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', fontSize: '0.72rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bankStats.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: '0.88rem' }}>{b.account_name}{b.is_default && <span style={{ marginLeft: '6px', fontSize: '0.62rem', background: 'rgba(124,92,255,0.2)', color: '#7C5CFF', padding: '2px 6px', borderRadius: '10px' }}>DEFAULT</span>}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--clr-muted)', fontSize: '0.82rem' }}>{b.bank_name}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#00E5A0' }}>₹{b.balance.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 14px', color: '#00E5A0', fontSize: '0.88rem' }}>↑ ₹{b.total_credited.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 14px', color: '#FF6B6B', fontSize: '0.88rem' }}>↓ ₹{b.total_debited.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 14px', color: 'var(--clr-muted)', fontSize: '0.82rem' }}>{b.transaction_count}</td>
                          <td style={{ padding: '12px 14px', minWidth: '140px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, b.limit_used_pct)}%`, height: '100%', background: b.limit_used_pct >= 80 ? '#FF6B6B' : b.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0', borderRadius: '4px', transition: 'width 0.5s' }} />
                              </div>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: b.limit_used_pct >= 80 ? '#FF6B6B' : b.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0', whiteSpace: 'nowrap' }}>{b.limit_used_pct}%</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', marginTop: '3px' }}>₹{(b.limit_remaining / 100000).toFixed(1)}L left of ₹{(b.transaction_limit / 100000).toFixed(0)}L</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Site Performance Table ── */}
            <div className="card glass-card" style={{ padding: '24px', marginBottom: '24px', overflow: 'hidden' }}>
              <div className="card-title" style={{ marginBottom: '16px' }}>🏢 Site Performance</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Site', 'Status', 'Revenue/mo', 'Guards', 'Fill %', 'Shifts', 'Present Today'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', fontSize: '0.72rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map(site => {
                      const { isOpen, activeShift } = isSiteOpen(site)
                      const siteGuards = guards.filter(g => g.site === site.id)
                      const presentCount = siteGuards.filter(g => g.today_attendance?.status === 'present' || g.today_attendance?.status === 'late').length
                      const fillPct = site.num_securities > 0 ? Math.round((siteGuards.length / site.num_securities) * 100) : 0
                      return (
                        <tr key={site.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{site.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>{site.address || '—'}</div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: isOpen ? 'rgba(0,229,160,0.12)' : 'rgba(255,255,255,0.05)', color: isOpen ? '#00E5A0' : 'var(--clr-muted)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {isOpen ? '🟢 OPEN' : '⚫ CLOSED'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#7C5CFF', fontSize: '0.9rem' }}>₹{parseFloat(site.monthly_amount || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.9rem' }}>{siteGuards.length} / {site.num_securities}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', minWidth: '50px' }}>
                                <div style={{ width: `${Math.min(100, fillPct)}%`, height: '100%', background: fillPct >= 100 ? '#FF6B6B' : '#00E5A0', borderRadius: '4px' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: fillPct >= 100 ? '#FF6B6B' : '#00E5A0' }}>{fillPct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--clr-muted)' }}>{(site.shifts || []).length} shift{(site.shifts || []).length !== 1 ? 's' : ''}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ fontWeight: 700, color: presentCount > 0 ? '#00E5A0' : 'var(--clr-muted)' }}>{presentCount}</span>
                            <span style={{ color: 'var(--clr-muted)', fontSize: '0.75rem' }}> / {siteGuards.length}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Revenue vs Salary Bar Chart ── */}
            <div className="card glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="card-title">Revenue by Site</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#7C5CFF' }} /> Revenue</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sites.map(s => ({ name: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name, revenue: parseFloat(s.monthly_amount || 0) }))} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: 'var(--clr-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--clr-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ background: 'var(--clr-surface-1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.82rem' }} />
                  <Bar dataKey="revenue" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C5CFF" />
                      <stop offset="100%" stopColor="#5B8CFF" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}


        {/* ═══ BANK ACCOUNTS ════════════════════════════════════════════════════ */}
        {tab === 'bank' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div><h1>🏦 Bank Accounts</h1><p>Manage accounts, track transaction limits and ledgers</p></div>
              <button className="btn btn-primary btn-glow" onClick={() => { setShowAddBank(true); setEditBankData(null) }}><span style={{ marginRight: '6px' }}>+</span> Add Account</button>
            </div>

            {/* Add / Edit form */}
            {(showAddBank || editBankData) && (
              <div className="card glass-card" style={{ marginBottom: '24px', padding: '28px', border: '1px solid rgba(124,92,255,0.4)' }}>
                <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>{editBankData ? '✏️ Edit Bank Account' : '➕ Add New Bank Account'}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const payload = editBankData ? { ...editBankData } : { ...bankForm }
                  try {
                    if (editBankData) {
                      await api.patch(`/billing/bank-accounts/${editBankData.id}/`, payload)
                      showToast('✅ Account updated!')
                    } else {
                      await api.post('/billing/bank-accounts/', payload)
                      showToast('✅ Account added!')
                    }
                    setShowAddBank(false); setEditBankData(null)
                    setBankForm({ account_name: '', bank_name: '', account_no: '', ifsc: '', upi_id: '', balance: 0, transaction_limit: 2000000, is_default: false })
                    fetchBankAccounts(); fetchBankStats()
                    } catch (err) {
                      const data = err.response?.data;
                      let msg = 'Failed';
                      if (data && data.detail) msg = data.detail;
                      else if (data && typeof data === 'object') msg = Object.values(data).flat().join(', ');
                      showToast(`❌ ${msg}`)
                    }
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {[
                        { label: 'Account Name *', key: 'account_name', type: 'text', ph: 'e.g. HDFC Current', req: true },
                        { label: 'Bank Name *', key: 'bank_name', type: 'text', ph: 'e.g. HDFC Bank', req: true },
                        { label: 'Account Number *', key: 'account_no', type: 'text', ph: 'e.g. 50100XXXXXX', req: true },
                        { label: 'IFSC Code', key: 'ifsc', type: 'text', ph: 'e.g. HDFC0001234' },
                        { label: 'UPI ID', key: 'upi_id', type: 'text', ph: 'e.g. business@hdfc' },
                        { label: 'Current Balance (₹)', key: 'balance', type: 'number', ph: '0' },
                        { label: 'Monthly Txn Limit (₹)', key: 'transaction_limit', type: 'number', ph: '2000000' },
                      ].map(({ label, key, type, ph, req }) => (
                        <div className="form-group" key={key}>
                          <label className="form-label">{label}</label>
                          <input type={type} className="form-input" placeholder={ph} required={req}
                            value={editBankData ? (editBankData[key] ?? '') : (bankForm[key] ?? '')}
                            onChange={e => editBankData
                              ? setEditBankData(p => ({ ...p, [key]: e.target.value }))
                              : setBankForm(p => ({ ...p, [key]: e.target.value }))
                            } />
                        </div>
                    ))}
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>
                      <input type="checkbox" id="is_default_chk"
                        checked={editBankData ? editBankData.is_default : bankForm.is_default}
                        onChange={e => editBankData
                          ? setEditBankData(p => ({ ...p, is_default: e.target.checked }))
                          : setBankForm(p => ({ ...p, is_default: e.target.checked }))
                        } style={{ width: '18px', height: '18px', accentColor: '#7C5CFF' }} />
                      <label htmlFor="is_default_chk" style={{ fontSize: '0.88rem', fontWeight: 600 }}>Set as Default Account</label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary btn-glow">{editBankData ? 'Save Changes' : 'Add Account'}</button>
                    <button type="button" className="btn" style={{ background: 'var(--clr-surface-2)' }} onClick={() => { setShowAddBank(false); setEditBankData(null) }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Account Cards */}
            {bankStats.length === 0 && !showAddBank ? (
              <div className="card glass-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏦</div>
                <h3 style={{ marginBottom: '8px' }}>No Bank Accounts Yet</h3>
                <p style={{ color: 'var(--clr-muted)', marginBottom: '24px' }}>Add your agency's bank accounts to start tracking payments and salary disbursements.</p>
                <button className="btn btn-primary btn-glow" onClick={() => setShowAddBank(true)}>+ Add First Account</button>
              </div>
            ) : (
              <div ref={bankGridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px', alignItems: 'start' }}>
                {bankStats.map(b => (
                  <div key={b.id} className="card glass-card bank-account-card" style={{ padding: '26px', border: b.is_default ? '1px solid rgba(124,92,255,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1.3rem' }}>🏦</span>
                          <strong style={{ fontSize: '1.05rem' }}>{b.account_name}</strong>
                          {b.is_default && <span style={{ fontSize: '0.62rem', background: 'rgba(124,92,255,0.2)', color: '#7C5CFF', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>DEFAULT</span>}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)' }}>{b.bank_name} · ****{b.account_no?.slice(-4)}</div>
                        {b.upi_id && <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '2px' }}>UPI: {b.upi_id}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn" title="Statement" onClick={() => setStatementModal(b)}
                          style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(0,229,160,0.12)', color: '#00E5A0', border: '1px solid rgba(0,229,160,0.25)', borderRadius: '8px' }}>
                          📊 Statement
                        </button>
                        <button className="btn-icon" title="Edit" onClick={() => { setEditBankData(bankAccounts.find(a => a.id === b.id)); setShowAddBank(false) }} style={{ fontSize: '0.85rem' }}>✏️</button>
                        <button className="btn-icon btn-icon-danger" title="Delete" onClick={async () => {
                          if (!window.confirm(`Delete account "${b.account_name}"?`)) return
                          try { await api.delete(`/billing/bank-accounts/${b.id}/`); showToast('🗑️ Account deleted'); fetchBankAccounts(); fetchBankStats() } catch { showToast('❌ Failed') }
                        }} style={{ fontSize: '0.85rem' }}>🗑️</button>
                      </div>
                    </div>

                    {/* Balance */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                      <div style={{ background: 'rgba(0,229,160,0.07)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #00E5A0' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Balance</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#00E5A0' }}>{formatCurrency(b.balance)}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(0,229,160,0.6)', marginTop: '2px' }}>{formatFullCurrency(b.balance)}</div>
                      </div>
                      <div style={{ background: 'rgba(91,140,255,0.07)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #5B8CFF' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Transactions</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#5B8CFF' }}>{b.transaction_count}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>{b.payment_count} payments · {b.salary_count} salaries</div>
                      </div>
                    </div>

                    {/* Credit / Debit row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(0,229,160,0.05)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>↑</span>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', textTransform: 'uppercase' }}>Credited (Payments)</div>
                          <div style={{ fontWeight: 700, color: '#00E5A0', fontSize: '0.95rem' }}>₹{b.total_credited.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,107,107,0.05)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>↓</span>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', textTransform: 'uppercase' }}>Debited (Salary)</div>
                          <div style={{ fontWeight: 700, color: '#FF6B6B', fontSize: '0.95rem' }}>₹{b.total_debited.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Limit bar */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', fontWeight: 600 }}>Monthly Txn Limit Used</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.limit_used_pct >= 80 ? '#FF6B6B' : b.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0' }}>{b.limit_used_pct}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, b.limit_used_pct)}%`, height: '100%', background: b.limit_used_pct >= 80 ? '#FF6B6B' : b.limit_used_pct >= 50 ? '#FFA940' : 'linear-gradient(90deg,#7C5CFF,#00E5A0)', borderRadius: '10px', transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>₹{(b.total_volume / 100000).toFixed(2)}L used</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>₹{(b.limit_remaining / 100000).toFixed(2)}L remaining of ₹{(b.transaction_limit / 100000).toFixed(0)}L</span>
                      </div>
                    </div>

                    {/* View Transactions */}
                    <button
                      className="btn btn-glow"
                      style={{ width: '100%', background: activeBankId === b.id ? 'rgba(124,92,255,0.25)' : 'rgba(124,92,255,0.1)', color: '#7C5CFF', border: '1px solid rgba(124,92,255,0.3)', fontWeight: 600, fontSize: '0.85rem' }}
                      onClick={async () => {
                        if (activeBankId === b.id) { setActiveBankId(null); setBankTxns([]) }
                        else { setActiveBankId(b.id); await fetchBankTxns(b.id) }
                      }}
                    >
                      {activeBankId === b.id ? '▲ Hide Transactions' : '📋 View Transactions'}
                    </button>

                    {/* Transactions drill-down */}
                    {activeBankId === b.id && (() => {
                      const fmtDate = (iso) => {
                        if (!iso) return '—'
                        const parts = iso.split('T')[0].split('-')
                        if (parts.length < 3) return iso
                        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                        return `${parts[2]} ${months[parseInt(parts[1])-1]} ${parts[0]}`
                      }
                      const fmtTime = (iso) => {
                        if (!iso) return ''
                        return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                      }
                      
                      return (
                        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', marginBottom: '12px', fontWeight: 600 }}>Last 30 Days Activity</div>
                          
                          {/* Summary strip */}
                          {bankTxns.length > 0 && (() => {
                            const totalCr = bankTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
                            const totalDb = bankTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
                            return (
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ flex: 1, background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.62rem', color: '#00E5A0', fontWeight: 700, textTransform: 'uppercase' }}>Credits</div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#00E5A0' }}>+₹{totalCr.toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.62rem', color: '#FF6B6B', fontWeight: 700, textTransform: 'uppercase' }}>Debits</div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FF6B6B' }}>−₹{totalDb.toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.15)', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.62rem', color: '#7C5CFF', fontWeight: 700, textTransform: 'uppercase' }}>Net</div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#7C5CFF' }}>{(totalCr - totalDb) >= 0 ? '+' : ''}₹{(totalCr - totalDb).toLocaleString('en-IN')}</div>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Transactions list */}
                          {bankTxns.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-muted)', fontSize: '0.85rem' }}>No transactions for this period.</div>
                          ) : (
                            <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                              {bankTxns.map(txn => (
                                <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: txn.type === 'credit' ? 'rgba(0,229,160,0.04)' : 'rgba(255,107,107,0.04)', borderRadius: '8px', borderLeft: `3px solid ${txn.type === 'credit' ? '#00E5A0' : '#FF6B6B'}` }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{txn.description}</div>
                                    <div style={{ fontSize: '0.67rem', color: 'var(--clr-muted)', marginTop: '2px' }}>
                                      {fmtDate(txn.date)} {txn.timestamp && <span style={{ opacity: 0.5 }}>· {fmtTime(txn.timestamp)}</span>}
                                      {txn.category && <span style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.62rem', textTransform: 'capitalize' }}>{txn.category}</span>}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: txn.type === 'credit' ? '#00E5A0' : '#FF6B6B' }}>
                                      {txn.type === 'credit' ? '+' : '−'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                                      Bal: ₹{parseFloat(txn.running_balance || 0).toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ANALYSIS ════════════════════════════════════════════════════════ */}
        {tab === 'analysis' && (
          <div className="tab-content animate-fadeIn">
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {(() => {
                  const now = new Date()
                  const curY = now.getFullYear()
                  const curM = now.getMonth() + 1
                  
                  const start = stats.agency_created_at ? new Date(stats.agency_created_at) : new Date()
                  const startY = start.getFullYear()
                  const startM = start.getMonth() + 1

                  const years = []
                  for (let y = startY; y <= curY; y++) years.push(y)

                  const months = [
                    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
                    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
                    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
                    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' }
                  ].filter(m => {
                    if (salaryYear === startY && m.v < startM) return false
                    if (salaryYear === curY && m.v > curM) return false
                    return true
                  })

                  return (
                    <div className="glass-card" style={{ display: 'flex', gap: '8px', padding: '6px 12px', alignItems: 'center', borderRadius: '10px' }}>
                      <select className="form-control" style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', width: '110px' }} value={salaryMonth} onChange={e => setSalaryMonth(parseInt(e.target.value))}>
                        {months.map(m => (
                          <option key={m.v} value={m.v} style={{ background: '#1a1a1a', color: '#fff' }}>{m.l}</option>
                        ))}
                      </select>
                      <select className="form-control" style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', width: '80px' }} value={salaryYear} onChange={e => {
                        const newY = parseInt(e.target.value)
                        setSalaryYear(newY)
                        if (newY === startY && salaryMonth < startM) setSalaryMonth(startM)
                        if (newY === curY && salaryMonth > curM) setSalaryMonth(curM)
                      }}>
                        {years.map(y => (
                          <option key={y} value={y} style={{ background: '#1a1a1a', color: '#fff' }}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )
                })()}
                <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => { fetchStats(); fetchBankStats(); fetchBills(); fetchPayments(); fetchSalaries(salaryMonth, salaryYear); showToast('🔄 Analytics Refreshed') }}>
                  <RefreshCw size={14} /> Refresh
                </button>
            </div>
            
            {/* ── PERFORMANCE & PROJECTIONS ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              
              <div className="card glass-card" style={{ borderLeft: '4px solid #5B8CFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', fontWeight: 600 }}>PROJECTED REVENUE</div>
                  <Globe size={16} color="#5B8CFF" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '8px 0' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Monthly Site Contracts</div>
              </div>

              <div className="card glass-card" style={{ borderLeft: '4px solid #FFBD59', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', fontWeight: 600 }}>SALARY OBLIGATION</div>
                  <Users size={16} color="#FFBD59" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '8px 0' }}>₹{totalSalary.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Fixed Staff Cost</div>
              </div>

              <div className="card glass-card" style={{ borderLeft: '4px solid #00E5A0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', fontWeight: 600 }}>EST. NET PROFIT</div>
                  <TrendingUp size={16} color="#00E5A0" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00E5A0', margin: '8px 0' }}>₹{(totalRevenue - totalSalary).toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Potential Surplus</div>
              </div>

              <div className="card glass-card" style={{ borderLeft: '4px solid #7C5CFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', fontWeight: 600 }}>PROFIT MARGIN</div>
                  <PieChartIcon size={16} color="#7C5CFF" />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#7C5CFF', margin: '8px 0' }}>{Math.round(((totalRevenue - totalSalary) / (totalRevenue || 1)) * 100)}%</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Efficiency Score</div>
              </div>

            </div>

            {/* ── ACTUALS & DUES (REAL-TIME MONTHLY) ───────────────────────── */}
            {(() => {
              const isTargetMonth = (dStr) => {
                if (!dStr) return false
                const d = new Date(dStr)
                // In Analysis mode, we match the selected salaryMonth/salaryYear
                return d.getMonth() + 1 === salaryMonth && d.getFullYear() === salaryYear
              }

              const thisMonthIncome = payments
                .filter(p => p.status === 'verified' && isTargetMonth(p.paid_at))
                .reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0)

              const thisMonthExpenses = salaries
                .reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0)

              const siteDues = bills.reduce((sum, b) => sum + parseFloat(b.remaining || 0), 0)
              
              const salaryDues = salaries.reduce((sum, s) => {
                const earned = parseFloat(s.amount_earned || 0)
                const paid   = parseFloat(s.amount_paid || 0)
                return sum + Math.max(0, earned - paid)
              }, 0)

              const actualNet = thisMonthIncome - thisMonthExpenses

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  
                  {/* MONEY RECEIVED */}
                  <div className="card glass-card" style={{ background: 'rgba(0,229,160,0.05)', borderBottom: '3px solid #00E5A0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '0.75rem', color: '#00E5A0', fontWeight: 800 }}>MONEY RECEIVED</div>
                      <ArrowDownLeft size={16} color="#00E5A0" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '8px 0' }}>₹{thisMonthIncome.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Verified Payments (This Month)</div>
                  </div>

                  {/* SALARY PAID */}
                  <div className="card glass-card" style={{ background: 'rgba(255,107,107,0.05)', borderBottom: '3px solid #FF6B6B', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '0.75rem', color: '#FF6B6B', fontWeight: 800 }}>SALARY PAID</div>
                      <ArrowUpRight size={16} color="#FF6B6B" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '8px 0' }}>₹{thisMonthExpenses.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Actual Payouts ({monthNames[salaryMonth-1]})</div>
                  </div>

                  {/* ACTUAL NET (MONTHLY) */}
                  <div className="card glass-card" style={{ background: 'rgba(124,92,255,0.05)', borderBottom: '3px solid #7C5CFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '0.75rem', color: '#7C5CFF', fontWeight: 800 }}>NET (THIS MONTH)</div>
                      <TrendingUp size={16} color="#7C5CFF" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: actualNet >= 0 ? '#00E5A0' : '#FF6B6B', margin: '8px 0' }}>
                      {actualNet < 0 ? '-' : ''}₹{Math.abs(actualNet).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Real Monthly Business Net</div>
                  </div>

                  {/* SALARY DUE (GUARDS) */}
                  <div className="card glass-card" style={{ background: 'rgba(91,140,255,0.05)', borderBottom: '3px solid #5B8CFF', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '0.75rem', color: '#5B8CFF', fontWeight: 800 }}>SALARY PAYOUT DUE</div>
                      <Users size={16} color="#5B8CFF" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '8px 0' }}>₹{salaryDues.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>Unpaid for {monthNames[salaryMonth-1]}</div>
                  </div>

                </div>
              )
            })()}

            {/* Site Performance Table (Full Width) */}
            <div className="card glass-card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">🏢 Site-wise Revenue Analysis</div>
                  <div className="card-sub">Top earners and contribution for {monthNames[salaryMonth-1]}</div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Site Name</th>
                      <th style={{ textAlign: 'right' }}>Contract</th>
                      <th style={{ textAlign: 'right' }}>Received</th>
                      <th style={{ textAlign: 'center' }}>Avg. Exp</th>
                      <th style={{ textAlign: 'right' }}>Net (This Month)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const isThisM = (dStr) => {
                        if (!dStr) return false
                        const d = new Date(dStr)
                        return d.getMonth() + 1 === salaryMonth && d.getFullYear() === salaryYear
                      }

                      return sites.sort((a,b) => b.monthly_amount - a.monthly_amount).slice(0, 10).map(s => {
                          const siteSalaries = guards.filter(g => g.site === s.id).reduce((sum, g) => sum + parseFloat(g.monthly_salary || 0), 0)
                          
                          const received = (payments || [])
                          .filter(p => p.bill_details?.site === s.id && p.status === 'verified' && isThisM(p.paid_at))
                          .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
                          
                          const paidExp = (salaries || [])
                          .filter(sr => sr.guard_site_id === s.id)
                          .reduce((sum, sr) => sum + parseFloat(sr.amount_paid || 0), 0)

                          const net = received - paidExp
                          
                          return (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                            <td style={{ textAlign: 'right', fontSize: '0.75rem', opacity: 0.6 }}>₹{parseFloat(s.monthly_amount).toLocaleString('en-IN')}</td>
                            <td style={{ textAlign: 'right', color: '#00E5A0', fontWeight: 700 }}>₹{received.toLocaleString('en-IN')}</td>
                            <td style={{ textAlign: 'center', opacity: 0.6 }}>₹{siteSalaries.toLocaleString('en-IN')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#5B8CFF' : '#FF6B6B' }}>
                              ₹{net.toLocaleString('en-IN')}
                            </td>
                          </tr>
                          )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ WALLET ═══════════════════════════════════════════════════════════ */}
        {tab === 'wallet' && (
          <div className="tab-content animate-fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div><h1>💼 Virtual Wallet</h1><p>Agency business wallet — deposit, withdraw, pay guards & supervisors</p></div>
              <button className="btn btn-primary" style={{ padding: '8px 18px' }} onClick={() => { fetchWallet(); showToast('🔄 Wallet refreshed') }}><RefreshCw size={14} /> Refresh</button>
            </div>

            {/* ── Balance Hero ── */}
            <div style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.2) 0%, rgba(0,229,160,0.1) 100%)', border: '1px solid rgba(124,92,255,0.35)', borderRadius: '20px', padding: '32px 36px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Current Balance</div>
                <div style={{ fontSize: '3.2rem', fontWeight: 900, color: parseFloat(wallet?.balance || 0) >= 0 ? '#00E5A0' : '#FF6B6B', lineHeight: 1 }}>₹{parseFloat(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginTop: 8 }}>Last updated: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString('en-IN') : '—'}</div>
              </div>
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'deposit', label: '💰 Deposit', color: '#00E5A0', bg: 'rgba(0,229,160,0.15)', border: 'rgba(0,229,160,0.4)', show: true },
                  { id: 'withdraw', label: '📤 Withdraw', color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', border: 'rgba(255,107,107,0.4)', show: true },
                  { id: 'give_admin', label: '👨‍💼 Give to Admin', color: '#7C5CFF', bg: 'rgba(124,92,255,0.15)', border: 'rgba(124,92,255,0.4)', show: user?.role === 'owner' },
                  { id: 'give_sup', label: '👔 Give to Supervisor', color: '#FFBD59', bg: 'rgba(255,189,89,0.15)', border: 'rgba(255,189,89,0.4)', show: ['owner', 'admin'].includes(user?.role) },
                  { id: 'give_guard', label: '🛡️ Give to Guard', color: '#5B8CFF', bg: 'rgba(91,140,255,0.15)', border: 'rgba(91,140,255,0.4)', show: true },
                ].filter(b => b.show).map(btn => (
                  <button key={btn.id} onClick={() => { resetWalletForm(); setWalletModal(btn.id) }} style={{ padding: '10px 18px', borderRadius: '12px', border: `1px solid ${btn.border}`, background: btn.bg, color: btn.color, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >{btn.label}</button>
                ))}
              </div>
            </div>

            {/* ── Transaction History ── */}
            <div className="card glass-card">
              <div className="card-header" style={{ marginBottom: 0 }}>
                <div><div className="card-title">📄 Transaction History</div><div className="card-sub">All wallet activity — bank statement style</div></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Source / Account</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(wallet?.transactions || []).length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-muted)' }}>No transactions yet. Make your first deposit to get started.</td></tr>
                    ) : (
                      (wallet?.transactions || []).map(txn => {
                        const isCredit = ['deposit', 'transfer_in'].includes(txn.txn_type)
                        const typeConfig = {
                          deposit:         { label: 'Deposit',        color: '#00E5A0', icon: '💰' },
                          withdraw:        { label: 'Withdraw',       color: '#FF6B6B', icon: '📤' },
                          give_guard:      { label: 'Guard Advance',  color: '#5B8CFF', icon: '🛡️' },
                          give_supervisor: { label: 'To Supervisor',  color: '#FFBD59', icon: '👔' },
                          give_admin:      { label: 'To Admin',       color: '#7C5CFF', icon: '👨‍💼' },
                          transfer_in:     { label: 'Received',       color: '#00E5A0', icon: '⬇️' },
                          transfer_out:    { label: 'Sent',           color: '#FF6B6B', icon: '⬆️' },
                          fuel:            { label: 'Fuel',           color: '#FFA940', icon: '⛽' },
                          salary_deduct:   { label: 'Salary Deduct',  color: '#FF6B6B', icon: '📉' },
                        }[txn.txn_type] || { label: txn.txn_type, color: '#fff', icon: '💱' }
                        return (
                          <tr key={txn.id} style={{ background: isCredit ? 'rgba(0,229,160,0.03)' : 'rgba(255,107,107,0.03)' }}>
                            <td style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', whiteSpace: 'nowrap' }}>{new Date(txn.created_at).toLocaleString('en-IN')}</td>
                            <td><span style={{ background: `${typeConfig.color}20`, color: typeConfig.color, border: `1px solid ${typeConfig.color}40`, borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{typeConfig.icon} {typeConfig.label}</span></td>
                            <td style={{ fontSize: '0.85rem', maxWidth: 220 }}>
                              <div style={{ fontWeight: 500 }}>{txn.note || '—'}</div>
                              {txn.related_guard_name && <div style={{ fontSize: '0.72rem', color: '#5B8CFF' }}>→ {txn.related_guard_name}</div>}
                              {txn.related_user_name  && <div style={{ fontSize: '0.72rem', color: '#FFBD59' }}>↔ {txn.related_user_name}</div>}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--clr-muted)' }}>
                              {txn.source === 'bank' ? <span style={{ color: '#5B8CFF' }}>🏦 {txn.bank_account_name || 'Bank'}</span> : <span>💵 Cash</span>}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: isCredit ? '#00E5A0' : '#FF6B6B', whiteSpace: 'nowrap' }}>
                              {isCredit ? '+' : '−'}₹{parseFloat(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>₹{parseFloat(txn.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── WALLET MODALS ── */}
        {walletModal && (
          <div className="modal-overlay" onClick={() => { setWalletModal(null); resetWalletForm() }}>
            <div className="modal-content glass-card animate-fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
                  {walletModal === 'deposit'    && '💰 Deposit'}
                  {walletModal === 'withdraw'   && '📤 Withdraw'}
                  {walletModal === 'give_guard' && '🛡️ Give to Guard'}
                  {walletModal === 'give_sup'   && '👔 Give to Supervisor'}
                  {walletModal === 'give_admin' && '👨‍💼 Give to Admin'}
                </h2>
                <button className="btn-icon" onClick={() => { setWalletModal(null); resetWalletForm() }}><X size={18} /></button>
              </div>

              {/* Wallet Balance */}
              <div style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--clr-muted)' }}>Wallet Balance</span>
                <span style={{ fontWeight: 800, color: '#00E5A0' }}>₹{parseFloat(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Amount */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Amount (₹) *</label>
                <input type="number" className="form-input" placeholder="0.00" min="1" value={walletForm.amount} onChange={e => setWalletForm(p => ({ ...p, amount: e.target.value }))} style={{ color: '#fff' }} />
              </div>

              {/* Source selector for deposit/withdraw */}
              {(walletModal === 'deposit' || walletModal === 'withdraw') && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">{walletModal === 'deposit' ? 'Deposit From' : 'Withdraw To'}</label>
                  <div style={{ display: 'flex', gap: 10, marginBottom: walletForm.source === 'bank' ? 12 : 0 }}>
                    {[{ v: 'bank', label: '🏦 Bank Account' }, { v: 'cash', label: '💵 Cash' }].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setWalletForm(p => ({ ...p, source: opt.v, bank_account_id: '' }))}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${walletForm.source === opt.v ? '#7C5CFF' : 'rgba(255,255,255,0.1)'}`, background: walletForm.source === opt.v ? 'rgba(124,92,255,0.2)' : 'transparent', color: walletForm.source === opt.v ? '#fff' : 'var(--clr-muted)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                      >{opt.label}</button>
                    ))}
                  </div>
                  {walletForm.source === 'bank' && (
                    <select className="form-input" style={{ color: '#fff' }} value={walletForm.bank_account_id} onChange={e => setWalletForm(p => ({ ...p, bank_account_id: e.target.value }))}>
                      <option value="" style={{ background: '#1a1a1a' }}>— Select Bank Account —</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id} style={{ background: '#1a1a1a' }}>{b.account_name} — {b.bank_name} (₹{parseFloat(b.balance).toLocaleString('en-IN')})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Guard selector */}
              {walletModal === 'give_guard' && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Select Guard *</label>
                  <select className="form-input" style={{ color: '#fff' }} value={walletForm.guard_id} onChange={e => setWalletForm(p => ({ ...p, guard_id: e.target.value }))}>
                    <option value="" style={{ background: '#1a1a1a' }}>— Choose Guard —</option>
                    {guards.map(g => (
                      <option key={g.id} value={g.id} style={{ background: '#1a1a1a' }}>{g.name} {g.site_name ? `— ${g.site_name}` : ''}</option>
                    ))}
                  </select>
                  {walletForm.guard_id && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#FFBD59', padding: '6px 10px', background: 'rgba(255,189,89,0.1)', borderRadius: 8 }}>
                      ⚠️ This amount will be deducted from {guards.find(g => g.id.toString() === walletForm.guard_id.toString())?.name}'s salary for {monthNames[salaryMonth - 1]} {salaryYear}
                    </div>
                  )}
                </div>
              )}

              {/* Supervisor selector */}
              {walletModal === 'give_sup' && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Select Supervisor *</label>
                  <select className="form-input" style={{ color: '#fff' }} value={walletForm.supervisor_id} onChange={e => setWalletForm(p => ({ ...p, supervisor_id: e.target.value }))}>
                    <option value="" style={{ background: '#1a1a1a' }}>— Choose Supervisor —</option>
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id} style={{ background: '#1a1a1a' }}>{s.name} — {s.phone}</option>
                    ))}
                  </select>
                  {walletForm.supervisor_id && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#00E5A0', padding: '6px 10px', background: 'rgba(0,229,160,0.08)', borderRadius: 8 }}>
                      ✅ Amount will be credited to {supervisors.find(s => s.id.toString() === walletForm.supervisor_id.toString())?.name}'s wallet
                    </div>
                  )}
                </div>
              )}

              {/* Admin selector */}
              {walletModal === 'give_admin' && (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Select Admin *</label>
                  <select className="form-input" style={{ color: '#fff' }} value={walletForm.admin_id} onChange={e => setWalletForm(p => ({ ...p, admin_id: e.target.value }))}>
                    <option value="" style={{ background: '#1a1a1a' }}>— Choose Admin —</option>
                    {admins.map(a => (
                      <option key={a.id} value={a.id} style={{ background: '#1a1a1a' }}>{a.name} — {a.phone}</option>
                    ))}
                  </select>
                  {walletForm.admin_id && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#7C5CFF', padding: '6px 10px', background: 'rgba(124,92,255,0.08)', borderRadius: 8 }}>
                      ✅ Amount will be credited to {admins.find(a => a.id.toString() === walletForm.admin_id.toString())?.name}'s wallet
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Note (Optional)</label>
                <input type="text" className="form-input" placeholder="e.g. Monthly advance, fuel money..." value={walletForm.note} onChange={e => setWalletForm(p => ({ ...p, note: e.target.value }))} style={{ color: '#fff' }} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => { setWalletModal(null); resetWalletForm() }}>Cancel</button>
                <button className="btn btn-primary btn-glow" style={{ flex: 2 }} disabled={walletLoading} onClick={handleWalletAction}>
                  {walletLoading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Processing...</> : (
                   <>{walletModal === 'deposit' ? '💰 Confirm Deposit' : walletModal === 'withdraw' ? '📤 Confirm Withdraw' : walletModal === 'give_guard' ? '🛡️ Give Advance' : walletModal === 'give_admin' ? '👨‍💼 Transfer' : '👔 Transfer'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {showWhatsApp && (
        <WhatsAppModal 
          isOpen={showWhatsApp} 
          onClose={() => setShowWhatsApp(false)} 
          onParse={handleWhatsAppReport} 
          loading={genLoading}
        />
      )}

      {showTransferGuard && (
        <TransferModal 
          isOpen={!!showTransferGuard}
          guard={guards.find(g => g.id === showTransferGuard)}
          sites={sites}
          guards={guards}
          bankAccounts={bankAccounts}
          onTransfer={handleTransfer}
          onCancel={() => setShowTransferGuard(null)}
        />
      )}
      {/* ── Overtime Shift Modal ── */}
      {overtimeModal && (
        <div className="modal-overlay" onClick={() => setOvertimeModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0 }}>🕐 Log Overtime Shift</h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--clr-muted)', marginTop: 4 }}>
                  Guard: <strong>{overtimeModal.guard.name}</strong>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setOvertimeModal(null)}><X size={18}/></button>
            </div>
            <div style={{ background: 'rgba(255,169,64,0.08)', border: '1px solid rgba(255,169,64,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: '0.8rem', color: '#FFA940' }}>
              ⚠️ This logs an <strong>extra shift</strong> for today. Salary will include an additional 1× daily rate.
            </div>
            <div className="form-group">
              <label className="form-label">Select Overtime Shift *</label>
              <select className="form-input" style={{ color: '#fff' }} value={overtimeShiftId} onChange={e => setOvertimeShiftId(e.target.value)}>
                <option value="" style={{ background: '#1e202d', color: '#fff' }}>— Choose Shift —</option>
                {(overtimeModal.site.shifts || [])
                  .filter(sh => sh.id !== overtimeModal.guard.shift)
                  .map(sh => (
                    <option key={sh.id} value={sh.id} style={{ background: '#1e202d', color: '#fff' }}>{sh.name} ({sh.start_time?.slice(0,5)} – {sh.end_time?.slice(0,5)})</option>
                  ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setOvertimeModal(null)}>Cancel</button>
              <button
                className="btn btn-primary btn-glow"
                style={{ flex: 1, background: 'linear-gradient(135deg, #FFA940, #e8890a)' }}
                onClick={logOvertimeShift}
                disabled={!overtimeShiftId || overtimeLoading}
              >
                {overtimeLoading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/> : '🕐 Log Overtime'}
              </button>
            </div>
          </div>
        </div>
      )}


      {confirmDelete && (
        <ConfirmDeleteModal 
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={executeDelete}
          title={confirmDelete.title}
          entityName={confirmDelete.name}
          loading={isDeleting}
        />
      )}


      {assignModal.open && (
        <AssignGuardModal 
          isOpen={assignModal.open}
          shift={assignModal.shift}
          site={assignModal.site}
          guards={guards}
          onAssign={handleAssignGuard}
          onCancel={() => setAssignModal({ open: false, shift: null, site: null })}
        />
      )}

      {/* ── Bank Statement Modal ── */}
      {statementModal && (
        <StatementModal
          bank={statementModal}
          onClose={() => setStatementModal(null)}
        />
      )}

      {toast && <div className="toast-popup animate-fadeIn">{toast}</div>}

      {/* ── Bill History Modal ── */}
      {viewingHistorySite && (
        <div className="modal-overlay" onClick={() => setViewingHistorySite(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-card animate-fadeIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🧾 Billing History</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginTop: '4px' }}>{viewingHistorySite.name}</div>
              </div>
              <button className="btn-icon" onClick={() => setViewingHistorySite(null)} style={{ transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'rotate(90deg)'} onMouseOut={e => e.currentTarget.style.transform = 'rotate(0deg)'}><X size={20}/></button>
            </div>
            <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {bills.filter(b => b.site === viewingHistorySite.id).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon" style={{ opacity: 0.2 }}><FileText size={40} /></div>
                  <p>No bills found for this site.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bills.filter(b => b.site === viewingHistorySite.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{new Date(2000, b.bill_month - 1).toLocaleString('default', { month: 'long' })} {b.bill_year}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', marginTop: '4px' }}>
                          Sent on {new Date(b.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                          <strong>₹{parseFloat(b.amount).toLocaleString('en-IN')}</strong> total 
                          <span style={{ color: b.remaining > 0 ? '#FFA940' : '#00E5A0', marginLeft: '8px' }}>
                            (₹{parseFloat(b.remaining).toLocaleString('en-IN')} pending)
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '300px' }}>
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--clr-surface-2)' }} onClick={() => setInvoiceSite({ ...viewingHistorySite, _bill: b })}>
                          👁️ View
                        </button>
                        {b.remaining > 0 && (
                          <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }} onClick={() => markBillPaid(b.id)}>
                            ✅ Mark Paid
                          </button>
                        )}
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(255,107,107,0.15)', color: '#FF6B6B' }} onClick={() => deleteBill(b.id)}>
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <InvoiceModal 
        isOpen={!!invoiceSite}
        site={invoiceSite}
        bill={invoiceSite?._bill}
        bankAccount={bankAccounts.find(b => b.account_name === invoiceSite?.bill_account_name)}
        onClose={() => setInvoiceSite(null)}
        onSent={() => { setInvoiceSite(null); showToast('Invoice Sent Successfully!'); fetchSites(); fetchBills(); }}
      />

      <UndoPayoutModal
        isOpen={!!undoingSalary}
        record={undoingSalary}
        onConfirm={() => handleUndoPayout(undoingSalary)}
        onCancel={() => setUndoingSalary(null)}
      />

      {/* ── Receipt Modal ── */}
      {receiptModal && (
        <div className="modal-overlay" onClick={() => setReceiptModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--clr-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'var(--clr-surface-2)' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Transaction Receipt</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn"
                  onClick={async () => {
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: 'Receipt', url: receiptModal });
                      } else {
                        await navigator.clipboard.writeText(receiptModal);
                        showToast('✅ Copied link to clipboard!');
                      }
                    } catch (e) {}
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(124,92,255,0.15)', color: '#7C5CFF' }}>
                  📤 Share
                </button>
                <button className="btn-icon" onClick={() => setReceiptModal(null)}><X size={20}/></button>
              </div>
            </div>
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', minHeight: 400 }}>
              <img src={receiptModal} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UndoPayoutModal({ isOpen, record, onConfirm, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  if (!isOpen || !record) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div className="card glass-card animate-slideUp" style={{ width: '400px', padding: '32px', textAlign: 'center', border: '1px solid rgba(255,107,107,0.3)', background: 'rgba(28, 30, 45, 0.95)', boxShadow: '0 25px 50px -12px rgba(255, 107, 107, 0.25)', position: 'relative' }}>
        <button onClick={onCancel} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={20} /></button>
        
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,107,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <RotateCcw size={28} color="#FF6B6B" />
        </div>
        
        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px', color: '#fff' }}>Undo Payment?</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
          You are about to reverse the last payment of <strong style={{ color: '#FF6B6B' }}>₹{parseFloat(record.last_payment_amount || record.amount_paid).toLocaleString('en-IN')}</strong> made to <strong style={{ color: '#fff' }}>{record.guard_name}</strong>. The funds will be restored to their original bank account.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn" onClick={onCancel} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 700 }}>Cancel</button>
          <button 
            className="btn" 
            onClick={handleConfirm} 
            disabled={isSubmitting}
            style={{ flex: 1, background: 'linear-gradient(135deg, #FF6B6B, #EE5253)', color: '#fff', fontWeight: 800, border: 'none', boxShadow: '0 8px 16px -4px rgba(255,107,107,0.4)' }}
          >
            {isSubmitting ? <div className="spinner" style={{ width: '18px', height: '18px' }} /> : 'Confirm Undo'}
          </button>
        </div>
      </div>
    </div>
  )
}


function StatementModal({ bank, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo  = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)

  const [start, setStart] = useState(weekAgo)
  const [end,   setEnd  ] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState('')

  const setPreset = (label) => {
    const t = new Date()
    if (label === '7d')  { setStart(weekAgo);  setEnd(today) }
    if (label === '30d') { setStart(monthAgo); setEnd(today) }
    if (label === 'tm')  {
      const s = new Date(t.getFullYear(), t.getMonth(), 1).toISOString().slice(0, 10)
      setStart(s); setEnd(today)
    }
    if (label === 'lm')  {
      const s = new Date(t.getFullYear(), t.getMonth() - 1, 1).toISOString().slice(0, 10)
      const e = new Date(t.getFullYear(), t.getMonth(), 0).toISOString().slice(0, 10)
      setStart(s); setEnd(e)
    }
  }

  const handleDownload = async () => {
    if (!start || !end) { setError('Please select a valid date range.'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.get(`/billing/bank-accounts/${bank.id}/transactions/?start_date=${start}&end_date=${end}`)
      const data = res.data
      const txns = data.transactions || []

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()

      const fmtDate = (iso) => {
        if (!iso) return '—'
        const parts = iso.split('T')[0].split('-')
        if (parts.length < 3) return iso
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        return `${parts[2]} ${months[parseInt(parts[1])-1]} ${parts[0]}`
      }
      const fmtTime = (iso) => { if (!iso) return ''; return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) }
      const fmtFullDate = (iso) => {
        if (!iso) return '—'
        const parts = iso.split('T')[0].split('-')
        if (parts.length < 3) return iso
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }

      // ── Calculations ──────────────────────────────────────────────────────
      const totalCredits = txns.filter(t => t.type === 'credit').reduce((s, t) => s + parseFloat(t.amount), 0)
      const totalDebits  = txns.filter(t => t.type === 'debit' ).reduce((s, t) => s + parseFloat(t.amount), 0)
      
      const openingBalance = parseFloat(data.period_opening_balance || 0)
      const closingBalance = txns.length > 0 ? parseFloat(txns[0].running_balance) : openingBalance

      // ── Branding & Header ──────────────────────────────────────────────────
      const drawHeader = (pageNum, totalPages) => {
        // Logo / Title
        doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 60)
        doc.text('STATEMENT OF ACCOUNT', 15, 20)
        
        doc.setFontSize(14); doc.setTextColor(124, 92, 255) // Brand Color
        doc.text('Shriyu Nexus', pageW - 15, 20, { align: 'right' })
        
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 110)
        doc.text('PostGuard Security Management Platform', pageW - 15, 25, { align: 'right' })
        doc.text('www.shriyunexus.com', pageW - 15, 29, { align: 'right' })

        // Account Details Block
        doc.setFontSize(9); doc.setTextColor(60, 60, 70); doc.setFont('helvetica', 'bold')
        doc.text('Account Number:', 15, 40); doc.setFont('helvetica', 'normal'); doc.text(bank.account_no || '—', 45, 40)
        doc.setFont('helvetica', 'bold'); doc.text('Statement Date:', 15, 45); doc.setFont('helvetica', 'normal'); doc.text(fmtFullDate(today), 45, 45)
        doc.setFont('helvetica', 'bold'); doc.text('Period Covered:', 15, 50); doc.setFont('helvetica', 'normal'); doc.text(`${fmtFullDate(start)} to ${fmtFullDate(end)}`, 45, 50)
        
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 60)
        doc.text(bank.account_name.toUpperCase(), 15, 62)
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 110)
        doc.text(bank.bank_name, 15, 67)

        // Summary Statistics (Right Side)
        const summaryX = pageW - 75
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 70)
        doc.text('Opening Balance:', summaryX, 40); doc.setFont('helvetica', 'normal'); doc.text(openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), pageW - 15, 40, { align: 'right' })
        doc.setFont('helvetica', 'bold'); doc.text('Total Credit Amount:', summaryX, 45); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 150, 100); doc.text(totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 }), pageW - 15, 45, { align: 'right' })
        doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 70); doc.text('Total Debit Amount:', summaryX, 50); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 50, 50); doc.text(totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 }), pageW - 15, 50, { align: 'right' })
        doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 70); doc.text('Closing Balance:', summaryX, 55); doc.setFont('helvetica', 'normal'); doc.text(closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }), pageW - 15, 55, { align: 'right' })
        doc.setFont('helvetica', 'bold'); doc.text('Account Type:', summaryX, 64); doc.setFont('helvetica', 'normal'); doc.text('Current Account', pageW - 15, 64, { align: 'right' })
        doc.setFont('helvetica', 'bold'); doc.text('Number of Transactions:', summaryX, 69); doc.setFont('helvetica', 'normal'); doc.text(txns.length.toString(), pageW - 15, 69, { align: 'right' })

        doc.setFontSize(8); doc.setTextColor(150, 150, 160)
        doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 15, 80, { align: 'right' })
        
        // Horizontal Line
        doc.setDrawColor(230, 230, 235); doc.setLineWidth(0.5)
        doc.line(15, 84, pageW - 15, 84)
      }

      // ── Transactions Table ──────────────────────────────────────────────────
      let y = 92
      let pageNum = 1
      // Robust page calculation (avoiding off-by-one errors)
      const rowsPerPage = 15 
      const totalPages  = Math.ceil(txns.length / rowsPerPage) || 1

      drawHeader(pageNum, totalPages)

      // Table Header Row
      doc.setFillColor(245, 246, 250); doc.rect(15, y - 5, pageW - 30, 8, 'F')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 85, 110)
      doc.text('Sr.', 17, y); doc.text('DATE & TIME', 25, y); doc.text('DESCRIPTION', 60, y)
      doc.text('CREDIT', 130, y, { align: 'right' }); doc.text('DEBIT', 160, y, { align: 'right' }); doc.text('BALANCE', 195, y, { align: 'right' })

      txns.forEach((txn, i) => {
        y += 12 // Increased spacing for clear multi-page rendering
        
        // Page Break Logic (Strict threshold)
        if (y > 275) {
          pageNum++
          doc.addPage()
          y = 92
          drawHeader(pageNum, totalPages)
          
          // Repeat Table Header
          doc.setFillColor(245, 246, 250); doc.rect(15, y - 5, pageW - 30, 8, 'F')
          doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 85, 110)
          doc.text('Sr.', 17, y); doc.text('DATE & TIME', 25, y); doc.text('DESCRIPTION', 60, y)
          doc.text('CREDIT', 130, y, { align: 'right' }); doc.text('DEBIT', 160, y, { align: 'right' }); doc.text('BALANCE', 195, y, { align: 'right' })
          y += 12
        }

        // Zebra Striping
        if (i % 2 === 1) { doc.setFillColor(252, 252, 254); doc.rect(15, y - 7, pageW - 30, 12, 'F') }

        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 75, 90)
        
        // Sr No.
        doc.text((i + 1).toString(), 17, y)

        // Date & Time (Stacked)
        doc.text(fmtDate(txn.date), 25, y - 1)
        doc.setFontSize(6.5); doc.setTextColor(150, 150, 160)
        doc.text(fmtTime(txn.timestamp), 25, y + 2.5)
        
        doc.setFontSize(7.5); doc.setTextColor(70, 75, 90)
        const descText = txn.description || '—'
        const desc = descText.length > 38 ? descText.slice(0, 37) + '…' : descText
        doc.text(desc, 60, y)

        if (txn.type === 'credit') {
          doc.setTextColor(0, 120, 80)
          doc.text(parseFloat(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 130, y, { align: 'right' })
          doc.setTextColor(70, 75, 90); doc.text('—', 160, y, { align: 'right' })
        } else {
          doc.setTextColor(70, 75, 90); doc.text('—', 130, y, { align: 'right' })
          doc.setTextColor(180, 40, 40)
          doc.text(parseFloat(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 160, y, { align: 'right' })
        }

        doc.setTextColor(50, 55, 75); doc.setFont('helvetica', 'bold')
        doc.text(parseFloat(txn.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 195, y, { align: 'right' })
        doc.setFont('helvetica', 'normal')
      })

      // End of Transactions Marker (Check for overflowing end marker)
      y += 12
      if (y > 285) { doc.addPage(); y = 30 }
      doc.setFontSize(8); doc.setTextColor(150, 150, 160); doc.setFont('helvetica', 'italic')
      doc.text('--- End of Transactions ---', pageW / 2, y, { align: 'center' })

      // ── Footer ────────────────────────────────────────────────────────────
      const pagesCount = doc.internal.getNumberOfPages()
      for (let p = 1; p <= pagesCount; p++) {
        doc.setPage(p)
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 170)
        doc.text(`© shriyunexus.com | PostGuard | Generated on ${new Date().toLocaleString()}`, pageW / 2, pageH - 10, { align: 'center' })
      }

      doc.save(`Statement_${(bank.account_name || 'Bank').replace(/\s+/g, '_')}_${start}_to_${end}.pdf`)
    } catch (e) {
      setError('Failed to generate statement. Please try again.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const presetStyle = (active) => ({
    padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', border: 'none',
    background: active ? 'rgba(0,229,160,0.2)' : 'rgba(255,255,255,0.06)',
    color: active ? '#00E5A0' : 'rgba(255,255,255,0.6)',
    transition: 'all 0.2s'
  })

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000 }} onClick={onClose}>
      <div className="card glass-card animate-slideUp" style={{ width: '460px', padding: '36px', background: 'rgba(20,22,35,0.97)', border: '1px solid rgba(0,229,160,0.2)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.7)', borderRadius: '20px', position: 'relative' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>

        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(0,229,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>📊</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Bank Statement</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{bank.account_name} · {bank.bank_name}</div>
          </div>
        </div>

        {/* Period shortcuts */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Quick Select Period</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={presetStyle(start === weekAgo && end === today)} onClick={() => setPreset('7d')}>Last 7 Days</button>
            <button style={presetStyle(start === monthAgo && end === today)} onClick={() => setPreset('30d')}>Last 30 Days</button>
            <button style={presetStyle(false)} onClick={() => setPreset('tm')}>This Month</button>
            <button style={presetStyle(false)} onClick={() => setPreset('lm')}>Last Month</button>
          </div>
        </div>

        {/* Custom date inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>From</div>
            <input type="date" value={start} max={end} onChange={e => setStart(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>To</div>
            <input type="date" value={end} min={start} max={today} onChange={e => setEnd(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '0.88rem', outline: 'none' }} />
          </div>
        </div>

        {error && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#FF6B6B', fontSize: '0.82rem', marginBottom: '16px' }}>{error}</div>}

        {/* Download button */}
        <button onClick={handleDownload} disabled={loading}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(0,229,160,0.3)' : 'linear-gradient(135deg, #00E5A0, #00B37A)', color: '#0a1a12', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 20px -4px rgba(0,229,160,0.35)', transition: 'all 0.2s' }}>
          {loading
            ? <><div className="spinner" style={{ width: '18px', height: '18px', borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#0a1a12' }} /> Generating PDF…</>
            : <>📥 Download PDF Statement</>
          }
        </button>

        <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>
          Statements are downloaded directly to your system
        </div>
      </div>
    </div>
  )
}
