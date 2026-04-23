import { useState, useCallback } from 'react'
import { getMyWallet, deposit, withdraw, giveToGuard, giveToSupervisor, giveToAdmin } from '../services/walletService'

export function useWallet() {
  const [wallet, setWallet] = useState(null)
  const [walletModal, setWalletModal] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletForm, setWalletForm] = useState({
    amount: '', note: '', source: 'bank', bank_account_id: '',
    guard_id: '', supervisor_id: '', admin_id: ''
  })

  const resetWalletForm = () => setWalletForm({
    amount: '', note: '', source: 'bank', bank_account_id: '',
    guard_id: '', supervisor_id: '', admin_id: ''
  })

  const fetchWallet = useCallback(async () => {
    try {
      const r = await getMyWallet()
      setWallet(r.data)
    } catch {}
  }, [])

  const executeWalletAction = async ({ showToast, onSalaryRefetch, bankRefetch }) => {
    const amt = parseFloat(walletForm.amount)
    if (!amt || amt <= 0) { showToast('❌ Enter a valid amount'); return }
    setWalletLoading(true)
    try {
      if (walletModal === 'deposit') {
        const payload = { amount: amt, note: walletForm.note || 'Deposit', source: walletForm.source }
        if (walletForm.source === 'bank') payload.bank_account_id = walletForm.bank_account_id
        await deposit(payload)
        showToast('✅ Deposited successfully')
      } else if (walletModal === 'withdraw') {
        const payload = { amount: amt, note: walletForm.note || 'Withdrawal', source: walletForm.source }
        if (walletForm.source === 'bank') payload.bank_account_id = walletForm.bank_account_id
        await withdraw(payload)
        showToast('✅ Withdrawn successfully')
      } else if (walletModal === 'give_guard') {
        if (!walletForm.guard_id) { showToast('❌ Select a guard'); setWalletLoading(false); return }
        await giveToGuard({ amount: amt, note: walletForm.note, guard_id: walletForm.guard_id })
        showToast('✅ Advance given to guard')
        onSalaryRefetch?.()
      } else if (walletModal === 'give_sup') {
        if (!walletForm.supervisor_id) { showToast('❌ Select a supervisor'); setWalletLoading(false); return }
        await giveToSupervisor({ amount: amt, note: walletForm.note, supervisor_id: walletForm.supervisor_id })
        showToast('✅ Amount transferred to supervisor')
      } else if (walletModal === 'give_admin') {
        if (!walletForm.admin_id) { showToast('❌ Select an admin'); setWalletLoading(false); return }
        await giveToAdmin({ amount: amt, note: walletForm.note, admin_id: walletForm.admin_id })
        showToast('✅ Amount transferred to admin')
      }
      setWalletModal(null)
      resetWalletForm()
      fetchWallet()
      bankRefetch?.()
    } catch (err) {
      showToast(`❌ ${err.response?.data?.detail || 'Transaction failed'}`)
    } finally { setWalletLoading(false) }
  }

  return {
    wallet, fetchWallet,
    walletModal, setWalletModal,
    walletLoading, walletForm, setWalletForm,
    resetWalletForm, executeWalletAction,
  }
}
