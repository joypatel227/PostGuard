import api from './api'

// ── Bank Accounts ─────────────────────────────────────────────────────────────
export const getBankAccounts = () => api.get('/billing/bank-accounts/')
export const getBankStats = () => api.get('/billing/bank-accounts/stats/')
export const createBankAccount = (data) => api.post('/billing/bank-accounts/', data)
export const updateBankAccount = (id, data) => api.patch(`/billing/bank-accounts/${id}/`, data)
export const deleteBankAccount = (id) => api.delete(`/billing/bank-accounts/${id}/`)

// ── Bank Transactions ─────────────────────────────────────────────────────────
export const getBankTransactions = (id, startDate, endDate) => {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate)   params.set('end_date',   endDate)
  const q = params.toString()
  return api.get(`/billing/bank-accounts/${id}/transactions/${q ? '?' + q : ''}`)
}
