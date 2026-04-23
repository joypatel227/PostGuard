import api from './api'

// ── Bills ─────────────────────────────────────────────────────────────────────
export const getBills = () => api.get('/billing/bills/')
export const generateBill = (data) => api.post('/billing/bills/', data)
export const markBillPaid = (id) => api.post(`/billing/bills/${id}/mark-paid/`)
export const deleteBill = (id) => api.delete(`/billing/bills/${id}/`)

// ── Payments ──────────────────────────────────────────────────────────────────
export const getPayments = () => api.get('/billing/payments/')
export const verifyPayment = (id) => api.post(`/billing/payments/${id}/verify/`)
export const rejectPayment = (id, reason) => api.post(`/billing/payments/${id}/reject/`, { reason })
