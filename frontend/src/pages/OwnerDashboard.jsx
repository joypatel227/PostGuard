import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import api from '../services/api'
import { useAuth } from '../components/AuthContext'

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState(() => sessionStorage.getItem('owner_active_tab') || 'overview')
  const [toast, setToast] = useState('')

  useEffect(() => {
    sessionStorage.setItem('owner_active_tab', tab)
  }, [tab])

  const showToast = (msg) => {
    setToast('')
    setTimeout(() => setToast(msg), 10)
    setTimeout(() => setToast(''), 3000)
  }

  // Generic data fetching placeholders
  const [sites, setSites] = useState([])
  const [guards, setGuards] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    // Basic data fetches
    api.get('/company/sites/').then(r => setSites(r.data)).catch(() => {})
    api.get('/company/guards/').then(r => setGuards(r.data)).catch(() => {})
    api.get('/auth/my-users/').then(r => setSupervisors(r.data)).catch(() => {})
    api.get('/wallet/my/').then(r => setWallet(r.data)).catch(() => {})
  }, [])

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={tab} onTabChange={setTab} />
      <main className="main-content">
        {tab === 'overview' && (
          <>
            <div className="page-header">
              <h1>👋 Welcome, {user?.name}</h1>
              <p>Agency Owner Dashboard</p>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{sites.length}</div>
                <div className="stat-label">Total Sites</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{guards.length}</div>
                <div className="stat-label">Total Guards</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{supervisors.length}</div>
                <div className="stat-label">Supervisors</div>
              </div>
            </div>
          </>
        )}

        {tab === 'sites' && (
          <div className="page-header">
            <h1>🏢 Sites & Locations</h1>
            <p>Manage your client sites</p>
            {/* Site management table will go here */}
          </div>
        )}

        {tab === 'supervisors' && (
          <div className="page-header">
            <h1>👔 Supervisors</h1>
            <p>Manage your field supervisors</p>
          </div>
        )}

        {tab === 'guards' && (
          <div className="page-header">
            <h1>🛡️ Guards</h1>
            <p>Full list of security personnel</p>
          </div>
        )}

        {tab === 'map' && (
          <div className="page-header">
            <h1>🗺️ Live Map</h1>
            <p>Track your supervisors in real-time</p>
          </div>
        )}

        {tab === 'payments' && (
          <div className="page-header">
            <h1>💳 Billing & Payments</h1>
            <p>Client bills and received payments</p>
          </div>
        )}

        {tab === 'salary' && (
          <div className="page-header">
            <h1>💰 Salary Manager</h1>
            <p>Calculate and pay guard salaries</p>
          </div>
        )}

        {tab === 'wallet' && (
          <div className="page-header">
            <h1>💼 Virtual Wallet</h1>
            <p>Your agency business wallet: ₹{wallet?.balance || 0}</p>
          </div>
        )}

        {tab === 'analysis' && (
          <div className="page-header">
            <h1>📈 Business Analysis</h1>
            <p>Financial and operational charts</p>
          </div>
        )}
      </main>

      {toast && <div className="toast-popup">{toast}</div>}
    </div>
  )
}
