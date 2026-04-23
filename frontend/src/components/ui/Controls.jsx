// TabPills — toggle button group (e.g. Daily / Monthly)
export function TabPills({ options, value, onChange, style = {} }) {
  return (
    <div style={{
      display: 'flex', gap: '4px',
      background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '12px',
      ...style
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
            background: value === opt.value ? 'var(--clr-primary)' : 'transparent',
            color: value === opt.value ? '#fff' : 'var(--clr-muted)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// SearchInput — search field with icon
export function SearchInput({ value, onChange, placeholder = 'Search...', style = {} }) {
  return (
    <div className="search-input-wrap" style={style}>
      <svg className="search-icon" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

// Spinner — loading indicator
export function Spinner({ size = 24, style = {} }) {
  return (
    <div className="spinner" style={{ width: size, height: size, borderWidth: size / 8, ...style }} />
  )
}

// Modal — generic overlay modal
export function Modal({ isOpen, onClose, children, maxWidth = 520 }) {
  if (!isOpen) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth, animation: 'fadeIn 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
