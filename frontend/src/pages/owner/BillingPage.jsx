import React, { useState } from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import { useAuth } from '../../components/AuthContext';
import api from '../../services/api';
import { formatCurrency, monthNames } from '../../utils/helpers';
import { 
  FileText, IndianRupee, Download, Trash2, CheckCircle, Search, CreditCard
} from 'lucide-react';
import InvoiceModal from '../../components/InvoiceModal';


export default function BillingPage() {
  const { user } = useAuth();
  const { 
    sites, bills, payments, bankAccounts,
    fetchBills, fetchPayments, showToast
  } = useOwnerData();

  const [billingMode, setBillingMode] = useState('overview');
  const [billingSearch, setBillingSearch] = useState('');
  const [invoiceSite, setInvoiceSite] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);

    const handleGenerateBillClick = (s) => {  
      const today = new Date()  
      const currentMonth = today.getMonth() + 1  
      const currentYear = today.getFullYear()  
      const hasCurrentMonthBill = bills.some(b => b.site === s.id && b.bill_month === currentMonth && b.bill_year === currentYear)  
        
      if (hasCurrentMonthBill) {  
        if (!window.confirm(`A bill has already been generated for ${s.name} this month (${new Date(2000, currentMonth - 1).toLocaleString('default', { month: 'long' })} ${currentYear}). Are you sure you want to generate another one?`)) {  
          return  
        }  
      }  
      setInvoiceSite({ ...s, agency_name: s.agency_name || user?.agency_name })  
    }  
    const deleteBill = async (billId) => {  
      if (!window.confirm("Are you sure you want to delete/unsend this bill? If the client has already made a payment, this might cause inconsistencies.")) return  
      try {  
        await api.delete(`/billing/bills/${billId}/`)  
        showToast("✅ Bill deleted successfully")  
        fetchBills()  
        fetchPayments()  
      } catch (err) {  
        showToast("❌ Failed to delete bill")  
      }  
    }  
    const markBillPaid = async (billId) => {  
      if (!window.confirm("Mark this bill as fully paid? This will set remaining amount to 0.")) return  
      try {  
        await api.patch(`/billing/bills/${billId}/`, { remaining: 0 })  
        showToast("✅ Bill marked as paid")  
        fetchBills()  
      } catch (err) {  
        showToast("❌ Failed to update bill")  
      }  
    }  

  return (
              <div className="tab-content animate-fadeIn">    
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', gap: '20px' }}>    
                  <div style={{ flex: 1, minWidth: '200px' }}>    
                    <h1>💳 Billing & Payments</h1>    
                    <p>Site-wise monthly payment tracking & verifications</p>    
                  </div>    
        
                  <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', margin: '0 auto' }}>    
                    <Search size={16} className="search-icon" />    
                    <input     
                      type="text"     
                      className="search-input"     
                      placeholder={billingMode === 'overview' ? "Search sites..." : "Search site names..."}    
                      value={billingSearch}     
                      onChange={e => setBillingSearch(e.target.value)}     
                    />    
                  </div>    
        
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>    
                    <div className="tab-pills" style={{ display: 'flex', gap: '8px', background: 'var(--clr-surface-2)', padding: '4px', borderRadius: '12px' }}>    
                      <button     
                        className={`pill-btn ${billingMode === 'overview' ? 'active' : ''}`}    
                        onClick={() => setBillingMode('overview')}    
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'overview' ? 'var(--clr-primary)' : 'transparent', color: billingMode === 'overview' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}    
                      >🏢 Site Bills</button>    
                      <button     
                        className={`pill-btn ${billingMode === 'verifications' ? 'active' : ''}`}    
                        onClick={() => setBillingMode('verifications')}    
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'verifications' ? 'var(--clr-primary)' : 'transparent', color: billingMode === 'verifications' ? '#fff' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}    
                      >    
                        ⏳ Pending    
                        {payments.filter(p => p.status === 'pending').length > 0 && (    
                          <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#FF6B6B', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px' }}>    
                            {payments.filter(p => p.status === 'pending').length}    
                          </span>    
                        )}    
                      </button>    
                      <button     
                        className={`pill-btn ${billingMode === 'rejections' ? 'active' : ''}`}    
                        onClick={() => setBillingMode('rejections')}    
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'rejections' ? 'rgba(255,107,107,0.1)' : 'transparent', color: billingMode === 'rejections' ? '#FF6B6B' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}    
                      >    
                        ❌ Rejected    
                      </button>    
                      <button     
                        className={`pill-btn ${billingMode === 'settled' ? 'active' : ''}`}    
                        onClick={() => setBillingMode('settled')}    
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: billingMode === 'settled' ? 'rgba(0,229,160,0.1)' : 'transparent', color: billingMode === 'settled' ? '#00E5A0' : 'var(--clr-muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}    
                      >    
                        ✅ Settled    
                      </button>    
                    </div>    
                  </div>    
                </div>    
        
                {billingMode === 'overview' && (    
                  <div className="animate-fadeIn">    
                    <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>    
                      <div className="stat-card glass-card" style={{ padding: '20px' }}><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Monthly Revenue</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00E5A0' }}>₹{totalRevenue.toLocaleString('en-IN')}</div></div>    
                      <div className="stat-card glass-card" style={{ padding: '20px' }}><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Active Sites</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#5B8CFF' }}>{sites.filter(s => s.is_active).length}</div></div>    
                      <div className="stat-card glass-card" style={{ padding: '20px' }}><div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Sites</div><div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7C5CFF' }}>{sites.length}</div></div>    
                    </div>    
                    <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>    
                      <div className="table-wrap">    
                        {sites.length === 0    
                          ? <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><CreditCard size={60} /></div><p>No sites yet.</p><button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setTab('sites')}>Add Sites First</button></div>    
                          : <table>    
                            <thead><tr style={{ background: 'rgba(255,255,255,0.02)' }}><th style={{ padding: '18px 24px' }}>SITE</th><th>TYPE</th><th>MONTHLY AMOUNT</th><th>OWNER RECEIVES IN</th><th>CLIENT ACCOUNT</th><th>PAYMENT STATUS</th><th>SITE STATUS</th><th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th></tr></thead>    
                            <tbody>    
                              {sites.filter(s => {    
                                if (!billingSearch) return true    
                                return (s.name || '').toLowerCase().includes(billingSearch.toLowerCase())    
                              }).map(s => {    
                                const linkedBank = bankStats.find(b => b.account_name === s.bill_account_name)    
                                return (    
                                <tr key={s.id} className="table-row-hover">    
                                  <td style={{ padding: '14px 24px' }}><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{s.address?.slice(0, 38) || '—'}</div></td>    
                                  <td style={{ fontSize: '0.85rem' }}>{typeLabel[s.site_type]}</td>    
                                  <td style={{ fontWeight: 700, color: '#00E5A0' }}>₹{parseFloat(s.monthly_amount || 0).toLocaleString('en-IN')}</td>    
                                  <td style={{ minWidth: '180px' }}>    
                                    {linkedBank ? (    
                                      <div>    
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>    
                                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5B8CFF' }}>🏦 {linkedBank.account_name}</span>    
                                          <span style={{ fontSize: '0.68rem', color: 'var(--clr-muted)' }}>({linkedBank.bank_name})</span>    
                                        </div>    
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>    
                                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>    
                                            <div style={{ width: `${Math.min(100, linkedBank.limit_used_pct)}%`, height: '100%', background: linkedBank.limit_used_pct >= 80 ? '#FF6B6B' : linkedBank.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0', transition: 'width 0.5s' }} />    
                                          </div>    
                                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: linkedBank.limit_used_pct >= 80 ? '#FF6B6B' : linkedBank.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0' }}>{linkedBank.limit_used_pct}%</span>    
                                        </div>    
                                      </div>    
                                    ) : (    
                                      <span style={{ fontSize: '0.82rem', color: 'var(--clr-muted)' }}>{s.bill_account_name || '— Not linked'}</span>    
                                    )}    
                                  </td>    
                                  <td>    
                                    <span style={{ fontSize: '0.85rem', color: 'var(--clr-text)' }}>{s.client_account_name || '—'}</span>    
                                  </td>    
                                  <td>    
                                    {(() => {    
                                      const siteBills = bills.filter(b => b.site === s.id);    
                                      const totalRemaining = siteBills.reduce((s, b) => s + parseFloat(b.remaining || 0), 0);    
                                      const hasPending = payments.some(p => p.bill_details?.site === s.id && p.status === 'pending');    
                                          
                                      if (hasPending) return <span className="badge" style={{ background: 'rgba(255,169,64,0.15)', color: '#FFA940' }}>⏳ In Process</span>;    
                                      if (totalRemaining > 0) return <span className="badge" style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B' }}>🔴 Outstanding (₹{totalRemaining.toLocaleString()})</span>;    
                                      if (siteBills.length > 0) return <span className="badge" style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0' }}>✅ Settled</span>;    
                                      return <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--clr-muted)' }}>— No Bills</span>;    
                                    })()}    
                                  </td>    
                                  <td><span className="badge" style={{ background: s.is_active ? 'rgba(0,229,160,0.15)' : 'rgba(255,255,255,0.05)', color: s.is_active ? '#00E5A0' : 'var(--clr-muted)' }}>{s.is_active ? 'Active' : 'Closed'}</span></td>    
                                  <td style={{ textAlign: 'right', paddingRight: '24px' }}>    
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>    
                                      {(() => {    
                                        const today = new Date()    
                                        const cMonth = today.getMonth() + 1    
                                        const cYear = today.getFullYear()    
                                        const hasGenerated = bills.some(b => b.site === s.id && b.bill_month === cMonth && b.bill_year === cYear)    
                                            
                                        return (    
                                          <button     
                                            className={`btn ${hasGenerated ? '' : 'btn-primary btn-glow'}`}     
                                            style={{     
                                              padding: '7px 16px',     
                                              fontSize: '0.8rem',     
                                              display: 'flex',     
                                              alignItems: 'center',     
                                              gap: '6px',    
                                              borderRadius: '10px',    
                                              background: hasGenerated ? 'rgba(124, 92, 255, 0.15)' : '',    
                                              color: hasGenerated ? '#7C5CFF' : '',    
                                              border: hasGenerated ? '1px solid rgba(124, 92, 255, 0.3)' : ''    
                                            }}     
                                            onClick={() => handleGenerateBillClick(s)}    
                                          >    
                                            <FileText size={15}/> {hasGenerated ? 'Dup. Bill' : 'Generate Bill'}    
                                          </button>    
                                        )    
                                      })()}    
                                      <button     
                                        className="btn"     
                                        style={{     
                                          padding: '7px 16px',     
                                          fontSize: '0.8rem',     
                                          background: 'rgba(56, 189, 248, 0.1)',     
                                          color: '#38BDF8',     
                                          display: 'flex',     
                                          alignItems: 'center',     
                                          gap: '6px',    
                                          border: '1px solid rgba(56, 189, 248, 0.2)',    
                                          borderRadius: '10px'    
                                        }}     
                                        onClick={() => setViewingHistorySite(s)}    
                                      >    
                                        <Clock size={14}/> History    
                                      </button>    
                                      <button     
                                        className="btn"     
                                        style={{     
                                          padding: '7px 16px',     
                                          fontSize: '0.8rem',     
                                          background: 'rgba(255,255,255,0.05)',     
                                          color: '#fff',     
                                          display: 'flex',     
                                          alignItems: 'center',     
                                          gap: '6px',    
                                          border: '1px solid rgba(255,255,255,0.1)',    
                                          borderRadius: '10px'    
                                        }}     
                                        onClick={() => { setTab('sites'); setEditSiteData({ ...s }) }}    
                                      >    
                                        <Edit size={14} color="#7C5CFF"/> Edit    
                                      </button>    
                                    </div>    
                                  </td>    
                                </tr>    
                              )})}    
                            </tbody>    
                          </table>}    
                      </div>    
                    </div>    
                  </div>    
                )}    
        
                {billingMode !== 'overview' && (    
                  <div className="card glass-card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>    
                    <div className="table-wrap">    
                      {payments.filter(p => {    
                        if (billingMode === 'verifications') return ['pending'].includes(p.status);    
                        if (billingMode === 'rejections') return ['rejected'].includes(p.status);    
                        if (billingMode === 'settled') return ['verified'].includes(p.status);    
                        return false;    
                      }).length === 0    
                        ? <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><CreditCard size={60} /></div><p>No {billingMode} payments found.</p></div>    
                        : <table>    
                          <thead>    
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>    
                              <th style={{ padding: '18px 24px' }}>DATE</th>    
                              <th>SITE / BILLING</th>    
                              <th>SUBMITTED AMOUNT</th>    
                              <th>PROOF</th>    
                              <th>STATUS</th>    
                              <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>    
                            </tr>    
                          </thead>    
                          <tbody>    
                            {payments.filter(p => {    
                              if (billingMode === 'verifications') if (p.status !== 'pending') return false;    
                              if (billingMode === 'rejections') if (p.status !== 'rejected') return false;    
                              if (billingMode === 'settled') if (p.status !== 'verified') return false;    
                                  
                              if (billingSearch) {    
                                const siteName = (p.bill_details?.site_name || '').toLowerCase()    
                                if (!siteName.includes(billingSearch.toLowerCase())) return false    
                              }    
                              return true    
                            }).map(p => {    
                              const siteName = p.bill_details?.site_name || 'Unknown Site';    
                              return (    
                              <tr key={p.id} className="table-row-hover">    
                                <td style={{ padding: '14px 24px' }}>    
                                  <div style={{ fontWeight: 600 }}>{p.paid_at}</div>    
                                  <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '3px' }}>    
                                    Submitted {new Date(p.created_at).toLocaleDateString()}    
                                  </div>    
                                </td>    
                                <td>    
                                  <div style={{ fontWeight: 600 }}>{siteName}</div>    
                                  <div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>    
                                    {p.bill_details?.bill_type?.toUpperCase()} • {p.bill_details?.bill_month ? `Month ${p.bill_details.bill_month}/${p.bill_details.bill_year}` : ''}    
                                  </div>    
                                  <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '2px' }}>    
                                    Total Bill: ₹{parseFloat(p.bill_details?.amount || 0).toLocaleString('en-IN')} · Remaining: ₹{parseFloat(p.bill_details?.remaining || 0).toLocaleString('en-IN')}    
                                  </div>    
                                </td>    
                                <td>    
                                  <div style={{ fontWeight: 700, color: p.status === 'verified' ? '#00E5A0' : '#5B8CFF' }}>    
                                    ₹{parseFloat(p.amount_paid||0).toLocaleString('en-IN')}    
                                  </div>    
                                </td>    
                                <td>    
                                  <div style={{ display: 'flex', gap: '8px' }}>    
                                    {p.screenshot_url && (    
                                      <a href={p.screenshot_url} target="_blank" rel="noreferrer"     
                                        onClick={(e) => { e.preventDefault(); setReceiptModal(p.screenshot_url); }}    
                                        style={{ color: '#7C5CFF', fontSize: '0.85rem', textDecoration: 'none' }}>    
                                        👁️ Receipt    
                                      </a>    
                                    )}    
                                    {!p.screenshot_url && <span style={{ color: 'var(--clr-muted)', fontSize: '0.8rem' }}>No Proof</span>}    
                                  </div>    
                                </td>    
                                <td>    
                                  <span className="badge" style={{     
                                    background: p.status === 'pending' ? 'rgba(255,169,64,0.15)' : p.status === 'verified' ? 'rgba(0,229,160,0.15)' : 'rgba(255,107,107,0.15)',     
                                    color: p.status === 'pending' ? '#FFA940' : p.status === 'verified' ? '#00E5A0' : '#FF6B6B'     
                                  }}>    
                                    {p.status.toUpperCase()}    
                                  </span>    
                                </td>    
                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>    
                                  {p.status === 'pending' ? (    
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>    
                                      <button     
                                        className="btn"     
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(0,229,160,0.15)', color: '#00E5A0', fontWeight: 'bold' }}    
                                        onClick={async () => {    
                                          try {    
                                            const res = await api.post(`/billing/payments/${p.id}/verify/`, { action: 'verify' });    
                                            fetchPayments();    
                                            fetchBankAccounts();    
                                            fetchBankStats();    
                                            const vs = res.data?.verification_summary;    
                                            if (vs) {    
                                              if (vs.is_fully_paid) {    
                                                showToast(`✅ Verified! Bill FULLY PAID.`);    
                                              } else {    
                                                showToast(`✅ Verified! Remaining: ₹${vs.remaining}`);    
                                              }    
                                            }    
                                          } catch (err) {    
                                            showToast(`❌ Verification failed`);    
                                          }    
                                        }}    
                                      >    
                                        Verify    
                                      </button>    
                                      <button     
                                        className="btn"     
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', fontWeight: 'bold' }}    
                                        onClick={async () => {    
                                          try {    
                                            await api.post(`/billing/payments/${p.id}/verify/`, { action: 'reject' });    
                                            fetchPayments();    
                                            showToast("❌ Payment rejected");    
                                          } catch (err) {    
                                            showToast("❌ Rejection failed");    
                                          }    
                                        }}    
                                      >    
                                        Reject    
                                      </button>    
                                    </div>    
                                  ) : (    
                                    <span style={{ fontSize: '0.8rem', color: 'var(--clr-muted)' }}>— Resolved</span>    
                                  )}    
                                </td>    
                              </tr>    
                              )})}    
                          </tbody>    
                        </table>}    
                    </div>    
                  </div>    
                )}    
              </div>    
              // </div>    
  );
}
