import React, { useState, useRef } from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import AssignmentsTab from '../../features/owner/AssignmentsTab';
import { AssignGuardModal, TransferModal } from './modals';
import api from '../../services/api';
import { X } from 'lucide-react';

export default function AssignmentsPage() {
  const { 
    stats, sites, guards, 
    fetchGuards, fetchStats, 
    toggleDuty, showToast
  } = useOwnerData();

  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [guardAssignmentStatusFilter, setGuardAssignmentStatusFilter] = useState('all');
  const [assignModal, setAssignModal] = useState({ open: false, shift: null, site: null });
  const [overtimeModal, setOvertimeModal] = useState(null);
  const [overtimeShiftId, setOvertimeShiftId] = useState('');
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [showTransferGuard, setShowTransferGuard] = useState(null);

  const logOvertimeShift = async () => {
    if (!overtimeShiftId || !overtimeModal) return;
    setOvertimeLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.post('/company/attendance/', {
        guard:       overtimeModal.guard.id,
        site:        overtimeModal.guard.site,
        shift:       parseInt(overtimeShiftId),
        date:        today,
        status:      'present',
        is_overtime: true,
        notes:       `Overtime shift logged by manager`
      });
      showToast(`✅ Overtime shift logged for ${overtimeModal.guard.name}`);
      setOvertimeModal(null);
      setOvertimeShiftId('');
      fetchGuards();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Already logged for this shift'}`);
    } finally { setOvertimeLoading(false); }
  };

  const handleTransfer = async (guardId, transferData) => {
    try {
      await api.patch(`/company/guards/${guardId}/`, {
        site: transferData.site,
        shift: transferData.shift,
        guard_type: transferData.guard_type
      });
      
      const res = await api.post(`/company/guards/${guardId}/toggle-duty/`);
      const newStatus = res.data.is_on_duty;
      if (newStatus) {
        showToast(`✅ Transferred & Marked ON DUTY`);
      } else {
        const overtime = res.data.overtime;
        showToast(overtime ? `⏰ Marked PRESENT (Late Checkout)` : `🔴 Transferred & Marked OFF DUTY (Present)`);
      }
      
      setShowTransferGuard(null);
      fetchGuards();
      fetchStats();
    } catch (err) {
      showToast(`❌ Transfer failed: ${err.response?.data?.detail || 'Unknown error'}`);
    }
  };

  const handleAssignGuard = async ({ guardId, guardType }) => {
    try {
      await api.post(`/company/guards/${guardId}/assign/`, {
        site: assignModal.site.id,
        shift: assignModal.shift.id,
        guard_type: guardType
      });
      showToast('✅ Guard assigned successfully');
      setAssignModal({ open: false, shift: null, site: null });
      fetchGuards();
      fetchStats();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Assignment failed'}`);
    }
  };

  const handleToggleDuty = async (id) => {
    const result = await toggleDuty(id);
    if (result && result.capacityError) {
      setShowTransferGuard(id);
    }
  };

  return (
    <>
      <AssignmentsTab
        stats={stats}
        sites={sites}
        guards={guards}
        assignmentFilter={assignmentFilter}
        setAssignmentFilter={setAssignmentFilter}
        guardAssignmentStatusFilter={guardAssignmentStatusFilter}
        setGuardAssignmentStatusFilter={setGuardAssignmentStatusFilter}
        setConfirmDelete={() => {}}
        toggleDuty={handleToggleDuty}
        setAssignModal={setAssignModal}
        setOvertimeModal={setOvertimeModal}
      />

      {assignModal.open && (
        <AssignGuardModal 
          isOpen={assignModal.open}
          shift={assignModal.shift}
          site={assignModal.site}
          guards={guards}
          onAssign={handleAssignGuard}
          onCancel={() => setAssignModal({ open: false, shift: null, site: null })}
        />
      )}

      {showTransferGuard && (
        <TransferModal 
          isOpen={!!showTransferGuard}
          guard={guards.find(g => g.id === showTransferGuard)}
          sites={sites}
          guards={guards}
          bankAccounts={[]}
          onTransfer={(id, data) => handleTransfer(id, data)}
          onCancel={() => setShowTransferGuard(null)}
        />
      )}

      {overtimeModal && (
        <div className="modal-overlay" onClick={() => setOvertimeModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0 }}>🕐 Log Overtime Shift</h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--clr-muted)', marginTop: 4 }}>
                  Guard: <strong>{overtimeModal.guard.name}</strong>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setOvertimeModal(null)}><X size={18}/></button>
            </div>
            <div style={{ background: 'rgba(255,169,64,0.08)', border: '1px solid rgba(255,169,64,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: '0.8rem', color: '#FFA940' }}>
              ⚠️ This logs an <strong>extra shift</strong> for today. Salary will include an additional 1× daily rate.
            </div>
            <div className="form-group">
              <label className="form-label">Select Overtime Shift *</label>
              <select className="form-input" style={{ color: '#fff' }} value={overtimeShiftId} onChange={e => setOvertimeShiftId(e.target.value)}>
                <option value="" style={{ background: '#1e202d', color: '#fff' }}>— Choose Shift —</option>
                {(overtimeModal.site.shifts || [])
                  .filter(sh => sh.id !== overtimeModal.guard.shift)
                  .map(sh => (
                    <option key={sh.id} value={sh.id} style={{ background: '#1e202d', color: '#fff' }}>{sh.name} ({sh.start_time?.slice(0,5)} – {sh.end_time?.slice(0,5)})</option>
                  ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setOvertimeModal(null)}>Cancel</button>
              <button
                className="btn btn-primary btn-glow"
                style={{ flex: 1, background: 'linear-gradient(135deg, #FFA940, #e8890a)' }}
                onClick={logOvertimeShift}
                disabled={!overtimeShiftId || overtimeLoading}
              >
                {overtimeLoading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/> : '🕐 Log Overtime'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
