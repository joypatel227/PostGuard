import api from './api'

// ── Salary Records ────────────────────────────────────────────────────────────
export const getSalaries = (month, year) => api.get(`/salary/?month=${month}&year=${year}`)
export const payoutSalary = (id, data) => api.post(`/salary/${id}/payout/`, data)
export const undoPayout = (id) => api.post(`/salary/${id}/undo/`)
