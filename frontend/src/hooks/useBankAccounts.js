import { useState, useCallback } from 'react'
import { getBankAccounts, getBankStats, getBankTransactions, createBankAccount, updateBankAccount, deleteBankAccount } from '../services/bankService'

export function useBankAccounts() {
  const [bankAccounts, setBankAccounts] = useState([])
  const [bankStats, setBankStats] = useState([])
  const [bankTxns, setBankTxns] = useState([])
  const [bankStatement, setBankStatement] = useState(null)
  const [activeBankId, setActiveBankId] = useState(null)
  const [txnDateRange, setTxnDateRange] = useState(() => {
    const today = new Date()
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6)
    return { start: weekAgo.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) }
  })
  const [showAddBank, setShowAddBank] = useState(false)
  const [editBankData, setEditBankData] = useState(null)
  const [statementModal, setStatementModal] = useState(null)
  const [bankForm, setBankForm] = useState({
    account_name: '', bank_name: '', account_no: '', ifsc: '',
    upi_id: '', balance: 0, transaction_limit: 2000000, is_default: false
  })

  const fetchBankAccounts = useCallback(async () => {
    try { const r = await getBankAccounts(); setBankAccounts(r.data) } catch {}
  }, [])

  const fetchBankStats = useCallback(async () => {
    try { const r = await getBankStats(); setBankStats(r.data) } catch {}
  }, [])

  const fetchBankTxns = useCallback(async (id, startDate, endDate) => {
    try {
      const r = await getBankTransactions(id, startDate, endDate)
      setBankStatement(r.data)
      setBankTxns(r.data.transactions || [])
    } catch (err) { console.error('Failed to fetch bank txns:', err) }
  }, [])

  const addBankAccount = async (data) => {
    await createBankAccount(data)
    await fetchBankAccounts()
    await fetchBankStats()
  }

  const editBankAccount = async (id, data) => {
    await updateBankAccount(id, data)
    await fetchBankAccounts()
    await fetchBankStats()
  }

  const removeBankAccount = async (id) => {
    await deleteBankAccount(id)
    await fetchBankAccounts()
    await fetchBankStats()
  }

  return {
    bankAccounts, bankStats, bankTxns, bankStatement,
    activeBankId, setActiveBankId,
    txnDateRange, setTxnDateRange,
    showAddBank, setShowAddBank,
    editBankData, setEditBankData,
    statementModal, setStatementModal,
    bankForm, setBankForm,
    fetchBankAccounts, fetchBankStats, fetchBankTxns,
    addBankAccount, editBankAccount, removeBankAccount,
  }
}
