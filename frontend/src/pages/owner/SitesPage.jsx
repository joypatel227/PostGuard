import React, { useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import api from '../../services/api';
import { isSiteOpen, format12h } from '../../utils/helpers';
import { FI, FormCard } from '../../components/FormElements';
import { 
  Building, MapPin, Search, Plus, Map as MapIcon, Edit2, Trash2, X
} from 'lucide-react';

function EditSiteForm({ site, onSave, onCancel, bankAccounts }) {
  const [f, setF] = useState(site)
  const stOpts = [
    { v: 'flat', l: '🏠 Flat / Residential' }, { v: 'bunglow', l: '🏡 Bunglow / Villa' },
    { v: 'company', l: '🏢 Company / Commercial' }, { v: 'other', l: '📍 Other' }
  ]
  return (
    <FormCard title={`✏️ Edit Site — ${f.name}`}
      onSubmit={e => { e.preventDefault(); onSave(f) }}
      onCancel={onCancel} color="rgba(0,229,160,0.35)">
      <FI label="Site Name" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required bankAccounts={bankAccounts} />
      <FI label="Site Type" value={f.site_type} onChange={e => setF(p => ({ ...p, site_type: e.target.value }))} options={stOpts} bankAccounts={bankAccounts} />
      <FI label="Monthly Amount (₹)" value={f.monthly_amount} onChange={e => setF(p => ({ ...p, monthly_amount: e.target.value }))} type="number" bankAccounts={bankAccounts} />
      <FI label="Invoice Type" value={f.invoice_format || 'normal'} onChange={e => setF(p => ({ ...p, invoice_format: e.target.value }))} options={[
        { v: 'normal', l: '📄 Normal Invoice' },
        { v: 'gst', l: '🧾 GST Invoice' }
      ]} bankAccounts={bankAccounts} />
      {f.invoice_format === 'gst' && (
        <FI label="Client GSTIN" value={f.client_gstin || ''} onChange={e => setF(p => ({ ...p, client_gstin: e.target.value }))} placeholder="24XXXXX1234X1Z5" bankAccounts={bankAccounts} />
      )}
      <FI label="Owner Receives In" value={f.bill_account_name || ''} onChange={e => setF(p => ({ ...p, bill_account_name: e.target.value }))} options={[
        { v: '', l: '— Not Linked —' },
        ...(bankAccounts || []).map(b => ({ v: b.account_name, l: `${b.account_name} (${b.bank_name})` }))
      ]} bankAccounts={bankAccounts} />
      <FI label="Client Sending Acct" value={f.client_account_name || ''} onChange={e => setF(p => ({ ...p, client_account_name: e.target.value }))} placeholder="Client UPI/Bank details" bankAccounts={bankAccounts} />
      <FI label="No. of Guards" value={f.num_securities} onChange={e => setF(p => ({ ...p, num_securities: e.target.value }))} type="number" bankAccounts={bankAccounts} />
      <FI label="Address" value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} span bankAccounts={bankAccounts} />
    </FormCard>
  )
}

export default function SitesPage() {
  const { user } = useAuth();
  const { 
    stats, sites, guards, supervisors, 
    fetchSites, fetchStats,
    setConfirmDelete, showToast,
    showAddSite, setShowAddSite
  } = useOwnerData();

  const [search, setSearch] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const [siteForm, setSiteForm] = useState({ 
    name: '', address: '', client_name: '', client_phone: '', 
    site_type: 'company', agency_name: '', gst_number: '', 
    monthly_amount: 0, shifts: [] 
  });
  const [editSiteData, setEditSiteData] = useState(null);

  const siteTypeOpts = [{ v: 'flat', l: '🏠 Flat / Residential' }, { v: 'bunglow', l: '🏡 Bunglow / Villa' }, { v: 'company', l: '🏢 Company / Commercial' }, { v: 'other', l: '📍 Other' }];

    const createSite = async (e) => {  
      e.preventDefault()  
      try {  
        await api.post('/company/sites/', siteForm)  
        showToast('✅ Site added!')  
        setShowAddSite(false); setSiteForm({ name: '', site_type: 'company', address: '', monthly_amount: 0, bill_account_name: '', num_securities: 0, shift_name: 'Day', shift_start_time: '08:00', shift_end_time: '18:00' })  
        fetchSites(); fetchStats()  
      } catch (err) {  
        const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Failed'  
        showToast(`❌ ${msg}`)  
      }  
    }  
    const saveSite = async (formData) => {  
      try { await api.patch(`/company/sites/${formData.id}/`, formData); showToast('✅ Site updated!'); setEditSiteData(null); fetchSites() } catch { showToast('❌ Failed') }  
    }  
    const toggleSite = async (site) => {  
      try { await api.patch(`/company/sites/${site.id}/`, { is_active: !site.is_active }); showToast('🔄 Updated'); fetchSites() } catch {}  
    }  

    return (
            <div className="tab-content animate-fadeIn">  
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>  
                <div><h1>📍 Sites & Locations</h1><p>{sites.filter(s => isSiteOpen(s).isOpen).length} open now · {sites.filter(s => !isSiteOpen(s).isOpen).length} closed</p></div>  
                <div style={{ display: 'flex', gap: '12px' }}>  
                  <div className="search-input-wrap"><Search size={16} className="search-icon" /><input type="text" placeholder="Search sites..." className="search-input" value={search} onChange={e => setSearch(e.target.value)} /></div>  
                  <button className="btn btn-primary btn-glow" onClick={() => { setShowAddSite(true); setEditSiteData(null) }}><Plus size={16} /> Add Site</button>  
                </div>  
              </div>  
    
              {showAddSite && (  
                <FormCard title="➕ Add New Site" onSubmit={createSite} onCancel={() => setShowAddSite(false)}>  
                  <FI label="Site Name" value={siteForm.name} onChange={e => setSiteForm(p => ({ ...p, name: e.target.value }))} placeholder="Sunrise Apartments" required />  
                  <FI label="Site Type" value={siteForm.site_type} onChange={e => setSiteForm(p => ({ ...p, site_type: e.target.value }))} options={siteTypeOpts} />  
                  <FI label="Monthly Amount (₹)" value={siteForm.monthly_amount} onChange={e => setSiteForm(p => ({ ...p, monthly_amount: e.target.value }))} type="number" placeholder="25000" />  
                  <FI label="Invoice Type" value={siteForm.invoice_format || 'normal'} onChange={e => setSiteForm(p => ({ ...p, invoice_format: e.target.value }))} options={[  
                    { v: 'normal', l: '📄 Normal Invoice' },  
                    { v: 'gst', l: '🧾 GST Invoice' }  
                  ]} />  
                  {siteForm.invoice_format === 'gst' && (  
                    <FI label="Client GSTIN" value={siteForm.client_gstin || ''} onChange={e => setSiteForm(p => ({ ...p, client_gstin: e.target.value }))} placeholder="24XXXXX1234X1Z5" />  
                  )}  
                  <FI label="Owner Receives In" value={siteForm.bill_account_name || ''} onChange={e => setSiteForm(p => ({ ...p, bill_account_name: e.target.value }))} options={[  
                    { v: '', l: '— Not Linked —' },  
                    ...(bankAccounts || []).map(b => ({ v: b.account_name, l: `${b.account_name} (${b.bank_name})` }))  
                  ]} />  
                  <FI label="Client Sending Acct" value={siteForm.client_account_name || ''} onChange={e => setSiteForm(p => ({ ...p, client_account_name: e.target.value }))} placeholder="Client UPI/Bank details" />  
                  <FI label="No. of Guards" value={siteForm.num_securities} onChange={e => setSiteForm(p => ({ ...p, num_securities: e.target.value }))} type="number" placeholder="2" />  
                  <FI label="Address" value={siteForm.address} onChange={e => setSiteForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address..." />  
                  <div style={{ gridColumn: '1/-1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>  
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(124, 92, 255, 0.2)' }}>  
                      <FI label="Shift Name" value={siteForm.shift_name} onChange={e => setSiteForm(p => ({ ...p, shift_name: e.target.value }))} placeholder="Day Shift" required />  
                      <FI label="Start" value={siteForm.shift_start_time} onChange={val => setSiteForm(p => ({ ...p, shift_start_time: val.target.value }))} type="time-wheel" required />  
                      <FI label="End" value={siteForm.shift_end_time} onChange={val => setSiteForm(p => ({ ...p, shift_end_time: val.target.value }))} type="time-wheel" required />  
                    </div>  
                  </div>  
                </FormCard>  
              )}  
    
              {editSiteData && (  
                <EditSiteForm  
                  key={editSiteData.id}  
                  site={editSiteData}  
                  onSave={saveSite}  
                  onCancel={() => setEditSiteData(null)}  
                  bankAccounts={bankAccounts}  
                />  
              )}  
    
              {showAddClient && (  
                <FormCard   
                  title={`🔑 Create Client Login: ${sites.find(s => s.id === showAddClient)?.name}`}   
                  onSubmit={createClient}   
                  onCancel={() => setShowAddClient(null)}  
                  color="rgba(0, 229, 160, 0.4)"  
                >  
                  {clientForm.password && (  
                    <div className="strength-meter-container">  
                      <div className="strength-meter-bar">  
                        <div   
                          className="strength-meter-fill"   
                          style={{   
                            width: checkPasswordStrength(clientForm.password).width,   
                            backgroundColor: checkPasswordStrength(clientForm.password).color   
                          }}  
                        />  
                      </div>  
                      <div className="strength-text">  
                        <span style={{ color: checkPasswordStrength(clientForm.password).color }}>  
                          STRENGTH: {checkPasswordStrength(clientForm.password).label}  
                        </span>  
                        {clientForm.confirm_password && (  
                          <span style={{ color: clientForm.password === clientForm.confirm_password ? '#00e5a0' : '#ff4d6d' }}>  
                            {clientForm.password === clientForm.confirm_password ? '✅ MATCHED' : '❌ MISMATCH'}  
                          </span>  
                        )}  
                      </div>  
                    </div>  
                  )}  
    
                  <FI label="Manager Name" value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" required />  
                  <FI label="Login Email" value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} placeholder="client@example.com" required />  
                  <FI label="Phone Number" value={clientForm.phone} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))} placeholder="10 Digits" required />  
                  <FI label="Password" value={clientForm.password} onChange={e => setClientForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Min 6 chars" required />  
                  <FI label="Confirm Password" value={clientForm.confirm_password} onChange={e => setClientForm(p => ({ ...p, confirm_password: e.target.value }))} type="password" placeholder="Repeat password" required />  
                </FormCard>  
              )}  
    
              {fSites.length === 0  
                ? <div className="card glass-card"><div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><MapPin size={60} /></div><p>No sites found.</p><button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowAddSite(true)}>Add First Site</button></div></div>  
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>  
                  {fSites.map(site => (  
                    <div key={site.id} className="card glass-card" style={{ padding: '22px', border: isSiteOpen(site).isOpen ? '1px solid rgba(0,229,160,0.25)' : '1px solid rgba(255,255,255,0.05)' }}>  
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>  
                        <div><div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{site.name}</div><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)' }}>{typeLabel[site.site_type]}</div></div>  
                        {(() => {  
                          const { isOpen, activeShift } = isSiteOpen(site)  
                          return (  
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>  
                              <span className="badge" style={{ background: isOpen ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)', color: isOpen ? '#00E5A0' : 'var(--clr-muted)' }}>  
                                {isOpen ? '🟢 OPEN' : '⚫ CLOSED'}  
                              </span>  
                              {activeShift && <span style={{ fontSize: '0.6rem', color: '#00E5A0' }}>{activeShift.name} running</span>}  
                            </div>  
                          )  
                        })()}  
                      </div>  
                      {site.address && <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginBottom: '14px' }}>{site.address}</div>}  
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>  
                        <div><div style={{ fontWeight: 700, color: '#7C5CFF', fontSize: '1.1rem' }}>₹{parseFloat(site.monthly_amount || 0).toLocaleString('en-IN')}</div><div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>Monthly</div></div>  
                        <div><div style={{ fontWeight: 700, color: '#5B8CFF', fontSize: '1.1rem' }}>{guards.filter(g => g.site === site.id).length}</div><div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>Guards</div></div>  
                        {site.bill_account_name && <div><div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--clr-muted)', marginTop: '4px' }}>{site.bill_account_name}</div><div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)' }}>Account</div></div>}  
                      </div>  
                        
                      <div style={{ marginBottom: '16px' }}>  
                          {site.client_user ? (  
                              <div style={{ background: 'rgba(0,229,160,0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,229,160,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>  
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>  
                                      <div style={{ padding: '4px', background: 'rgba(0,229,160,0.15)', borderRadius: '50%', color: '#00E5A0', display: 'flex' }}><User size={12}/></div>  
                                      <div>  
                                          <div style={{ fontSize: '0.8rem', color: '#00E5A0', fontWeight: 600 }}>Client Login Active</div>  
                                          <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)' }}>{site.client_user_name}</div>  
                                      </div>  
                                  </div>  
                                  <button   
                                      title="Delete Client Login"  
                                      onClick={() => unlinkClient(site.id)}  
                                      style={{ background: 'rgba(255,77,109,0.1)', border: 'none', borderRadius: '6px', color: '#FF4D6D', padding: '6px', cursor: 'pointer', display: 'flex', transition: 'all 0.2s' }}  
                                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,77,109,0.2)'}  
                                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,77,109,0.1)'}  
                                  >  
                                      <Trash2 size={16} />  
                                  </button>  
                              </div>  
                          ) : (  
                              <button className="btn" style={{ width: '100%', background: 'rgba(124,92,255,0.08)', color: '#7C5CFF', border: '1px dashed rgba(124,92,255,0.3)', padding: '10px', fontSize: '0.85rem' }} onClick={() => setShowAddClient(site.id)}>  
                                  🔑 Generate Client Login  
                              </button>  
                          )}  
                      </div>  
                      {/* Shifts Block */}  
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>  
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>  
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>  
                            <Clock size={14} /> SHIFTS  
                          </div>  
                          <button className="btn-icon" onClick={() => setActiveShiftSite(site.id)} style={{ fontSize: '0.7rem', color: 'var(--clr-primary)', padding: '2px 8px', background: 'rgba(91,140,255,0.1)' }}>+ Add</button>  
                        </div>  
    
                        {/* Add Form */}  
                        {activeShiftSite === site.id && (  
                          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(124, 92, 255, 0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>  
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)', gap: '10px' }}>  
                              <input type="text" className="form-input" placeholder="Shift Name" value={shiftAddData.name} onChange={e => setShiftAddData(p => ({ ...p, name: e.target.value }))} style={{ height: '44px', padding: '6px 12px' }} />  
                              <TimeWheelPicker value={shiftAddData.start_time} onChange={(val) => setShiftAddData(p => ({ ...p, start_time: val }))} />  
                              <TimeWheelPicker value={shiftAddData.end_time} onChange={(val) => setShiftAddData(p => ({ ...p, end_time: val }))} />  
                            </div>  
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>  
                              <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px' }} onClick={() => { createShift(site.id, shiftAddData); setActiveShiftSite(null) }}>Add Shift</button>  
                              <button className="btn" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px', background: 'var(--clr-surface-2)' }} onClick={() => setActiveShiftSite(null)}>Cancel</button>  
                            </div>  
                          </div>  
                        )}  
    
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>  
                          {site.shifts?.map(s => (  
                            <div key={s.id}>  
                              {shiftEditData?.id === s.id ? (  
                                /* Edit Form inline */  
                                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(124, 92, 255, 0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>  
                                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)', gap: '10px' }}>  
                                    <input type="text" className="form-input" value={shiftEditData.name} onChange={e => setShiftEditData(p => ({ ...p, name: e.target.value }))} style={{ height: '44px', padding: '6px 12px' }} />  
                                    <TimeWheelPicker value={shiftEditData.start_time} onChange={(val) => setShiftEditData(p => ({ ...p, start_time: val }))} />  
                                    <TimeWheelPicker value={shiftEditData.end_time} onChange={(val) => setShiftEditData(p => ({ ...p, end_time: val }))} />  
                                  </div>  
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>  
                                    <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px' }} onClick={() => { updateShift(s.id, shiftEditData); setShiftEditData(null) }}>Save Changes</button>  
                                    <button className="btn" style={{ padding: '6px 16px', fontSize: '0.8rem', height: '32px', background: 'var(--clr-surface-2)' }} onClick={() => setShiftEditData(null)}>Cancel</button>  
                                  </div>  
                                </div>  
                              ) : (  
                                /* Normal View */  
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>  
                                  <div>  
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name}</div>  
                                    <div style={{ color: 'var(--clr-muted)' }}>{format12h(s.start_time)} - {format12h(s.end_time)}</div>  
                                  </div>  
                                  <div className="dropdown" style={{ position: 'relative' }}>  
                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `shift-${s.id}` ? null : `shift-${s.id}`) }}><MoreVertical size={16} /></button>  
                                    {openMenu === `shift-${s.id}` && (  
                                      <div className="dropdown-menu animate-fadeIn" style={{ right: 0, minWidth: '120px', zIndex: 10 }}>  
                                        <button onClick={() => { setShiftEditData(s); setOpenMenu(null) }}><Edit size={14} /> Edit Shift</button>  
                                        <button onClick={() => deleteShift(s.id)} style={{ color: 'var(--clr-danger)' }}><Trash size={14} /> Delete Shift</button>  
                                      </div>  
                                    )}  
                                  </div>  
                                </div>  
                              )}  
                            </div>  
                          ))}  
                        </div>  
                      </div>  
    
                      <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '8px' }}>  
                        <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: 'var(--clr-surface-2)' }} onClick={() => { setEditSiteData({ ...site }); setShowAddSite(false) }}>✏️ Edit Site</button>  
                        <button className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem', background: site.is_active ? 'rgba(255,107,107,0.1)' : 'rgba(0,229,160,0.1)', color: site.is_active ? 'var(--clr-danger)' : '#00E5A0' }} onClick={() => toggleSite(site)}>{site.is_active ? '🔒 Close' : '✅ Open'}</button>  
                        <button className="btn-icon" style={{ color: 'var(--clr-danger)' }} onClick={() => setConfirmDelete({ id: site.id, name: site.name, type: 'site', title: 'Delete Site' })}><Trash2 size={20} /></button>  
                      </div>  
                    </div>  
                  ))}  
                </div>}  
            </div>  
    );
}
