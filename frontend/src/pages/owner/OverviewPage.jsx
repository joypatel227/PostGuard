import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import { formatCurrency } from '../../utils/helpers';
import { 
  Building, Shield, ShieldCheck, MapPin, Search, Plus, 
  Map as MapIcon, Edit2, Trash2, CheckCircle, AlertTriangle, Wallet, ArrowRight
} from 'lucide-react';
import { FI, FormCard } from '../../components/FormElements';

export default function OverviewPage() {
  const navigate = useNavigate();
  const { 
    stats, sites, guards, supervisors, wallet,
    setShowAddSite, setShowAddGuard, setShowAddSup
  } = useOwnerData();

  // Helper functions for navigation mapping
  const setTab = (tabName) => navigate(`/owner/${tabName}`);
  const setStaffRole = (role) => navigate(`/owner/staff`);

  return (
    <div className="tab-content animate-fadeIn">
      <div className="page-header">
        <h1>Overview</h1>
        <p>Welcome back, here's what's happening today.</p>
      </div>
      
      {/* 4 Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{background: 'rgba(124, 92, 255, 0.15)', color: '#7C5CFF'}}><Building size={24} /></div>
          <div><div className="stat-value">{stats.total_sites || 0}</div><div className="stat-label">Active Sites</div></div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{background: 'rgba(0, 229, 160, 0.15)', color: '#00E5A0'}}><Shield size={24} /></div>
          <div><div className="stat-value">{stats.total_guards || 0}</div><div className="stat-label">Total Guards</div></div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{background: 'rgba(91, 140, 255, 0.15)', color: '#5B8CFF'}}><ShieldCheck size={24} /></div>
          <div><div className="stat-value">{stats.guards_on_duty || 0}</div><div className="stat-label">On Duty Now</div></div>
        </div>
        <div className="stat-card glass-card" style={{ cursor: 'pointer' }} onClick={() => setTab('wallet')}>
          <div className="stat-icon" style={{background: 'rgba(255, 169, 64, 0.15)', color: '#FFA940'}}><Wallet size={24} /></div>
          <div>
            <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              ₹{wallet ? parseInt(wallet.balance) : 0} 
              <ArrowRight size={16} style={{ opacity: 0.5 }} />
            </div>
            <div className="stat-label">Wallet Balance</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <div className="card glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Sites</h3>
            <button className="btn-icon" onClick={() => setTab('sites')} title="View All"><ArrowRight size={18} /></button>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {sites.slice(0, 3).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}><MapPin size={12}/> {s.address}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--clr-primary)' }}>{s.num_securities} Guards</div>
                </div>
              </div>
            ))}
            {sites.length === 0 && <div className="empty-state" style={{ padding: '20px' }}>No sites yet</div>}
          </div>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: '16px' }} onClick={() => setShowAddSite(true)}>+ Add New Site</button>
        </div>

        <div className="card glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Staff Overview</h3>
            <button className="btn-icon" onClick={() => setTab('staff')} title="View All"><ArrowRight size={18} /></button>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(91,140,255,0.05)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={16} color="#5B8CFF"/> Security Guards</div>
              <div style={{ fontWeight: 600 }}>{guards.length}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,229,160,0.05)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={16} color="#00E5A0"/> Supervisors</div>
              <div style={{ fontWeight: 600 }}>{supervisors.length}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddGuard(true)}>+ Add Guard</button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddSup(true)}>+ Add Sup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
