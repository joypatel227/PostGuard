import React, { useState } from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import api from '../../services/api';
import { Wallet, CheckCircle, Clock, Search, X, RefreshCw } from 'lucide-react';


export default function WalletPage() {
  const { wallet, fetchWallet, showToast } = useOwnerData();
  const [walletLoading, setWalletLoading] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);

  const handleAddFunds = async (amount) => {
    try {
      setWalletLoading(true);
      await api.post('/wallet/add-funds/', { amount });
      showToast('✅ Funds added successfully!');
      fetchWallet();
      setShowAddFunds(false);
    } catch (err) {
      showToast('❌ Failed to add funds');
    } finally {
      setWalletLoading(false);
    }
  };

  return (
              <div className="tab-content animate-fadeIn">    
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>    
                  <div><h1>💼 Virtual Wallet</h1><p>Agency business wallet — deposit, withdraw, pay guards & supervisors</p></div>    
                  <button className="btn btn-primary" style={{ padding: '8px 18px' }} onClick={() => { fetchWallet(); showToast('🔄 Wallet refreshed') }}><RefreshCw size={14} /> Refresh</button>    
                </div>    
        
                {/* ── Balance Hero ── */}    
                <div style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.2) 0%, rgba(0,229,160,0.1) 100%)', border: '1px solid rgba(124,92,255,0.35)', borderRadius: '20px', padding: '32px 36px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>    
                  <div>    
                    <div style={{ fontSize: '0.85rem', color: 'var(--clr-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Current Balance</div>    
                    <div style={{ fontSize: '3.2rem', fontWeight: 900, color: parseFloat(wallet?.balance || 0) >= 0 ? '#00E5A0' : '#FF6B6B', lineHeight: 1 }}>₹{parseFloat(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>    
                    <div style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', marginTop: 8 }}>Last updated: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString('en-IN') : '—'}</div>    
                  </div>    
                  {/* Action Buttons */}    
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>    
                    {[    
                      { id: 'deposit', label: '💰 Deposit', color: '#00E5A0', bg: 'rgba(0,229,160,0.15)', border: 'rgba(0,229,160,0.4)', show: true },    
                      { id: 'withdraw', label: '📤 Withdraw', color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', border: 'rgba(255,107,107,0.4)', show: true },    
                      { id: 'give_admin', label: '👨‍💼 Give to Admin', color: '#7C5CFF', bg: 'rgba(124,92,255,0.15)', border: 'rgba(124,92,255,0.4)', show: user?.role === 'owner' },    
                      { id: 'give_sup', label: '👔 Give to Supervisor', color: '#FFBD59', bg: 'rgba(255,189,89,0.15)', border: 'rgba(255,189,89,0.4)', show: ['owner', 'admin'].includes(user?.role) },    
                      { id: 'give_guard', label: '🛡️ Give to Guard', color: '#5B8CFF', bg: 'rgba(91,140,255,0.15)', border: 'rgba(91,140,255,0.4)', show: true },    
                    ].filter(b => b.show).map(btn => (    
                      <button key={btn.id} onClick={() => { resetWalletForm(); setWalletModal(btn.id) }} style={{ padding: '10px 18px', borderRadius: '12px', border: `1px solid ${btn.border}`, background: btn.bg, color: btn.color, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.2s' }}    
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}    
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}    
                      >{btn.label}</button>    
                    ))}    
                  </div>    
                </div>    
        
                {/* ── Transaction History ── */}    
                <div className="card glass-card">    
                  <div className="card-header" style={{ marginBottom: 0 }}>    
                    <div><div className="card-title">📄 Transaction History</div><div className="card-sub">All wallet activity — bank statement style</div></div>    
                  </div>    
                  <div style={{ overflowX: 'auto' }}>    
                    <table className="table" style={{ minWidth: 700 }}>    
                      <thead>    
                        <tr>    
                          <th>Date & Time</th>    
                          <th>Type</th>    
                          <th>Description</th>    
                          <th>Source / Account</th>    
                          <th style={{ textAlign: 'right' }}>Amount</th>    
                          <th style={{ textAlign: 'right' }}>Balance After</th>    
                        </tr>    
                      </thead>    
                      <tbody>    
                        {(wallet?.transactions || []).length === 0 ? (    
                          <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-muted)' }}>No transactions yet. Make your first deposit to get started.</td></tr>    
                        ) : (    
                          (wallet?.transactions || []).map(txn => {    
                            const isCredit = ['deposit', 'transfer_in'].includes(txn.txn_type)    
                            const typeConfig = {    
                              deposit:         { label: 'Deposit',        color: '#00E5A0', icon: '💰' },    
                              withdraw:        { label: 'Withdraw',       color: '#FF6B6B', icon: '📤' },    
                              give_guard:      { label: 'Guard Advance',  color: '#5B8CFF', icon: '🛡️' },    
                              give_supervisor: { label: 'To Supervisor',  color: '#FFBD59', icon: '👔' },    
                              give_admin:      { label: 'To Admin',       color: '#7C5CFF', icon: '👨‍💼' },    
                              transfer_in:     { label: 'Received',       color: '#00E5A0', icon: '⬇️' },    
                              transfer_out:    { label: 'Sent',           color: '#FF6B6B', icon: '⬆️' },    
                              fuel:            { label: 'Fuel',           color: '#FFA940', icon: '⛽' },    
                              salary_deduct:   { label: 'Salary Deduct',  color: '#FF6B6B', icon: '📉' },    
                            }[txn.txn_type] || { label: txn.txn_type, color: '#fff', icon: '💱' }    
                            return (    
                              <tr key={txn.id} style={{ background: isCredit ? 'rgba(0,229,160,0.03)' : 'rgba(255,107,107,0.03)' }}>    
                                <td style={{ fontSize: '0.8rem', color: 'var(--clr-muted)', whiteSpace: 'nowrap' }}>{new Date(txn.created_at).toLocaleString('en-IN')}</td>    
                                <td><span style={{ background: `${typeConfig.color}20`, color: typeConfig.color, border: `1px solid ${typeConfig.color}40`, borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{typeConfig.icon} {typeConfig.label}</span></td>    
                                <td style={{ fontSize: '0.85rem', maxWidth: 220 }}>    
                                  <div style={{ fontWeight: 500 }}>{txn.note || '—'}</div>    
                                  {txn.related_guard_name && <div style={{ fontSize: '0.72rem', color: '#5B8CFF' }}>→ {txn.related_guard_name}</div>}    
                                  {txn.related_user_name  && <div style={{ fontSize: '0.72rem', color: '#FFBD59' }}>↔ {txn.related_user_name}</div>}    
                                </td>    
                                <td style={{ fontSize: '0.8rem', color: 'var(--clr-muted)' }}>    
                                  {txn.source === 'bank' ? <span style={{ color: '#5B8CFF' }}>🏦 {txn.bank_account_name || 'Bank'}</span> : <span>💵 Cash</span>}    
                                </td>    
                                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: isCredit ? '#00E5A0' : '#FF6B6B', whiteSpace: 'nowrap' }}>    
                                  {isCredit ? '+' : '−'}₹{parseFloat(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}    
                                </td>    
                                <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>₹{parseFloat(txn.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>    
                              </tr>    
                            )    
                          })    
                        )}    
                      </tbody>    
                    </table>    
                  </div>    
                </div>    
              </div>    
  );
}
