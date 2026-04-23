import React, { useState, useEffect } from 'react'

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title, entityName, loading }) {
  const [typedName, setTypedName] = useState('')

  useEffect(() => {
    if (isOpen) setTypedName('')
  }, [isOpen])

  if (!isOpen) return null

  const isMatched = typedName === entityName

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--clr-surface-1)', border: '1px solid var(--clr-danger)', padding: '28px', borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        
        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--clr-danger)', marginBottom: '12px' }}>⚠️ {title}</div>
        
        <p style={{ color: 'var(--clr-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          This action is <strong>permanent</strong> and cannot be undone. All associated data will be deleted.<br /><br />
          To confirm, please type exactly: <br />
          <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', marginTop: '8px', display: 'inline-block' }}>{entityName}</span>
        </p>

        <input 
          type="text" 
          className="form-input" 
          placeholder="Type name here..." 
          value={typedName} 
          onChange={e => setTypedName(e.target.value)}
          autoFocus
          style={{ marginBottom: '24px', textAlign: 'center', borderColor: isMatched ? 'var(--clr-success)' : 'var(--clr-danger)', background: 'rgba(0,0,0,0.2)' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button className="btn" onClick={onClose} disabled={loading} style={{ background: 'var(--clr-surface-2)' }}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={onConfirm} 
            disabled={!isMatched || loading} 
            style={{ background: isMatched ? 'var(--clr-danger)' : 'var(--clr-surface-2)', border: 'none', color: isMatched ? '#fff' : 'var(--clr-muted)' }}
          >
            {loading ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>
  )
}
