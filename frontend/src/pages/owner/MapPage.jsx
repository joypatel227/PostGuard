import React from 'react';

export default function MapPage() {
  return (
              <div className="tab-content animate-fadeIn">    
                <div className="page-header"><h1>🗺️ Live Map</h1><p>Real-time supervisor & guard locations</p></div>    
                <div className="card glass-card" style={{ textAlign: 'center', padding: '80px 40px' }}>    
                  <div style={{ fontSize: '5rem', marginBottom: '24px' }}>🗺️</div>    
                  <h2 style={{ marginBottom: '12px' }}>Live Map — Coming Soon</h2>    
                  <p style={{ color: 'var(--clr-muted)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.8 }}>GPS-based live tracking for supervisors and site-based guard positions will be available in the next release.</p>    
                </div>    
              </div>    
  );
}
