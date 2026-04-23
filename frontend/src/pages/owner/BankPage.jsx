import React, { useState } from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import { 
  Building, IndianRupee, Trash2, Edit2, Plus, X, Search, CheckCircle, ExternalLink
} from 'lucide-react';
import { FI, FormCard } from '../../components/FormElements';

export default function BankPage() {
  const { 
    bankAccounts, bankStats, 
    fetchBankAccounts, fetchBankStats, 
    showToast, setConfirmDelete
  } = useOwnerData();

  const [showAddBank, setShowAddBank] = useState(false);
  const [editBankData, setEditBankData] = useState(null);

  const saveBank = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    
    try {
      if (editBankData) {
        await api.patch(`/billing/bank-accounts/${editBankData.id}/`, payload);
        showToast('✅ Account updated!');
      } else {
        await api.post('/billing/bank-accounts/', payload);
        showToast('✅ Account added!');
      }
      setShowAddBank(false);
      setEditBankData(null);
      fetchBankAccounts();
      fetchBankStats();
    } catch (err) {
      showToast('❌ Failed to save bank account');
    }
  };

  return (
              <div className="tab-content animate-fadeIn">    
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>    
                  <div><h1>🏦 Bank Accounts</h1><p>Manage accounts, track transaction limits and ledgers</p></div>    
                  <button className="btn btn-primary btn-glow" onClick={() => { setShowAddBank(true); setEditBankData(null) }}><span style={{ marginRight: '6px' }}>+</span> Add Account</button>    
                </div>    
        
                {/* Add / Edit form */}    
                {(showAddBank || editBankData) && (    
                  <div className="card glass-card" style={{ marginBottom: '24px', padding: '28px', border: '1px solid rgba(124,92,255,0.4)' }}>    
                    <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>{editBankData ? '✏️ Edit Bank Account' : '➕ Add New Bank Account'}</h3>    
                    <form onSubmit={async (e) => {    
                      e.preventDefault()    
                      const payload = editBankData ? { ...editBankData } : { ...bankForm }    
                      try {    
                        if (editBankData) {    
                          await api.patch(`/billing/bank-accounts/${editBankData.id}/`, payload)    
                          showToast('✅ Account updated!')    
                        } else {    
                          await api.post('/billing/bank-accounts/', payload)    
                          showToast('✅ Account added!')    
                        }    
                        setShowAddBank(false); setEditBankData(null)    
                        setBankForm({ account_name: '', bank_name: '', account_no: '', ifsc: '', upi_id: '', balance: 0, transaction_limit: 2000000, is_default: false })    
                        fetchBankAccounts(); fetchBankStats()    
                        } catch (err) {    
                          const data = err.response?.data;    
                          let msg = 'Failed';    
                          if (data && data.detail) msg = data.detail;    
                          else if (data && typeof data === 'object') msg = Object.values(data).flat().join(', ');    
                          showToast(`❌ ${msg}`)    
                        }    
                      }}>    
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>    
                          {[    
                            { label: 'Account Name *', key: 'account_name', type: 'text', ph: 'e.g. HDFC Current', req: true },    
                            { label: 'Bank Name *', key: 'bank_name', type: 'text', ph: 'e.g. HDFC Bank', req: true },    
                            { label: 'Account Number *', key: 'account_no', type: 'text', ph: 'e.g. 50100XXXXXX', req: true },    
                            { label: 'IFSC Code', key: 'ifsc', type: 'text', ph: 'e.g. HDFC0001234' },    
                            { label: 'UPI ID', key: 'upi_id', type: 'text', ph: 'e.g. business@hdfc' },    
                            { label: 'Current Balance (₹)', key: 'balance', type: 'number', ph: '0' },    
                            { label: 'Monthly Txn Limit (₹)', key: 'transaction_limit', type: 'number', ph: '2000000' },    
                          ].map(({ label, key, type, ph, req }) => (    
                            <div className="form-group" key={key}>    
                              <label className="form-label">{label}</label>    
                              <input type={type} className="form-input" placeholder={ph} required={req}    
                                value={editBankData ? (editBankData[key] ?? '') : (bankForm[key] ?? '')}    
                                onChange={e => editBankData    
                                  ? setEditBankData(p => ({ ...p, [key]: e.target.value }))    
                                  : setBankForm(p => ({ ...p, [key]: e.target.value }))    
                                } />    
                            </div>    
                        ))}    
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '28px' }}>    
                          <input type="checkbox" id="is_default_chk"    
                            checked={editBankData ? editBankData.is_default : bankForm.is_default}    
                            onChange={e => editBankData    
                              ? setEditBankData(p => ({ ...p, is_default: e.target.checked }))    
                              : setBankForm(p => ({ ...p, is_default: e.target.checked }))    
                            } style={{ width: '18px', height: '18px', accentColor: '#7C5CFF' }} />    
                          <label htmlFor="is_default_chk" style={{ fontSize: '0.88rem', fontWeight: 600 }}>Set as Default Account</label>    
                        </div>    
                      </div>    
                      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>    
                        <button type="submit" className="btn btn-primary btn-glow">{editBankData ? 'Save Changes' : 'Add Account'}</button>    
                        <button type="button" className="btn" style={{ background: 'var(--clr-surface-2)' }} onClick={() => { setShowAddBank(false); setEditBankData(null) }}>Cancel</button>    
                      </div>    
                    </form>    
                  </div>    
                )}    
        
                {/* Account Cards */}    
                {bankStats.length === 0 && !showAddBank ? (    
                  <div className="card glass-card" style={{ textAlign: 'center', padding: '80px 40px' }}>    
                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏦</div>    
                    <h3 style={{ marginBottom: '8px' }}>No Bank Accounts Yet</h3>    
                    <p style={{ color: 'var(--clr-muted)', marginBottom: '24px' }}>Add your agency's bank accounts to start tracking payments and salary disbursements.</p>    
                    <button className="btn btn-primary btn-glow" onClick={() => setShowAddBank(true)}>+ Add First Account</button>    
                  </div>    
                ) : (    
                  <div ref={bankGridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px', alignItems: 'start' }}>    
                    {bankStats.map(b => (    
                      <div key={b.id} className="card glass-card bank-account-card" style={{ padding: '26px', border: b.is_default ? '1px solid rgba(124,92,255,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>    
                        {/* Header */}    
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>    
                          <div>    
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>    
                              <span style={{ fontSize: '1.3rem' }}>🏦</span>    
                              <strong style={{ fontSize: '1.05rem' }}>{b.account_name}</strong>    
                              {b.is_default && <span style={{ fontSize: '0.62rem', background: 'rgba(124,92,255,0.2)', color: '#7C5CFF', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>DEFAULT</span>}    
                            </div>    
                            <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)' }}>{b.bank_name} · ****{b.account_no?.slice(-4)}</div>    
                            {b.upi_id && <div style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', marginTop: '2px' }}>UPI: {b.upi_id}</div>}    
                          </div>    
                          <div style={{ display: 'flex', gap: '6px' }}>    
                            <button className="btn" title="Statement" onClick={() => setStatementModal(b)}    
                              style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(0,229,160,0.12)', color: '#00E5A0', border: '1px solid rgba(0,229,160,0.25)', borderRadius: '8px' }}>    
                              📊 Statement    
                            </button>    
                            <button className="btn-icon" title="Edit" onClick={() => { setEditBankData(bankAccounts.find(a => a.id === b.id)); setShowAddBank(false) }} style={{ fontSize: '0.85rem' }}>✏️</button>    
                            <button className="btn-icon btn-icon-danger" title="Delete" onClick={async () => {    
                              if (!window.confirm(`Delete account "${b.account_name}"?`)) return    
                              try { await api.delete(`/billing/bank-accounts/${b.id}/`); showToast('🗑️ Account deleted'); fetchBankAccounts(); fetchBankStats() } catch { showToast('❌ Failed') }    
                            }} style={{ fontSize: '0.85rem' }}>🗑️</button>    
                          </div>    
                        </div>    
        
                        {/* Balance */}    
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>    
                          <div style={{ background: 'rgba(0,229,160,0.07)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #00E5A0' }}>    
                            <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Balance</div>    
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#00E5A0' }}>{formatCurrency(b.balance)}</div>    
                            <div style={{ fontSize: '0.65rem', color: 'rgba(0,229,160,0.6)', marginTop: '2px' }}>{formatFullCurrency(b.balance)}</div>    
                          </div>    
                          <div style={{ background: 'rgba(91,140,255,0.07)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid #5B8CFF' }}>    
                            <div style={{ fontSize: '0.68rem', color: 'var(--clr-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Transactions</div>    
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#5B8CFF' }}>{b.transaction_count}</div>    
                            <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>{b.payment_count} payments · {b.salary_count} salaries</div>    
                          </div>    
                        </div>    
        
                        {/* Credit / Debit row */}    
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>    
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(0,229,160,0.05)', borderRadius: '8px' }}>    
                            <span style={{ fontSize: '1rem' }}>↑</span>    
                            <div>    
                              <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', textTransform: 'uppercase' }}>Credited (Payments)</div>    
                              <div style={{ fontWeight: 700, color: '#00E5A0', fontSize: '0.95rem' }}>₹{b.total_credited.toLocaleString('en-IN')}</div>    
                            </div>    
                          </div>    
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,107,107,0.05)', borderRadius: '8px' }}>    
                            <span style={{ fontSize: '1rem' }}>↓</span>    
                            <div>    
                              <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', textTransform: 'uppercase' }}>Debited (Salary)</div>    
                              <div style={{ fontWeight: 700, color: '#FF6B6B', fontSize: '0.95rem' }}>₹{b.total_debited.toLocaleString('en-IN')}</div>    
                            </div>    
                          </div>    
                        </div>    
        
                        {/* Limit bar */}    
                        <div style={{ marginBottom: '16px' }}>    
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>    
                            <span style={{ fontSize: '0.72rem', color: 'var(--clr-muted)', fontWeight: 600 }}>Monthly Txn Limit Used</span>    
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.limit_used_pct >= 80 ? '#FF6B6B' : b.limit_used_pct >= 50 ? '#FFA940' : '#00E5A0' }}>{b.limit_used_pct}%</span>    
                          </div>    
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>    
                            <div style={{ width: `${Math.min(100, b.limit_used_pct)}%`, height: '100%', background: b.limit_used_pct >= 80 ? '#FF6B6B' : b.limit_used_pct >= 50 ? '#FFA940' : 'linear-gradient(90deg,#7C5CFF,#00E5A0)', borderRadius: '10px', transition: 'width 0.6s ease' }} />    
                          </div>    
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>    
                            <span style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>₹{(b.total_volume / 100000).toFixed(2)}L used</span>    
                            <span style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>₹{(b.limit_remaining / 100000).toFixed(2)}L remaining of ₹{(b.transaction_limit / 100000).toFixed(0)}L</span>    
                          </div>    
                        </div>    
        
                        {/* View Transactions */}    
                        <button    
                          className="btn btn-glow"    
                          style={{ width: '100%', background: activeBankId === b.id ? 'rgba(124,92,255,0.25)' : 'rgba(124,92,255,0.1)', color: '#7C5CFF', border: '1px solid rgba(124,92,255,0.3)', fontWeight: 600, fontSize: '0.85rem' }}    
                          onClick={async () => {    
                            if (activeBankId === b.id) { setActiveBankId(null); setBankTxns([]) }    
                            else { setActiveBankId(b.id); await fetchBankTxns(b.id) }    
                          }}    
                        >    
                          {activeBankId === b.id ? '▲ Hide Transactions' : '📋 View Transactions'}    
                        </button>    
        
                        {/* Transactions drill-down */}    
                        {activeBankId === b.id && (() => {    
                          const fmtDate = (iso) => {    
                            if (!iso) return '—'    
                            const parts = iso.split('T')[0].split('-')    
                            if (parts.length < 3) return iso    
                            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']    
                            return `${parts[2]} ${months[parseInt(parts[1])-1]} ${parts[0]}`    
                          }    
                          const fmtTime = (iso) => {    
                            if (!iso) return ''    
                            return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })    
                          }    
                              
                          return (    
                            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>    
                              <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', marginBottom: '12px', fontWeight: 600 }}>Last 30 Days Activity</div>    
                                  
                              {/* Summary strip */}    
                              {bankTxns.length > 0 && (() => {    
                                const totalCr = bankTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)    
                                const totalDb = bankTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)    
                                return (    
                                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>    
                                    <div style={{ flex: 1, background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>    
                                      <div style={{ fontSize: '0.62rem', color: '#00E5A0', fontWeight: 700, textTransform: 'uppercase' }}>Credits</div>    
                                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#00E5A0' }}>+₹{totalCr.toLocaleString('en-IN')}</div>    
                                    </div>    
                                    <div style={{ flex: 1, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>    
                                      <div style={{ fontSize: '0.62rem', color: '#FF6B6B', fontWeight: 700, textTransform: 'uppercase' }}>Debits</div>    
                                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FF6B6B' }}>−₹{totalDb.toLocaleString('en-IN')}</div>    
                                    </div>    
                                    <div style={{ flex: 1, background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.15)', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>    
                                      <div style={{ fontSize: '0.62rem', color: '#7C5CFF', fontWeight: 700, textTransform: 'uppercase' }}>Net</div>    
                                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#7C5CFF' }}>{(totalCr - totalDb) >= 0 ? '+' : ''}₹{(totalCr - totalDb).toLocaleString('en-IN')}</div>    
                                    </div>    
                                  </div>    
                                )    
                              })()}    
        
                              {/* Transactions list */}    
                              {bankTxns.length === 0 ? (    
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-muted)', fontSize: '0.85rem' }}>No transactions for this period.</div>    
                              ) : (    
                                <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>    
                                  {bankTxns.map(txn => (    
                                    <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: txn.type === 'credit' ? 'rgba(0,229,160,0.04)' : 'rgba(255,107,107,0.04)', borderRadius: '8px', borderLeft: `3px solid ${txn.type === 'credit' ? '#00E5A0' : '#FF6B6B'}` }}>    
                                      <div style={{ flex: 1 }}>    
                                        <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{txn.description}</div>    
                                        <div style={{ fontSize: '0.67rem', color: 'var(--clr-muted)', marginTop: '2px' }}>    
                                          {fmtDate(txn.date)} {txn.timestamp && <span style={{ opacity: 0.5 }}>· {fmtTime(txn.timestamp)}</span>}    
                                          {txn.category && <span style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', padding: '1px 5px', fontSize: '0.62rem', textTransform: 'capitalize' }}>{txn.category}</span>}    
                                        </div>    
                                      </div>    
                                      <div style={{ textAlign: 'right', minWidth: '120px' }}>    
                                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: txn.type === 'credit' ? '#00E5A0' : '#FF6B6B' }}>    
                                          {txn.type === 'credit' ? '+' : '−'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}    
                                        </div>    
                                        <div style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>    
                                          Bal: ₹{parseFloat(txn.running_balance || 0).toLocaleString('en-IN')}    
                                        </div>    
                                      </div>    
                                    </div>    
                                  ))}    
                                </div>    
                              )}    
                            </div>    
                          )    
                        })()}    
                      </div>    
                    ))}    
                  </div>    
                )}    
              </div>    
              // </div>    
  );
}
