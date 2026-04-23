import React from 'react';
import { Search, Plus, Building2, X } from 'lucide-react';

export default function AgenciesTab({
  agencies,
  search,
  setSearch,
  setShowAddAgency,
  renderAvatar,
  admins,
  openMenu,
  setOpenMenu,
  handleDeleteAgency
}) {
  return (
    <div className="tab-content animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>🏢 Agencies</h1>
          <p>Registered agencies on the platform</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search agencies..." 
              className="search-input" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-glow" onClick={() => setShowAddAgency(true)}>
            <Plus size={18} /> Add Agency
          </button>
        </div>
      </div>

      <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          {agencies.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ opacity: 0.2 }}><Building2 size={64} /></div>
              <p>No agencies found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '20px 24px' }}>AGENCY NAME</th>
                  <th>CREATED AT</th>
                  <th style={{ width: 150 }}>TOTAL OWNERS</th>
                  <th style={{ width: 80, textAlign: 'right', paddingRight: '24px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {agencies
                  .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
                  .map(a => (
                  <tr key={a.id} className="table-row-hover">
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {renderAvatar(a.name)}
                        <strong style={{ fontSize: '1rem' }}>{a.name}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--clr-muted)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="badge badge-admin" style={{ opacity: 0.8 }}>
                        {admins.filter(ow => ow.agency_id === a.id).length} Owners
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ position: 'relative' }}>
                        <button 
                          className="btn-icon" 
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `ag-${a.id}` ? null : `ag-${a.id}`) }}
                        >
                          ⋮
                        </button>
                        {openMenu === `ag-${a.id}` && (
                          <div className="dropdown-menu glass-card animate-fadeIn" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: '180px' }}>
                            <button onClick={() => handleDeleteAgency(a.id)} style={{ color: 'var(--clr-danger)', padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <X size={14} /> Delete Agency
                            </button>
                          </div>
                        )}
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
