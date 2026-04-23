export const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const agencyCreationYear = 2024;

export function format12h(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

export function isSiteOpen(site) {
  if (!site?.shifts?.length) return { isOpen: false, activeShift: null }
  const now = new Date()
  const curMin = now.getHours() * 60 + now.getMinutes()
  for (const shift of site.shifts) {
    if (!shift.start_time || !shift.end_time) continue
    const [sH, sM] = shift.start_time.split(':').map(Number)
    const [eH, eM] = shift.end_time.split(':').map(Number)
    const startMin = sH * 60 + sM
    const endMin = eH * 60 + eM
    const isOvernight = endMin < startMin
    const live = isOvernight
      ? (curMin >= startMin || curMin <= endMin)
      : (curMin >= startMin && curMin <= endMin)
    if (live) return { isOpen: true, activeShift: shift }
  }
  return { isOpen: false, activeShift: null }
}

export const formatCurrency = (val) => {
  const num = parseFloat(val || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  return `₹${num.toLocaleString('en-IN')}`;
};

export const formatFullCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export const typeLabel = { 
  flat: '🏠 Flat', 
  bunglow: '🏡 Bunglow', 
  company: '🏢 Company', 
  other: '📍 Other' 
};

export const checkPasswordStrength = (p) => {
  if (!p) return { score: 0, label: 'None', color: 'rgba(255,255,255,0.05)', width: '0%' }
  let s = 0
  if (p.length > 5) s++
  if (/[0-9]/.test(p)) s++
  if (/[A-Z]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  
  const levels = [
    { score: 0, label: 'Too Short', color: '#ff4d6d', width: '25%' },
    { score: 1, label: 'Weak',     color: '#ff4d6d', width: '25%' },
    { score: 2, label: 'Fair',     color: '#ffa940', width: '50%' },
    { score: 3, label: 'Good',     color: '#5b8cff', width: '75%' },
    { score: 4, label: 'Strong',   color: '#00e5a0', width: '100%' },
  ]
  return levels[s]
};




