import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { 
  LayoutDashboard, Building2, Users, ClipboardList, Key, 
  ShieldCheck, Shield, MapPin, Map, CreditCard, 
  Banknote, TrendingUp, Wallet 
} from 'lucide-react'
import UserProfileModal from './UserProfileModal'

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout, theme, toggleTheme } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const navigate = useNavigate()

  const lordItems = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'agencies', icon: <Building2 size={20} />, label: 'Agencies' },
    { id: 'admins', icon: <Users size={20} />, label: 'Owners' },
    { id: 'requests', icon: <ClipboardList size={20} />, label: 'Join Requests' },
    { id: 'codes', icon: <Key size={20} />, label: 'Invite Codes' },
  ]

  const ownerItems = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'supervisors', icon: <ShieldCheck size={20} />, label: 'Supervisors' },
    { id: 'guards', icon: <Shield size={20} />, label: 'Guards' },
    { id: 'sites', icon: <MapPin size={20} />, label: 'Sites & Locations' },
    { id: 'map', icon: <Map size={20} />, label: 'Live Map' },
    { id: 'payments', icon: <CreditCard size={20} />, label: 'Billing & Payments' },
    { id: 'salary', icon: <Banknote size={20} />, label: 'Salary Manager' },
    { id: 'analysis', icon: <TrendingUp size={20} />, label: 'Analysis' },
    { id: 'wallet', icon: <Wallet size={20} />, label: 'Virtual Wallet' },
  ]

  const adminItems = [
    ...ownerItems.filter(i => !['analysis'].includes(i.id)) // Admins don't see analysis
  ]

  const supervisorItems = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'visits', icon: <MapPin size={20} />, label: 'Site Visits' },
    { id: 'guards', icon: <Shield size={20} />, label: 'Guard Manager' },
    { id: 'wallet', icon: <Wallet size={20} />, label: 'Virtual Wallet' },
  ]

  const items =
    user?.role === 'lord' ? lordItems :
    user?.role === 'owner' ? ownerItems :
    user?.role === 'admin' ? adminItems :
    supervisorItems

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 'inherit' }}>
            <div className="logo-icon">PG</div>
            <span className="logo-text">Post<span style={{ color: 'var(--clr-primary)' }}>Guard</span></span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {items.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active glow-active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer glass-footer" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="user-chip" onClick={() => setIsProfileOpen(true)} style={{ flex: 1, padding: '4px' }}>
              <div className="user-avatar">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="user-info">
                <strong>{user?.name}</strong>
                <small>{user?.role}</small>
              </div>
            </div>
            
            <button className="theme-slider" onClick={toggleTheme} title="Toggle Theme">
              <div className={`slider-thumb ${theme}`}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </div>
            </button>
          </div>
        </div>
      </aside>

      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </>
  )
}
