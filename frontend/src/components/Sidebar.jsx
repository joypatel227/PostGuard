import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { 
  LayoutDashboard, Building2, Users, Key, ClipboardList,
  ShieldCheck, Shield, MapPin, Map, CreditCard, 
  Banknote, TrendingUp, Wallet, Landmark, ChevronRight,
  Send, User
} from 'lucide-react'
import UserProfileModal from './UserProfileModal'

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout, theme, toggleTheme } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const navigate = useNavigate()

  const handleTabChange = (tabId) => {
    const role = user?.role || 'owner'
    navigate(`/${role}/${tabId}`)
    if (onTabChange) onTabChange(tabId)
  }

  const lordItems = [
    { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'agencies', icon: <Building2 size={20} />, label: 'Agencies' },
    { id: 'admins',   icon: <Users size={20} />,     label: 'Owners' },
    { id: 'codes',    icon: <Key size={20} />,        label: 'Invite Codes' },
  ]

  const ownerItems = [
    { id: 'overview',     icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'analysis',     icon: <TrendingUp size={20} />,      label: 'Analysis' },
    { id: 'wallet',       icon: <Wallet size={20} />,          label: 'Virtual Wallet' },
    { id: 'bank',         icon: <Landmark size={20} />,        label: 'Bank Accounts' },
    { id: 'staff',        icon: <Users size={20} />,           label: 'Staff' },
    { id: 'attendance',   icon: <ShieldCheck size={20} />,     label: 'Attendance' },
    { id: 'payments',     icon: <CreditCard size={20} />,      label: 'Billing & Payments' },
    { id: 'salary',       icon: <Banknote size={20} />,        label: 'Salary Manager' },
    { id: 'map',          icon: <Map size={20} />,             label: 'Live Map' },
    { id: 'sites',        icon: <MapPin size={20} />,          label: 'Sites & Locations' },
    { id: 'assignments',  icon: <ClipboardList size={20} />,   label: 'Guard Assignments' },
    { id: 'joinrequests', icon: <Key size={20} />,             label: 'Join Requests' },
    { id: 'invites',      icon: <Key size={20} />,             label: 'Invite Codes' },
  ]

  const adminItems = [
    ...ownerItems.filter(i => !['analysis'].includes(i.id))
  ]

  const supervisorItems = [
    { id: 'overview',   icon: <LayoutDashboard size={20} />, label: 'Overview' },
    { id: 'attendance', icon: <ShieldCheck size={20} />,     label: 'Attendance' },
    { id: 'guards',     icon: <Shield size={20} />,          label: 'Guard Manager' },
    { id: 'visits',     icon: <MapPin size={20} />,          label: 'Site Visits' },
    { id: 'wallet',     icon: <Wallet size={20} />,          label: 'Virtual Wallet' },
  ]

  const clientItems = [
    { id: 'overview', icon: <LayoutDashboard size={20}/>, label: 'Overview'     },
    { id: 'invoices', icon: <CreditCard size={20}/>,      label: 'Invoices'     },
    { id: 'payments', icon: <Send size={20}/>,            label: 'Payments'     },
    { id: 'guards',   icon: <Shield size={20}/>,          label: 'Guard Roster' },
    { id: 'profile',  icon: <User size={20}/>,            label: 'Profile'      },
  ]

  const items =
    user?.role === 'lord' ? lordItems :
    user?.role === 'owner' ? ownerItems :
    user?.role === 'admin' ? adminItems :
    user?.role === 'client' ? clientItems :
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
              onClick={() => handleTabChange(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className="nav-chevron"><ChevronRight size={16} /></span>
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
