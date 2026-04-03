import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterWithCodePage from './pages/RegisterWithCodePage'
import JoinRequestPage from './pages/JoinRequestPage'
import LordDashboard from './pages/LordDashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import SupervisorDashboard from './pages/SupervisorDashboard'
import AgencyBlockedPage from './pages/AgencyBlockedPage'
import { useAuth } from './components/AuthContext'

function HomeRedirector() {
  const { user } = useAuth()
  if (!user || !user.role) return <Navigate to="/login" replace />
  
  // Lord can always access dashboard
  if (user.role === 'lord') return <Navigate to="/lord" replace />
  
  // Other roles must have an active agency
  if (!user.agency) return <Navigate to="/blocked" replace />
  
  const validRoles = ['owner', 'admin', 'supervisor']
  if (!validRoles.includes(user.role)) return <Navigate to="/login" replace />
  
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterWithCodePage />} />
          <Route path="/join" element={<JoinRequestPage />} />
          <Route path="/blocked" element={<AgencyBlockedPage />} />

          {/* Protected – Lord only */}
          <Route
            path="/lord"
            element={
              <ProtectedRoute allowedRoles={['lord']}>
                <LordDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Owner only */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <OwnerDashboard />
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
          <Route path="/" element={<HomeRedirector />} />
          <Route path="*" element={<HomeRedirector />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
