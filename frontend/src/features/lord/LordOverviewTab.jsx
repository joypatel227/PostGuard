import React from 'react';
import { ArrowUpRight, Key, Users as UsersIcon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

export default function LordOverviewTab({
  agencyCount,
  totalNetwork,
  liveNetwork,
  liveUserList,
  trends,
  setTab
}) {
  return (
    <div className="tab-content animate-fadeIn">
      <div className="page-header">
        <h1>⚡ Lord Dashboard</h1>
        <p>Full control over the PostGuard platform</p>
      </div>
      
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {[
          { label: 'Total Agencies', value: agencyCount, color: '#5B8CFF', data: trends.agencies },
          { label: 'Total Network', value: totalNetwork, color: '#7C5CFF', data: trends.users },
          { label: 'Live Now', value: liveNetwork, color: '#00E5A0', isLive: true, data: trends.live, sub: liveUserList }
        ].map((stat, i) => (
          <div key={i} className="stat-card glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">
                  {stat.label}
                  {stat.isLive && (
                    <span className="live-indicator-dot pulsing" style={{ marginLeft: '8px', display: 'inline-block', width: '8px', height: '8px', background: '#00E5A0', borderRadius: '50%' }} />
                  )}
                </div>
                <div className="stat-value count-up-pop" key={stat.value} style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '8px', display: 'inline-block' }}>
                  {stat.value}
                </div>
                {stat.isLive && stat.sub && stat.sub.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex' }}>
                      {stat.sub.map((u, idx) => (
                        <div key={u.id} title={`${u.name} (${u.role})`} style={{ 
                          width: '24px', height: '24px', 
                          borderRadius: '50%', background: 'var(--grad-primary)', 
                          border: '2px solid var(--clr-bg)', marginLeft: idx === 0 ? 0 : '-8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff'
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <small style={{ color: 'var(--clr-muted)', fontSize: '0.75rem' }}>
                      {stat.sub.length === 1 ? '1 user is online' : `${stat.sub.length} users are online`}
                    </small>
                  </div>
                )}
              </div>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <ArrowUpRight size={20} style={{ color: stat.color }} />
              </div>
            </div>
            <div style={{ flex: 1, marginTop: '16px', minHeight: '60px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stat.data && stat.data.length > 0 ? stat.data : []}>
                  <defs>
                    <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={stat.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={stat.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={stat.color} 
                    strokeWidth={2.5} 
                    fill={`url(#grad-${i})`} 
                    isAnimationActive={true}
                    dot={{ r: 0 }}
                    activeDot={{ r: 4, fill: stat.color, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Tooltip 
                    cursor={{ stroke: stat.color, strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass-card" style={{ padding: '4px 8px', fontSize: '0.75rem', border: `1px solid ${stat.color}`, backdropFilter: 'blur(10px)' }}>
                            {payload[0].value}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="card glass-card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Quick Actions</div>
            <div className="card-sub">Common platform management tasks</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button className="pill-btn btn-glow" onClick={() => setTab('codes')}>
            <Key size={18} /> Generate Owner Code
          </button>
          <button className="pill-btn btn-glow" onClick={() => setTab('admins')}>
            <UsersIcon size={18} /> View All Owners
          </button>
        </div>
      </div>
    </div>
  );
}
