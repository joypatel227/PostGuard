import React, { useState, useEffect, useCallback } from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import api from '../../services/api';
import { formatCurrency, format12h } from '../../utils/helpers';
import { 
  IndianRupee, Calendar, Search, Filter, AlertTriangle, 
  CheckCircle, FileText, Download, Building, MapPin
} from 'lucide-react';


export default function SalaryPage() {
  const { 
    sites, guards, bankAccounts, 
    fetchBankAccounts, fetchBankStats, showToast 
  } = useOwnerData();

  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaries, setSalaries] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [payingSalary, setPayingSalary] = useState(null);
  const [undoingSalary, setUndoingSalary] = useState(null);
  const [search, setSearch] = useState('');

  

    const fetchSalaries = useCallback(async (m, y) => { 
    try { 
      setSalaryLoading(true); 
      const targetM = m || salaryMonth;
      const targetY = y || salaryYear;
      const r = await api.get(`/salary/?month=${targetM}&year=${targetY}`); 
      setSalaries(r.data); 
    } catch {} finally { setSalaryLoading(false); } 
  }, [salaryMonth, salaryYear])

  const handleUndoPayout = async (record) => {  
      try {  
        await api.post(`/salary/${record.id}/undo/`)  
        showToast('✅ Last payment undone and restored')  
        setUndoingSalary(null)  
        fetchSalaries()  
        fetchBankStats()  
        fetchBankAccounts()  
      } catch (err) {  
        showToast(`❌ ${err.response?.data?.detail || 'Failed to undo payment'}`)  
      }  
    }  

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries, salaryMonth, salaryYear]);

  return (
              <div className="tab-content animate-fadeIn">    
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>    
                  <div style={{ flex: 1, minWidth: '200px' }}>    
                    <h1>💰 Salary Manager</h1>    
                    <p>Track earnings, OT, and payouts for your staff</p>    
                  </div>    
        
                  <div className="search-input-wrap" style={{ flex: 1, maxWidth: '400px', margin: '0 auto' }}>    
                    <Search size={16} className="search-icon" />    
                    <input type="text" className="search-input" placeholder="Search staff..." value={salarySearch} onChange={e => setSalarySearch(e.target.value)} />    
                  </div>    
                      
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>    
                    {/* Year/Month Selection with Agency-Creation boundary & No Future Dates */}    
                    {(() => {    
                      const now = new Date()    
                      const curY = now.getFullYear()    
                      const curM = now.getMonth() + 1    
                          
                      const start = stats.agency_created_at ? new Date(stats.agency_created_at) : new Date()    
                      const startY = start.getFullYear()    
                      const startM = start.getMonth() + 1    
        
                      const years = []    
                      for (let y = startY; y <= curY; y++) years.push(y)    
        
                      const months = [    
                        { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },    
                        { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },    
                        { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },    
                        { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' }    
                      ].filter(m => {    
                        // Start Year constraint    
                        if (salaryYear === startY && m.v < startM) return false    
                        // Future Month constraint    
                        if (salaryYear === curY && m.v > curM) return false    
                        return true    
                      })    
        
                      return (    
                        <>    
                          <select className="form-input" style={{ width: '130px', color: '#fff' }} value={salaryMonth} onChange={e => setSalaryMonth(parseInt(e.target.value))}>    
                            {months.map(m => (    
                              <option key={m.v} value={m.v} style={{ background: '#1e202d', color: '#fff' }}>{m.l}</option>    
                            ))}    
                          </select>    
                          <select className="form-input" style={{ width: '100px', color: '#fff' }} value={salaryYear} onChange={e => {    
                            const newY = parseInt(e.target.value)    
                            setSalaryYear(newY)    
                            // If switching to start year and current month is before startMonth, reset month    
                            if (newY === startY && salaryMonth < startM) setSalaryMonth(startM)    
                            // If switching to current year and current month is after curMonth, reset month    
                            if (newY === curY && salaryMonth > curM) setSalaryMonth(curM)    
                          }}>    
                            {years.map(y => (    
                              <option key={y} value={y} style={{ background: '#1e202d', color: '#fff' }}>{y}</option>    
                            ))}    
                          </select>    
                        </>    
                      )    
                    })()}    
                  </div>    
                </div>    
        
                <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>    
                  <div className="stat-card glass-card" style={{ padding: '20px' }}>    
                    <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Monthly Cost</div>    
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B6B' }}>₹{salaries.reduce((acc, s) => acc + parseFloat(s.amount_earned), 0).toLocaleString('en-IN')}</div>    
                  </div>    
                  <div className="stat-card glass-card" style={{ padding: '20px' }}>    
                    <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Paid</div>    
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00E5A0' }}>₹{salaries.reduce((acc, s) => acc + parseFloat(s.amount_paid), 0).toLocaleString('en-IN')}</div>    
                  </div>    
                  <div className="stat-card glass-card" style={{ padding: '20px' }}>    
                    <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Total Pending</div>    
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFA940' }}>₹{salaries.reduce((acc, s) => acc + parseFloat(s.total_due), 0).toLocaleString('en-IN')}</div>    
                  </div>    
                  <div className="stat-card glass-card" style={{ padding: '20px' }}>    
                    <div style={{ fontSize: '0.78rem', color: 'var(--clr-muted)', marginBottom: '8px' }}>Active Staff</div>    
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#5B8CFF' }}>{salaries.length}</div>    
                  </div>    
                </div>    
        
                <div className="card glass-card" style={{ padding: 0, overflow: 'auto' }}>    
                  <div className="table-wrap">    
                    {salaryLoading ? <div style={{ padding: '100px', textAlign: 'center' }}><div className="spinner"></div></div> :    
                    salaries.length === 0    
                      ? <div className="empty-state"><div className="empty-icon" style={{ opacity: 0.2 }}><Banknote size={60} /></div><p>No salary records found for this period.</p></div>    
                      : <table style={{ minWidth: '1000px', width: '100%' }}>    
                          <thead>    
                            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>    
                              <th style={{ padding: '16px 20px', textAlign: 'left' }}>GUARD</th>    
                              <th style={{ textAlign: 'left' }}>SALARY / DAY RATE</th>    
                              <th style={{ textAlign: 'left' }}>ATTENDANCE</th>    
                              <th style={{ textAlign: 'left' }}>EARNED</th>    
                              <th style={{ textAlign: 'left', color: '#FFBD59' }}>WALLET</th>    
                              <th style={{ textAlign: 'left' }}>PAID</th>    
                              <th style={{ textAlign: 'left', color: '#FF6B6B' }}>NET DUE (THIS MONTH)</th>    
                              <th style={{ textAlign: 'left' }}>LAST PAID</th>    
                              <th style={{ textAlign: 'right', paddingRight: '20px' }}>ACTION</th>    
                            </tr>    
                          </thead>    
                          <tbody>    
                            {salaries.filter(s => {    
                              if (!salarySearch) return true    
                              const term = salarySearch.toLowerCase()    
                              return (s.guard_name || '').toLowerCase().includes(term) || (s.guard_phone || '').includes(term)    
                            }).map(s => {    
                              const monthRem   = parseFloat(s.amount_remaining ?? 0)    
                              const dailyRate  = parseFloat(s.daily_rate ?? 0)    
                              const totalDays  = s.total_days || 30    
                              const otShifts = parseInt(s.notes?.match(/Overtime shifts: (\d+)/)?.[1] || '0')    
                              const isFullyPaid = monthRem <= 0    
                              return (    
                              <tr key={s.id} className="table-row-hover">    
        
                                {/* Guard name + site */}    
                                <td style={{ padding: '14px 20px' }}>    
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>    
                                    {av(s.guard_name)}    
                                    <div>    
                                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.guard_name}</div>    
                                      <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{s.site_name || 'Unassigned'}</div>    
                                      {s.guard_phone && <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)' }}>{s.guard_phone}</div>}    
                                    </div>    
                                  </div>    
                                </td>    
        
                                {/* Salary / daily rate  */}    
                                <td>    
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{parseFloat(s.monthly_salary).toLocaleString('en-IN')}<span style={{ fontWeight: 400, color: 'var(--clr-muted)', fontSize: '0.7rem' }}>/mo</span></div>    
                                  <div style={{ fontSize: '0.72rem', color: '#7C5CFF', fontWeight: 600, marginTop: '2px' }}>₹{dailyRate.toFixed(2)} <span style={{ color: 'var(--clr-muted)', fontWeight: 400 }}>÷ {totalDays} days</span></div>    
                                </td>    
        
                                {/* Attendance */}    
                                <td>    
                                  <div style={{ fontSize: '0.88rem' }}>Present: <strong>{s.days_present}</strong></div>    
                                  <div style={{ fontSize: '0.7rem', color: 'var(--clr-muted)', marginTop: '2px' }}>Absent: {s.days_absent}</div>    
                                  {otShifts > 0 && <div style={{ fontSize: '0.7rem', color: '#7C5CFF', fontWeight: 600 }}>OT: {otShifts} shifts</div>}    
                                </td>    
        
                                {/* Earned */}    
                                <td>    
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>₹{parseFloat(s.amount_earned).toLocaleString('en-IN')}</div>    
                                  <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{s.days_present} days × ₹{dailyRate.toFixed(0)}</div>    
                                </td>    
        
                                {/* Wallet Advance */}    
                                <td>    
                                  {parseFloat(s.advance_given || 0) > 0 ? (    
                                    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, padding: '4px 8px', background: 'rgba(255,189,89,0.12)', border: '1px solid rgba(255,189,89,0.3)', borderRadius: 8 }}>    
                                      <div style={{ fontWeight: 800, color: '#FFBD59', fontSize: '0.9rem' }}>₹{parseFloat(s.advance_given).toLocaleString('en-IN')}</div>    
                                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,189,89,0.7)' }}>💼 Wallet Advance</div>    
                                    </div>    
                                  ) : (    
                                    <span style={{ fontSize: '0.75rem', color: 'var(--clr-muted)' }}>—</span>    
                                  )}    
                                </td>    
        
                                {/* Already paid */}    
                                <td>    
                                  <div style={{ fontWeight: 700, color: '#00E5A0', fontSize: '0.9rem' }}>₹{parseFloat(s.amount_paid).toLocaleString('en-IN')}</div>    
                                </td>    
        
                                {/* Month-wise Due → remaining */}    
                                <td>    
                                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: monthRem < 0 ? '#5B8CFF' : (monthRem === 0 ? '#00E5A0' : '#FF6B6B') }}>    
                                    {monthRem < 0 ? `−₹${Math.abs(monthRem).toLocaleString('en-IN')}` : (monthRem === 0 ? '₹0' : `₹${monthRem.toLocaleString('en-IN')}`)}    
                                  </div>    
                                  {monthRem < 0 && <div style={{ fontSize: '0.65rem', color: '#5B8CFF', marginTop: '2px', fontWeight: 600 }}>Advance Given</div>}    
                                </td>    
        
                                {/* Last paid */}    
                                <td>    
                                  <div style={{ fontSize: '0.82rem' }}>    
                                    {s.paid_at ? new Date(s.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : <span style={{ color: 'var(--clr-muted)' }}>Never</span>}    
                                  </div>    
                                  {s.paid_at && <div style={{ fontSize: '0.65rem', color: 'var(--clr-muted)', marginTop: '2px' }}>{s.days_since_last_paid} days ago</div>}    
                                </td>    
        
                                {/* Pay button */}    
                                <td style={{ textAlign: 'right', paddingRight: '20px' }}>    
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>    
                                    {parseFloat(s.amount_paid) > 0 && (    
                                      <button    
                                        title="Undo last payment"    
                                        onClick={() => setUndoingSalary(s)}    
                                        style={{    
                                          padding: '8px',    
                                          background: 'rgba(255,255,255,0.05)',    
                                          border: '1px solid rgba(255,255,255,0.1)',    
                                          borderRadius: '10px',    
                                          color: 'var(--clr-muted)',    
                                          cursor: 'pointer',    
                                          display: 'flex',    
                                          alignItems: 'center',    
                                          justifyContent: 'center',    
                                          transition: 'all 0.2s'    
                                        }}    
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.borderColor = 'rgba(255,107,107,0.3)' }}    
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--clr-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}    
                                      >    
                                        <RotateCcw size={16} />    
                                      </button>    
                                    )}    
                                    <button    
                                      className="btn"    
                                      style={{    
                                        padding: '8px 16px',    
                                        fontSize: '0.82rem',    
                                        fontWeight: 700,    
                                        background: isFullyPaid ? 'rgba(0,229,160,0.08)' : 'linear-gradient(135deg,#FF6B6B,#FF8C42)',    
                                        color: isFullyPaid ? '#00E5A0' : '#fff',    
                                        border: isFullyPaid ? '1px solid rgba(0,229,160,0.25)' : 'none',    
                                        borderRadius: '10px',    
                                        cursor: isFullyPaid ? 'default' : 'pointer',    
                                        whiteSpace: 'nowrap',    
                                      }}    
                                      onClick={() => !isFullyPaid && setPayingSalary(s)}    
                                      disabled={isFullyPaid}    
                                    >    
                                      {isFullyPaid ? '✅ Paid' : '💵 Pay Now'}    
                                    </button>    
                                  </div>    
                                </td>    
                              </tr>    
                            )})}    
                          </tbody>    
                        </table>}    
                  </div>    
                </div>    
        
                <SalaryPayModal    
                  isOpen={!!payingSalary}    
                  record={payingSalary}    
                  bankAccounts={bankAccounts}    
                  onCancel={() => setPayingSalary(null)}    
                  showToast={showToast}    
                  onPay={async (payload) => {    
                    try {    
                      await api.post(`/salary/${payingSalary.id}/pay/`, payload)    
                      showToast('✅ Salary payment recorded')    
                      setPayingSalary(null)    
                      fetchSalaries()    
                      fetchBankStats()    
                      fetchBankAccounts()    
                    } catch (err) {    
                      showToast(`❌ ${err.response?.data?.detail || 'Payment failed'}`)    
                    }    
                  }}    
                />    
              </div>    
  );
}
