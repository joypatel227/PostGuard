import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterWithCodePage from './pages/RegisterWithCodePage'
import JoinRequestPage from './pages/JoinRequestPage'
import LordDashboard from './pages/LordDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterWithCodePage />} />
          <Route path="/join-request" element={<JoinRequestPage />} />

          {/* Protected – Lord only */}
          <Route
            path="/lord"
            element={
              <ProtectedRoute allowedRoles={['lord']}>
                <LordDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Supervisor only */}
          <Route
            path="/supervisor"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
