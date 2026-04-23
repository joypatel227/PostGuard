import React from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import api from '../../services/api';
import { ClipboardList, CheckCircle, X } from 'lucide-react';

export default function JoinRequestsPage() {
  const { 
    stats, requests, fetchRequests, fetchStats, showToast
  } = useOwnerData();

    const approveReq = async (id) => {  
      try { await api.post(`/auth/join-requests/${id}/approve/`); showToast('✅ Approved!'); fetchRequests(); fetchStats() } catch (err) { showToast(`❌ ${err.response?.data?.detail || 'Failed'}`) }  
    }  
    const rejectReq = async (id) => {  
      try { await api.post(`/auth/join-requests/${id}/reject/`); showToast('🚫 Rejected'); fetchRequests() } catch { showToast('❌ Failed') }  
    }  

  const av = (name, size = 36) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );

  return (
    <div className="tab-content animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1><ClipboardList size={28} style={{ verticalAlign: 'middle', marginRight: 10 }} />Join Requests</h1>
          <p>Review staff trying to join your agency</p>
        </div>
      </div>

      <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ opacity: 0.2 }}><ClipboardList size={60} /></div>
              <p>No pending join requests.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '18px 24px' }}>USER</th>
                  <th>CONTACT</th>
                  <th>REQUEST DATE</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="table-row-hover">
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {av(r.name)}
                        <div>
                          <strong>{r.name}</strong>
                          <div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>
                            Requesting: <span style={{textTransform: 'capitalize'}}>{r.requested_role}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{r.email}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--clr-muted)' }}>{r.phone}</div>
                    </td>
                    <td style={{ color: 'var(--clr-muted)', fontSize: '0.85rem' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn-icon" onClick={() => approveReq(r.id)} style={{ color: '#00E5A0' }} title="Approve">
                          <CheckCircle size={20} />
                        </button>
                        <button className="btn-icon" onClick={() => rejectReq(r.id)} style={{ color: '#FF6B6B' }} title="Reject">
                          <X size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
