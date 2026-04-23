import api from './api'

// ── Wallet Balance ─────────────────────────────────────────────────────────────
export const getMyWallet = () => api.get('/wallet/my/')
export const getAgencyWallets = () => api.get('/wallet/agency/')

// ── Transactions ──────────────────────────────────────────────────────────────
export const deposit = (payload) => api.post('/wallet/deposit/', payload)
export const withdraw = (payload) => api.post('/wallet/withdraw/', payload)

// ── Transfers ─────────────────────────────────────────────────────────────────
export const giveToGuard = (payload) => api.post('/wallet/give-guard/', payload)
export const giveToSupervisor = (payload) => api.post('/wallet/give-supervisor/', payload)
export const giveToAdmin = (payload) => api.post('/wallet/give-admin/', payload)
