import api from './api'

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getLordStats = () => api.get('/auth/lord-stats/')

// ── Agencies ──────────────────────────────────────────────────────────────────
export const getAgencies = () => api.get('/company/agencies/')
export const createAgency = (data) => api.post('/company/agencies/', data)
export const deleteAgency = (id) => api.delete(`/company/agencies/${id}/`)
export const toggleAgencyStatus = (id) => api.post(`/company/agencies/${id}/toggle-status/`)

// ── Owners / Admins ───────────────────────────────────────────────────────────
export const getMyUsers = () => api.get('/auth/my-users/')
export const createOwner = (data) => api.post('/auth/agency-owners/', data)
export const deleteUser = (id) => api.delete(`/auth/users/${id}/delete/`)

// ── Invite Codes ──────────────────────────────────────────────────────────────
export const getMyCodes = () => api.get('/auth/my-codes/')
export const generateCode = () => api.post('/auth/generate-code/')
export const deleteCode = (id) => api.delete(`/auth/codes/${id}/delete/`)
