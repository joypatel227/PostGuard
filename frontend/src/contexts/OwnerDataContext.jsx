import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const OwnerDataContext = createContext();

export function OwnerDataProvider({ children }) {
  const [stats, setStats]             = useState({})
  const [sites, setSites]             = useState([])
  const [guards, setGuards]           = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [admins, setAdmins]           = useState([])
  const [codes, setCodes]             = useState([])
  const [wallet, setWallet]           = useState(null)
  const [requests, setRequests]       = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [bankStats, setBankStats]       = useState([])
  const [bankTxns, setBankTxns]         = useState([])
  const [bankStatement, setBankStatement] = useState(null)  // full statement response
  const [activeBankId, setActiveBankId] = useState(null)
  const [txnDateRange, setTxnDateRange] = useState(() => {
  const [showAddBank, setShowAddBank]   = useState(false)
  const [editBankData, setEditBankData] = useState(null)
  const [salaries, setSalaries]         = useState([])
  const [salaryMonth, setSalaryMonth]   = useState(new Date().getMonth() + 1)
  const [salaryYear, setSalaryYear]     = useState(new Date().getFullYear())
  const [salaryLoading, setSalaryLoading] = useState(false)
  const [showAddSup, setShowAddSup]       = useState(false)
  const [showAddAdmin, setShowAddAdmin]   = useState(false)
  const [showAddGuard, setShowAddGuard]   = useState(false)
  const [showAddSite, setShowAddSite]     = useState(false)
  const [showAddClient, setShowAddClient] = useState(null) // Holds siteId
  const [showWhatsApp, setShowWhatsApp]   = useState(false)
  const [showTransferGuard, setShowTransferGuard] = useState(null)
  const [editSiteData, setEditSiteData]   = useState(null)
  const [editGuardData, setEditGuardData] = useState(null)
  const [invoiceSite, setInvoiceSite]     = useState(null)
  const [viewingHistorySite, setViewingHistorySite] = useState(null)
  const [genLoading, setGenLoading]       = useState(false)
  const [payingSalary, setPayingSalary] = useState(null)
  const [undoingSalary, setUndoingSalary] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)

  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

    const fetchStats   = useCallback(async () => { try { const r = await api.get('/auth/owner-stats/'); setStats(r.data) } catch {} }, [])
    const fetchSites   = useCallback(async () => { try { const r = await api.get('/company/sites/'); setSites(r.data) } catch {} }, [])
    const fetchSites   = useCallback(async () => { try { const r = await api.get('/company/sites/'); setSites(r.data) } catch {} }, [])
    const fetchGuards  = useCallback(async () => { try { const r = await api.get('/company/guards/'); setGuards(r.data) } catch {} }, [])
    const fetchGuards  = useCallback(async () => { try { const r = await api.get('/company/guards/'); setGuards(r.data) } catch {} }, [])
    const fetchSups    = useCallback(async () => { try { const r = await api.get('/auth/agency-users/?role=supervisor'); setSupervisors(r.data) } catch {} }, [])
    const fetchSups    = useCallback(async () => { try { const r = await api.get('/auth/agency-users/?role=supervisor'); setSupervisors(r.data) } catch {} }, [])
    const fetchAdmins  = useCallback(async () => { try { const r = await api.get('/auth/agency-users/?role=admin'); setAdmins(r.data) } catch {} }, [])
    const fetchAdmins  = useCallback(async () => { try { const r = await api.get('/auth/agency-users/?role=admin'); setAdmins(r.data) } catch {} }, [])
    const fetchCodes   = useCallback(async () => { try { const r = await api.get('/auth/my-codes/'); setCodes(r.data) } catch {} }, [])
    const fetchCodes   = useCallback(async () => { try { const r = await api.get('/auth/my-codes/'); setCodes(r.data) } catch {} }, [])
    const fetchWallet  = useCallback(async () => { try { const r = await api.get('/wallet/my/'); setWallet(r.data) } catch {} }, [])
    const fetchWallet  = useCallback(async () => { try { const r = await api.get('/wallet/my/'); setWallet(r.data) } catch {} }, [])
    const fetchRequests = useCallback(async () => { try { const r = await api.get('/auth/join-requests/'); setRequests(r.data) } catch {} }, [])
    const fetchRequests = useCallback(async () => { try { const r = await api.get('/auth/join-requests/'); setRequests(r.data) } catch {} }, [])
    const fetchBankAccounts = useCallback(async () => { try { const r = await api.get('/billing/bank-accounts/'); setBankAccounts(r.data) } catch {} }, [])
    const fetchBankAccounts = useCallback(async () => { try { const r = await api.get('/billing/bank-accounts/'); setBankAccounts(r.data) } catch {} }, [])
    const fetchBankStats    = useCallback(async () => { try { const r = await api.get('/billing/bank-accounts/stats/'); setBankStats(r.data) } catch {} }, [])
    const fetchBankStats    = useCallback(async () => { try { const r = await api.get('/billing/bank-accounts/stats/'); setBankStats(r.data) } catch {} }, [])
    const fetchBankTxns = useCallback(async (id, startDate, endDate) => {
      try {
        const params = new URLSearchParams()
        if (startDate) params.set('start_date', startDate)
        if (endDate)   params.set('end_date',   endDate)
        const q = params.toString()
        const url = `/billing/bank-accounts/${id}/transactions/${q ? '?' + q : ''}`
        const r = await api.get(url)
        setBankStatement(r.data)
        setBankTxns(r.data.transactions || [])
      } catch (err) {
        console.error("Failed to fetch bank txns:", err)
      }
    }, [])
    const fetchPayments     = useCallback(async () => { try { const r = await api.get('/billing/payments/'); setPayments(r.data) } catch {} }, [])
    const fetchBills        = useCallback(async () => { try { const r = await api.get('/billing/bills/'); setBills(r.data) } catch {} }, [])
    const fetchBills        = useCallback(async () => { try { const r = await api.get('/billing/bills/'); setBills(r.data) } catch {} }, [])
    const fetchSalaries     = useCallback(async (m, y) => { 
      try { 
        setSalaryLoading(true); 
        const targetM = m || salaryMonth;
        const targetY = y || salaryYear;
        const r = await api.get(`/salary/?month=${targetM}&year=${targetY}`); 
        setSalaries(r.data); 
      } catch {} finally { setSalaryLoading(false); } 
    }, [salaryMonth, salaryYear])

    const executeDelete = async () => {
      if (!confirmDelete) return
      setIsDeleting(true)
      const { id, type } = confirmDelete
      
      let url = ''
      let refreshFuncs = []
      
      if (type === 'site') {
        url = `/company/sites/${id}/`
        refreshFuncs = [fetchSites]
      } else if (type === 'guard') {
        url = `/company/guards/${id}/`
        refreshFuncs = [fetchGuards]
      } else if (type === 'supervisor' || type === 'admin') {
        url = `/auth/agency-users/${id}/delete/`
        refreshFuncs = [fetchSups, fetchAdmins]
      }
  
      try {
        await api.delete(url)
        setConfirmDelete(null) // Instant feedback: close modal
        showToast('🗑️ Deleted successfully')
        // Fire refreshes in background for smoothness
        refreshFuncs.forEach(f => f())
        fetchStats()
      } catch (err) {
        const msg = err.response?.data?.detail || err.response?.data?.error || Object.values(err.response?.data || {})[0] || 'Deletion failed.'
        showToast(`❌ ${msg}`)
      } finally {
        setIsDeleting(false)
      }
    }

  useEffect(() => {
    fetchStats(); fetchSites(); fetchGuards(); fetchSups(); fetchAdmins(); fetchCodes(); fetchWallet(); fetchRequests(); fetchBankAccounts(); fetchBankStats(); fetchPayments(); fetchBills();
    
    api.post('/auth/heartbeat/').catch(() => {});
    
    const iv = setInterval(() => { 
      fetchStats(); fetchGuards(); fetchSups(); fetchAdmins(); fetchRequests(); fetchBills();
      api.post('/auth/heartbeat/').catch(() => {});
    }, 5000);
    
    return () => clearInterval(iv);
  }, [fetchStats, fetchSites, fetchGuards, fetchSups, fetchAdmins, fetchCodes, fetchWallet, fetchRequests, fetchBankAccounts, fetchBankStats, fetchPayments, fetchBills]);

  const value = {
    stats, sites, guards, supervisors, admins, codes, wallet, requests, bankAccounts, bankStats, payments, bills,
    setStats, setSites, setGuards, setSupervisors, setAdmins, setCodes, setWallet, setRequests, setBankAccounts, setBankStats, setPayments, setBills,
    fetchStats, fetchSites, fetchGuards, fetchSups, fetchAdmins, fetchCodes, fetchWallet, fetchRequests, fetchBankAccounts, fetchBankStats, fetchPayments, fetchBills,
    executeDelete, showToast, toast
  };

  return (
    <OwnerDataContext.Provider value={value}>
      {children}
    </OwnerDataContext.Provider>
  );
}

export const useOwnerData = () => useContext(OwnerDataContext);
