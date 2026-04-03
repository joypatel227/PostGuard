import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../components/AuthContext'

export default function SupervisorDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState(() => sessionStorage.getItem('supervisor_active_tab') || 'overview')
  
  useEffect(() => {
    sessionStorage.setItem('supervisor_active_tab', tab)
  }, [tab])

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={tab} onTabChange={setTab} />
      <main className="main-content">
        <div className="page-header">
          <h1>🧑‍💼 Supervisor Dashboard</h1>
          <p>Welcome, {user?.name}. Your workspace is ready.</p>
        </div>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">—</div>
            <div className="stat-label">Assigned Posts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">—</div>
            <div className="stat-label">Guards on Duty</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">—</div>
            <div className="stat-label">Attendance Today</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Your Account</div>
              <div className="card-sub">Supervisor profile details</div>
            </div>
          </div>
          <table>
            <tbody>
              <tr><td style={{ color: 'var(--clr-muted)', width: 120 }}>Name</td><td><strong>{user?.name}</strong></td></tr>
              <tr><td style={{ color: 'var(--clr-muted)' }}>Email</td><td>{user?.email}</td></tr>
              <tr><td style={{ color: 'var(--clr-muted)' }}>Phone</td><td>{user?.phone}</td></tr>
              <tr><td style={{ color: 'var(--clr-muted)' }}>Role</td><td><span className="badge badge-supervisor">Supervisor</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="card" style={{ border: '1px dashed rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.04)' }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚧</div>
            <div className="card-title">Attendance & Assignments coming soon</div>
            <div className="card-sub" style={{ marginTop: 4 }}>This module is under development</div>
          </div>
        </div>
      </main>
    </div>
  )
}
