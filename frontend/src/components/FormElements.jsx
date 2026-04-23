import React, { useRef, useState, useEffect } from 'react';

import { formatCurrency } from '../utils/helpers';

export function WheelColumn({ items, value, onChange }) {
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

export function TimeWheelPicker({ value, onChange }) {
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

export function FI({ label, value, onChange, type = 'text', placeholder = '', options, required = false, span, bankAccounts = [] }) {
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

export function FormCard({ title, onSubmit, onCancel, children, color = 'rgba(124,92,255,0.4)' }) {
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

