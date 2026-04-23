import api from './api'

// ── Agency Stats ─────────────────────────────────────────────────────────────
export const getOwnerStats = () => api.get('/auth/owner-stats/')

// ── Agency Users ─────────────────────────────────────────────────────────────
export const getAgencyUsers = (role) => api.get(`/auth/agency-users/${role ? `?role=${role}` : ''}`)
export const createAgencyUser = (data) => api.post('/auth/agency-users/', data)
export const deleteAgencyUser = (id) => api.delete(`/auth/agency-users/${id}/delete/`)

// ── Invite Codes ─────────────────────────────────────────────────────────────
export const getMyCodes = () => api.get('/auth/my-codes/')
export const createCode = (data) => api.post('/auth/generate-code/', data)
export const deleteCode = (id) => api.delete(`/auth/delete-code/${id}/`)

// ── Join Requests ─────────────────────────────────────────────────────────────
export const getJoinRequests = () => api.get('/auth/join-requests/')
export const approveJoinRequest = (id) => api.post(`/auth/join-requests/${id}/approve/`)
export const rejectJoinRequest = (id) => api.post(`/auth/join-requests/${id}/reject/`)

// ── Heartbeat ─────────────────────────────────────────────────────────────────
export const sendHeartbeat = () => api.post('/auth/heartbeat/')
