// Badge — status indicator pill
export function Badge({ children, variant = 'default', style = {} }) {
  const variants = {
    success:  { background: 'rgba(0,229,160,0.15)',   color: '#00E5A0' },
    danger:   { background: 'rgba(255,107,107,0.15)', color: '#FF6B6B' },
    primary:  { background: 'rgba(91,140,255,0.15)',  color: '#5B8CFF' },
    warning:  { background: 'rgba(255,169,64,0.15)',  color: '#FFA940' },
    purple:   { background: 'rgba(124,92,255,0.15)',  color: '#7C5CFF' },
    default:  { background: 'rgba(255,255,255,0.06)', color: 'var(--clr-muted)' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      ...variants[variant],
      ...style,
    }}>
      {children}
    </span>
  )
}

// StatusDot — coloured dot + label
export function StatusDot({ color, label, size = 6 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontSize: '0.72rem', color, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
    </span>
  )
}
