import React from 'react';
import { useOwnerData } from '../../contexts/OwnerDataContext';
import { BarChart2, TrendingUp, IndianRupee, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { isSiteOpen } from '../../utils/helpers';
import api from '../../services/api';

const PIE_COLORS = ['#00E5A0', '#FF6B6B', '#FFA940', '#7C5CFF', '#5B8CFF'];

export default function AnalysisPage() {
  const { stats, bankStats, sites = [], guards = [], wallet, fetchGuards, showToast } = useOwnerData();

  const totalRevenue = sites.reduce((sum, site) => sum + parseFloat(site.monthly_amount || 0), 0);
  const totalSalary = guards.reduce((sum, g) => sum + parseFloat(g.monthly_salary || 0), 0);

  return (
                  <div className="tab-content animate-fadeIn">        
                    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>        
                      <div>        
                        <h1>📈 Business Analysis</h1>        
                        <p>Operational & financial overview for {stats.agency_name}</p>        
                      </div>        
                      <div style={{ fontSize: '0.75rem', color: 'var(--clr-muted)', textAlign: 'right' }}>        
  );
}
