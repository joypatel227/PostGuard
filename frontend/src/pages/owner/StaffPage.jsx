import React, { useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import api from '../../services/api';
import { format12h } from '../../utils/helpers';
import { FI, FormCard } from '../../components/FormElements';
import { 
  Users, Search, Plus, Shield, ShieldCheck, UserCheck, CheckCircle, AlertTriangle, 
  Trash2, FileText, Download, Mail, Lock, Unlock, Phone, History, 
  MapPin, Calendar, Edit2, ShieldAlert, X
} from 'lucide-react';

function EditGuardForm({ guard, sites, onSave, onCancel, guards, bankAccounts = [] }) {
  const [f, setF] = useState(guard)
  const compactFI = { marginBottom: '12px' }
  const compactLabel = { marginBottom: '6px' }

  return (
    <FormCard title={`✏️ Edit Guard — ${f.name}`} 
      onSubmit={e => { e.preventDefault(); onSave(f) }} 
      onCancel={onCancel} 
      color="rgba(124,92,255,0.6)">
      <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <FI label="Guard Name" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required bankAccounts={bankAccounts} />
        <FI label="Phone" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} required bankAccounts={bankAccounts} />
        <FI label="Salary (₹)" value={f.monthly_salary} onChange={e => setF(p => ({ ...p, monthly_salary: e.target.value }))} type="number" bankAccounts={bankAccounts} />
        <FI label="Type" value={f.guard_type} onChange={e => setF(p => ({ ...p, guard_type: e.target.value }))} options={[{ v: 'regular', l: '👤 Regular' }, { v: 'temporary', l: '⏳ Temp' }]} bankAccounts={bankAccounts} />
        
        <div style={{ gridColumn: '1/-1', marginTop: '4px', padding: '10px 14px', background: 'rgba(124,92,255,0.04)', borderRadius: '12px', border: '1px solid rgba(124,92,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem' }}>🏦</span>
            <h4 style={{ margin: 0, fontSize: '0.78rem', color: '#7C5CFF', fontWeight: 700 }}>Bank Details</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <FI label="Bank Name" value={f.bank_name || ''} onChange={e => setF(p => ({ ...p, bank_name: e.target.value }))} placeholder="HDFC" bankAccounts={bankAccounts} />
            <FI label="Acc No" value={f.account_no || ''} onChange={e => setF(p => ({ ...p, account_no: e.target.value }))} placeholder="50100..." bankAccounts={bankAccounts} />
            <FI label="IFSC" value={f.ifsc_code || ''} onChange={e => setF(p => ({ ...p, ifsc_code: e.target.value }))} placeholder="HDFC0..." bankAccounts={bankAccounts} />
            <FI label="UPI (Opt)" value={f.upi_id || ''} onChange={e => setF(p => ({ ...p, upi_id: e.target.value }))} placeholder="name@upi" bankAccounts={bankAccounts} />
          </div>
        </div>

        <FI label="Residential Address" value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} span bankAccounts={bankAccounts} placeholder="Full address..." />
      </div>
    </FormCard>
  )
}

export default function StaffPage() {
  const { user } = useAuth();
  const { 
    stats, sites, guards, supervisors, admins, bankAccounts,
    fetchGuards, fetchSups, fetchAdmins, fetchStats,
    setConfirmDelete, showToast,
    showAddAdmin, setShowAddAdmin, showAddSup, setShowAddSup, showAddGuard, setShowAddGuard
  } = useOwnerData();

  const [search, setSearch] = useState('');
  const [staffRole, setStaffRole] = useState('all');
  const [guardAttendanceFilter, setGuardAttendanceFilter] = useState('all');
  const staffRoleFilter = staffRole;
  const setStaffRoleFilter = setStaffRole;
  
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [supForm, setSupForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [guardForm, setGuardForm] = useState({ name: '', phone: '', address: '', monthly_salary: 0, advance_paid: 0, guard_type: 'regular', site: '', shift: '' });
  const [editGuardData, setEditGuardData] = useState(null);
  const setEditingStaff = setEditGuardData;

  const closeStaffForms = () => {
    setShowAddAdmin(false);
    setShowAddSup(false);
    setShowAddGuard(false);
    setEditGuardData(null);
  };

  const siteOpts = [{ v: '', l: '— Unassigned —' }, ...sites.map(s => ({ v: s.id, l: s.name }))];
  const guardTypeOpts = [{ v: 'regular', l: 'Regular' }, { v: 'temporary', l: 'Temporary' }];

    const createAdmin = async (e) => {  
      e.preventDefault()  
      const phoneRegex = /^(\d{10}|\+\d{8,15})$/  
      if (!phoneRegex.test(adminForm.phone.replace(/[\s-]/g, ''))) {  
        showToast('❌ Invalid phone. Use 10 digits or +CountryCode')  
        return  
      }  
      try {  
        await api.post('/auth/create-agency-user/', { ...adminForm, role: 'admin' })  
        showToast('✅ Admin created!')  
        setShowAddAdmin(false); setAdminForm({ name: '', email: '', phone: '', password: '' })  
        fetchAdmins(); fetchStats()  
      } catch (err) { showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) }  
    }  
    const createSup = async (e) => {  
      e.preventDefault()  
      const phoneRegex = /^(\d{10}|\+\d{8,15})$/  
      if (!phoneRegex.test(supForm.phone.replace(/[\s-]/g, ''))) {  
        showToast('❌ Invalid phone. Use 10 digits or +CountryCode')  
        return  
      }  
      try {  
        await api.post('/auth/create-agency-user/', { ...supForm, role: 'supervisor' })  
        showToast('✅ Supervisor created!')  
        setShowAddSup(false); setSupForm({ name: '', email: '', phone: '', password: '' })  
        fetchSups(); fetchStats()  
      } catch (err) { showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) }  
    }  
    const createGuard = async (e) => {  
      e.preventDefault()  
      const phoneRegex = /^(\d{10}|\+\d{8,15})$/  
      if (!phoneRegex.test(guardForm.phone.replace(/[\s-]/g, ''))) {  
        showToast('❌ Invalid phone. Use 10 digits or +CountryCode')  
        return  
      }  
      try {  
        await api.post('/company/guards/', guardForm)  
        showToast('✅ Guard added!')  
        setShowAddGuard(false); setGuardForm({ name: '', phone: '', address: '', monthly_salary: 0, advance_paid: 0, guard_type: 'regular', site: '', shift: '' })  
        fetchGuards(); fetchStats()  
      } catch (err) {  
        const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Failed'  
        showToast(`❌ ${msg}`)  
      }  
    }  
    const saveGuard = async (formData) => {  
      const phoneRegex = /^(\d{10}|\+\d{8,15})$/  
      if (!phoneRegex.test(formData.phone.replace(/[\s-]/g, ''))) {  
        showToast('❌ Invalid phone. Use 10 digits or +CountryCode')  
        return  
      }  
      try {  
        await api.patch(`/company/guards/${formData.id}/`, formData)  
        showToast('✅ Guard updated!')  
        setEditGuardData(null); fetchGuards()  
      } catch (err) {  
        const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Failed'  
        showToast(`❌ ${msg}`)  
      }  
    }  
  const toggleStaffStatus = async (s) => {}; // Placeholder for now

  const matchesSearch = (item) => 
    (item.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (item.email || '').toLowerCase().includes(search.toLowerCase()) || 
    (item.phone || '').includes(search);

  const fAdmins = (admins || []).filter(matchesSearch);
  const fSups = (supervisors || []).filter(matchesSearch);
  const fGuards = (guards || []).filter(g => {
    if (!matchesSearch(g)) return false;
    if (guardAttendanceFilter === 'all') return true;
    const isAbsent = g.today_attendance?.status === 'absent';
    return guardAttendanceFilter === 'present' ? !isAbsent : isAbsent;
  });

  const allStaffCombined = [
    ...fAdmins.map(x => ({ ...x, internal_role: 'admin' })),
    ...fSups.map(x => ({ ...x, internal_role: 'supervisor' })),
    ...fGuards.map(x => ({ ...x, internal_role: 'guard' }))
  ].sort((a,b) => (a.name || '').localeCompare(b.name || ''));

  const av = (name, size = 36) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );

  const roleLabel = (r) => {
    if (r === 'admin') return <span style={{ padding: '4px 10px', background: 'rgba(255,169,64,0.1)', color: '#FFA940', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>Administrator</span>;
    if (r === 'supervisor') return <span style={{ padding: '4px 10px', background: 'rgba(0,229,160,0.1)', color: '#00E5A0', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>Supervisor</span>;
    return <span style={{ padding: '4px 10px', background: 'rgba(91,140,255,0.1)', color: '#5B8CFF', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>Guard</span>;
  };

    return (
            <div className="tab-content animate-fadeIn" style={{ position: 'relative' }}>  
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>  
                <div style={{ flex: 1, minWidth: '200px' }}>  
                  <h1>👥 Staff Management</h1>  
                  <p>Manage admins, supervisors, and guards</p>  
                </div>  
    
                <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', margin: '0 auto' }}>  
                  <Search size={16} className="search-icon" />  
                  <input type="text" placeholder="Search staff..." className="search-input" value={search} onChange={e => setSearch(e.target.value)} />  
                </div>  
    
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>  
                  <div style={{ display: 'flex', gap: '12px', background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '12px' }}>  
                    <button   
                      className={`pill-btn ${staffRole === 'all' ? 'active' : ''}`}   
                      onClick={() => { setStaffRole('all'); setSearch(''); closeStaffForms(); }}  
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'all' ? 'var(--clr-primary)' : 'transparent', color: staffRole === 'all' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}  
                    >All</button>  
                    {user?.role === 'owner' && (  
                      <button   
                        className={`pill-btn ${staffRole === 'admins' ? 'active' : ''}`}   
                        onClick={() => { setStaffRole('admins'); setSearch(''); closeStaffForms(); }}  
                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'admins' ? 'rgba(124,92,255,0.15)' : 'transparent', color: staffRole === 'admins' ? '#7C5CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}  
                      >Admins</button>  
                    )}  
                    <button   
                      className={`pill-btn ${staffRole === 'supervisors' ? 'active' : ''}`}   
                      onClick={() => { setStaffRole('supervisors'); setSearch(''); closeStaffForms(); }}  
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'supervisors' ? 'rgba(0,229,160,0.15)' : 'transparent', color: staffRole === 'supervisors' ? '#00E5A0' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}  
                    >Sups</button>  
                    <button   
                      className={`pill-btn ${staffRole === 'guards' ? 'active' : ''}`}   
                      onClick={() => { setStaffRole('guards'); setSearch(''); setGuardAttendanceFilter('all'); closeStaffForms(); }}  
                      style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: staffRole === 'guards' ? 'rgba(91,140,255,0.15)' : 'transparent', color: staffRole === 'guards' ? '#5B8CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}  
                    >Guards</button>  
                  </div>  
    
                  {staffRole === 'admins' && user?.role === 'owner' && (  
                    <button className="btn btn-primary btn-glow" onClick={() => { setAdminForm({ name: '', email: '', phone: '', password: '' }); setShowAddAdmin(true); }}>  
                      <Plus size={16} />  
                    </button>  
                  )}  
                  {staffRole === 'supervisors' && (  
                    <button className="btn btn-primary btn-glow" onClick={() => { setSupForm({ name: '', email: '', phone: '', password: '' }); setShowAddSup(true); }}>  
                      <Plus size={16} />  
                    </button>  
                  )}  
                  {staffRole === 'guards' && (  
                    <button className="btn btn-primary btn-glow" onClick={() => { setGuardForm({ name: '', phone: '', address: '', monthly_salary: 0, advance_paid: 0, guard_type: 'regular', site: '', shift: '' }); setShowAddGuard(true); }}>  
                      <Plus size={16} />  
                    </button>  
                  )}  
                </div>  
              </div>  
    
                    {staffRole === 'guards' && (  
                      <div className="animate-fadeIn" style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>  
                        {[  
                          { id: 'all', l: 'All', c: 'var(--clr-muted)' },  
                          { id: 'present', l: '✅ Present', c: '#00E5A0' },
                          { id: 'absent', l: '🔴 Absent', c: '#FF6B6B' },
                        ].map(f => (
                          <button
                            key={f.id}
                            onClick={() => setGuardAttendanceFilter(f.id)}
                            style={{ 
                              padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                              background: guardAttendanceFilter === f.id ? (f.id === 'all' ? 'var(--clr-surface-3)' : `${f.c}1c`) : 'transparent',
                              color: guardAttendanceFilter === f.id ? (f.id === 'all' ? '#fff' : f.c) : 'var(--clr-muted)',
                              border: guardAttendanceFilter === f.id ? `1px solid ${f.c}33` : '1px solid transparent'
                            }}
                          >
                            {f.l}
                          </button>
                        ))}  
                      </div>  
                    )}  
                    
    
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: 'var(--clr-surface-2)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>  
                <button   
                  className={`pill-btn ${staffRole === 'all' ? 'active' : ''}`}   
                  onClick={() => { setStaffRole('all'); setSearch(''); closeStaffForms(); }}  
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'all' ? 'var(--clr-primary)' : 'transparent', color: staffRole === 'all' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}  
                >All Staff</button>  
                {user?.role === 'owner' && (  
                  <button   
                    className={`pill-btn ${staffRole === 'admins' ? 'active' : ''}`}   
                    onClick={() => { setStaffRole('admins'); setSearch(''); closeStaffForms(); }}  
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'admins' ? 'rgba(124,92,255,0.15)' : 'transparent', color: staffRole === 'admins' ? '#7C5CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}  
                  >Admins</button>  
                )}  
                <button   
                  className={`pill-btn ${staffRole === 'supervisors' ? 'active' : ''}`}   
                  onClick={() => { setStaffRole('supervisors'); setSearch(''); closeStaffForms(); }}  
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'supervisors' ? 'rgba(0,229,160,0.15)' : 'transparent', color: staffRole === 'supervisors' ? '#00E5A0' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}  
                >Supervisors</button>  
                <button   
                  className={`pill-btn ${staffRole === 'guards' ? 'active' : ''}`}   
                  onClick={() => { setStaffRole('guards'); setSearch(''); setGuardAttendanceFilter('all'); closeStaffForms(); }}  
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: staffRole === 'guards' ? 'rgba(91,140,255,0.15)' : 'transparent', color: staffRole === 'guards' ? '#5B8CFF' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}  
                >Guards</button>  
              </div>  
    
    
    
              {(showAddAdmin || showAddSup || showAddGuard || editGuardData) && (  
                <div style={{   
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,   
                  zIndex: 999, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)',  
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'   
                }} onClick={closeStaffForms}>  
                  <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px' }}>  
                    {showAddAdmin && (  
                      <FormCard title="➕ Create New Admin" onSubmit={createAdmin} onCancel={() => setShowAddAdmin(false)}>  
                        <FI label="Full Name" value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} placeholder="Priya Sharma" required />  
                        <FI label="Email" value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="priya@example.com" required />  
                        <FI label="Phone" value={adminForm.phone} onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" />  
                        <FI label="Password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Min 8 chars" required />  
                      </FormCard>  
                    )}  
                    {showAddSup && (  
                      <FormCard title="➕ Create New Supervisor" onSubmit={createSup} onCancel={() => setShowAddSup(false)}>  
                        <FI label="Full Name" value={supForm.name} onChange={e => setSupForm(p => ({ ...p, name: e.target.value }))} placeholder="Rahul Sharma" required />  
                        <FI label="Email" value={supForm.email} onChange={e => setSupForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="rahul@example.com" required />  
                        <FI label="Phone" value={supForm.phone} onChange={e => setSupForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" />  
                        <FI label="Password" value={supForm.password} onChange={e => setSupForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Min 8 chars" required />  
                      </FormCard>  
                    )}  
                    {showAddGuard && (  
                      <FormCard title="➕ Add New Guard" onSubmit={createGuard} onCancel={() => setShowAddGuard(false)}>  
                        <FI label="Full Name" value={guardForm.name} onChange={e => setGuardForm(p => ({ ...p, name: e.target.value }))} placeholder="Ravi Kumar" required />  
                        <FI label="Phone" value={guardForm.phone} onChange={e => setGuardForm(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" required />  
                        <FI label="Monthly Salary (₹)" value={guardForm.monthly_salary} onChange={e => setGuardForm(p => ({ ...p, monthly_salary: e.target.value }))} type="number" placeholder="10000" />  
                        <FI label="Advance Paid (₹)" value={guardForm.advance_paid || 0} onChange={e => setGuardForm(p => ({ ...p, advance_paid: e.target.value }))} type="number" placeholder="2000" />  
                        <FI label="Guard Type" value={guardForm.guard_type} onChange={e => setGuardForm(p => ({ ...p, guard_type: e.target.value }))} options={guardTypeOpts} />  
                        <FI label="Assign Site" value={guardForm.site} onChange={e => setGuardForm(p => ({ ...p, site: e.target.value, shift: '' }))} options={siteOpts} />  
                        <FI   
                          label="Select Shift"   
                          value={guardForm.shift}   
                          onChange={e => setGuardForm(p => ({ ...p, shift: e.target.value }))}   
                          options={[  
                            { v: '', l: '— Select Shift —' },  
                            ...(sites.find(s => s.id === parseInt(guardForm.site))?.shifts || []).map(s => {  
                              const site = sites.find(st => st.id === parseInt(guardForm.site))  
                              const currGuards = guards.filter(g => g.site === site.id && g.shift === s.id).length  
                              const isFull = currGuards >= (site.num_securities || 0)  
                              return { v: String(s.id), l: `${s.name} (${format12h(s.start_time)} – ${format12h(s.end_time)})${isFull ? ' ⚠ FULL' : ''}`, disabled: isFull }  
                            })  
                          ]}   
                          disabled={!guardForm.site}  
                        />  
                        <FI label="Address" value={guardForm.address} onChange={e => setGuardForm(p => ({ ...p, address: e.target.value }))} placeholder="City, Area" />  
                      </FormCard>  
                    )}  
                    {editGuardData && (  
                      <div className="card glass-card" style={{ padding: '28px', border: '1px solid rgba(124,92,255,0.4)', position: 'relative' }}>  
                        <button className="btn-icon" onClick={() => setEditGuardData(null)} style={{ position: 'absolute', top: '15px', right: '15px' }}><X size={20}/></button>  
                        <EditGuardForm guard={editGuardData} sites={sites} guards={guards} bankAccounts={bankAccounts} onSave={saveGuard} onCancel={() => setEditGuardData(null)} />  
                      </div>  
                    )}  
                  </div>  
                </div>  
              )}  
    
              <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>  
                <div className="table-wrap">  
                  {staffRole === 'all' ? (  
                    allStaffCombined.length === 0 ? (  
                      <div className="empty-state">  
                        <div className="empty-icon" style={{ opacity: 0.2 }}><Users size={60} /></div>  
                        <p>No staff members found matching your search.</p>  
                      </div>  
                    ) : (  
                      <table>  
                        <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>STAFF MEMBER</th><th>CONTACT</th><th>ROLE / INFO</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th></tr></thead>  
                        <tbody>  
                          {allStaffCombined.map(s => {  
                            const isGuard = s.internal_role === 'guard';  
                            const isSup = s.internal_role === 'supervisor';  
                            const roleColor = isGuard ? '#5B8CFF' : (isSup ? '#00E5A0' : '#7C5CFF');  
                            const site = isGuard ? sites.find(st => st.id === s.site) : null;  
                            return (  
                              <tr key={`${s.internal_role}-${s.id}`} className="table-row-hover">  
                                <td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(s.name)}<div><strong>{s.name}</strong><div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}><span className="badge" style={{ background: `${roleColor}1a`, color: roleColor, fontSize: '0.65rem' }}>{s.internal_role.toUpperCase()}</span></div></div></div></td>  
                                <td><div style={{ fontSize: '0.85rem' }}>{s.email || '—'}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{s.phone}</div></td>  
                                <td>{isGuard ? (<div style={{ fontSize: '0.85rem' }}>{site?.name || <span style={{ opacity: 0.5 }}>— Unassigned</span>}{s.shift_name && <div style={{ fontSize: '0.73rem', color: '#7C5CFF' }}>{s.shift_name}</div>}</div>) : (<div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>Joined {new Date(s.date_joined).toLocaleDateString()}</div>)}</td>  
                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>  
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>  
                                    {isGuard && <button className="btn-icon" title="Edit" onClick={() => setEditGuardData(s)}>✏️</button>}  
                                    <button className="btn-icon" title="Remove" onClick={() => setConfirmDelete({ id: s.id, name: s.name, type: s.internal_role, title: `Delete ${s.internal_role}` })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button>  
                                  </div>  
                                </td>  
                              </tr>  
                            );  
                          })}  
                        </tbody>  
                      </table>  
                    )  
                  ) : staffRole === 'admins' ? (  
                    fAdmins.length === 0 ? <div className="empty-state"><Users size={60} style={{ opacity: 0.2 }} /><p>No admins found.</p></div> :  
                    <table>  
                      <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>ADMIN</th><th>CONTACT</th><th>JOINED</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th></tr></thead>  
                      <tbody>{fAdmins.map(a => (<tr key={a.id} className="table-row-hover"><td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(a.name)}<div><strong>{a.name}</strong><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>Admin</div></div></div></td><td><div style={{ fontSize: '0.85rem' }}>{a.email}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{a.phone}</div></td><td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>{new Date(a.date_joined).toLocaleDateString()}</td><td style={{ textAlign: 'right', paddingRight: '24px' }}><button className="btn-icon" onClick={() => setConfirmDelete({ id: a.id, name: a.name, type: 'admin', title: 'Delete Admin' })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button></td></tr>))}</tbody>  
                    </table>  
                  ) : staffRole === 'supervisors' ? (  
                    fSups.length === 0 ? <div className="empty-state"><ShieldCheck size={60} style={{ opacity: 0.2 }} /><p>No supervisors found.</p></div> :  
                    <table>  
                      <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>SUPERVISOR</th><th>CONTACT</th><th>JOINED</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th></tr></thead>  
                      <tbody>{fSups.map(s => (<tr key={s.id} className="table-row-hover"><td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(s.name)}<div><strong>{s.name}</strong><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>Supervisor</div></div></div></td><td><div style={{ fontSize: '0.85rem' }}>{s.email}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{s.phone}</div></td><td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>{new Date(s.date_joined).toLocaleDateString()}</td><td style={{ textAlign: 'right', paddingRight: '24px' }}><button className="btn-icon" onClick={() => setConfirmDelete({ id: s.id, name: s.name, type: 'supervisor', title: 'Delete Supervisor' })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button></td></tr>))}</tbody>  
                    </table>  
                  ) : (  
                    fGuards.length === 0 ? <div className="empty-state"><Shield size={60} style={{ opacity: 0.2 }} /><p>No guards found.</p></div> :  
                    <table>  
                      <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>GUARD</th><th>SITE / STATUS</th><th>TYPE</th><th>SALARY</th><th>ATTENDANCE</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>MANAGE</th></tr></thead>  
                      <tbody>  
                        {fGuards.map(g => {  
                          const site = sites.find(s => s.id === g.site);  
                          return (  
                            <tr key={g.id} className="table-row-hover">  
                              <td style={{ padding: '14px 24px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>{av(g.name)}<div><strong>{g.name}</strong><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{g.phone}</div></div></div></td>  
                              <td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{site?.name || '— Unassigned'}</div>{g.shift_name && <div style={{ fontSize: '0.73rem', color: '#7C5CFF' }}>{g.shift_name}</div>}</td>  
                              <td><span className="badge" style={{ background: g.guard_type === 'regular' ? 'rgba(91,140,255,0.15)' : 'rgba(255,169,64,0.15)', color: g.guard_type === 'regular' ? '#5B8CFF' : '#FFA940' }}>{g.guard_type}</span></td>  
                              <td style={{ fontWeight: 600 }}>₹{parseInt(g.monthly_salary || 0)}</td>  
                              <td>  
                                {g.site && g.shift ? (  
                                  g.today_attendance?.status === 'absent' ? (  
                                    <button onClick={async () => { try { if (g.today_attendance?.id) { await api.patch(`/company/attendance/${g.today_attendance.id}/`, { status: 'present' }) } fetchGuards(); showToast(`✅ ${g.name} restored to Present`) } catch { showToast('❌ Failed') } }} style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#00E5A0', fontWeight: 600, fontSize: '0.8rem' }}>✅ Restore</button>  
                                  ) : (  
                                    <button onClick={async () => { try { if (g.today_attendance?.id) { await api.patch(`/company/attendance/${g.today_attendance.id}/`, { status: 'absent' }) } else { await api.post('/company/attendance/', { guard: g.id, site: g.site, shift: g.shift, status: 'absent', date: new Date().toISOString().split('T')[0] }) } fetchGuards(); showToast(`🔴 ${g.name} marked Absent`) } catch { showToast('❌ Failed') } }} style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#FF6B6B', fontWeight: 600, fontSize: '0.8rem' }}>🔴 Mark Absent</button>  
                                  )  
                                ) : <span style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>Unassigned</span>}  
                              </td>  
                              <td style={{ textAlign: 'right', paddingRight: '24px' }}>  
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>  
                                  <button className="btn-icon" onClick={() => setEditGuardData({ ...g })}>✏️</button>  
                                  <button className="btn-icon" onClick={() => setConfirmDelete({ id: g.id, name: g.name, type: 'guard', title: 'Delete Guard' })} style={{ color: 'var(--clr-danger)' }}><Trash2 size={18} /></button>  
                                </div>  
                              </td>  
                            </tr>  
                          );  
                        })}  
                      </tbody>  
                    </table>  
                  )}  
                </div>  
              </div>  
            </div>  
    );
}
