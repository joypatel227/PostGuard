import api from './api'

// ── Sites ─────────────────────────────────────────────────────────────────────
export const getSites = () => api.get('/company/sites/')
export const createSite = (data) => api.post('/company/sites/', data)
export const updateSite = (id, data) => api.patch(`/company/sites/${id}/`, data)
export const deleteSite = (id) => api.delete(`/company/sites/${id}/`)
export const unlinkClient = (siteId) => api.post(`/company/sites/${siteId}/unlink-client/`)
export const createClientLogin = (siteId, data) => api.post(`/company/sites/${siteId}/create-client/`, data)

// ── Shifts ────────────────────────────────────────────────────────────────────
export const createShift = (siteId, data) => api.post(`/company/sites/${siteId}/shifts/`, data)
export const updateShift = (id, data) => api.patch(`/company/shifts/${id}/`, data)
export const deleteShift = (id) => api.delete(`/company/shifts/${id}/`)

// ── Guards ────────────────────────────────────────────────────────────────────
export const getGuards = () => api.get('/company/guards/')
export const createGuard = (data) => api.post('/company/guards/', data)
export const updateGuard = (id, data) => api.patch(`/company/guards/${id}/`, data)
export const deleteGuard = (id) => api.delete(`/company/guards/${id}/`)
export const toggleGuardDuty = (id) => api.post(`/company/guards/${id}/toggle-duty/`)
export const assignGuard = (guardId, data) => api.post(`/company/guards/${guardId}/assign/`, data)
export const transferGuard = (data) => api.post('/company/guards/transfer/', data)
export const bulkAttendance = (text) => api.post('/company/guards/bulk-attendance/', { text })

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendanceByDate = (date) => api.get(`/company/attendance/?date=${date}`)
export const getAttendanceByMonth = (month) => api.get(`/company/attendance/?month=${month}`)
export const createAttendance = (data) => api.post('/company/attendance/', data)
export const updateAttendance = (id, data) => api.patch(`/company/attendance/${id}/`, data)
