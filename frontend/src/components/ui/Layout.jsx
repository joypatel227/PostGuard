// PageHeader — standardised top section for every tab
export function PageHeader({ title, subtitle, children, style = {} }) {
  return (
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', ...style }}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>{children}</div>}
    </div>
  )
}

// StatCard — metric display card
export function StatCard({ icon, label, value, color = 'var(--clr-primary)', onClick, style = {} }) {
  return (
    <div
      className="stat-card glass-card"
      style={{ padding: '22px', cursor: onClick ? 'pointer' : 'default', ...style }}
      onClick={onClick}
    >
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, marginTop: '4px' }}>{value}</div>
    </div>
  )
}

// EmptyState — placeholder when a list is empty
export function EmptyState({ icon, message, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon" style={{ opacity: 0.2 }}>{icon}</div>}
      <p>{message}</p>
      {action}
    </div>
  )
}
