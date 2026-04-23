import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterWithCodePage from './pages/RegisterWithCodePage'
import JoinRequestPage from './pages/JoinRequestPage'
import LordDashboard from './pages/LordDashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import GuardDashboard from './pages/GuardDashboard'
import ClientDashboard from './pages/ClientDashboard'
import AgencyBlockedPage from './pages/AgencyBlockedPage'
import { useAuth } from './components/AuthContext'

function HomeRedirector() {
  const { user } = useAuth()
  if (!user || !user.role) return <Navigate to="/login" replace />
  
  // Lord can always access dashboard
  if (user.role === 'lord') return <Navigate to="/lord" replace />
  
  // Guards bypass the full agency user constraint temporarily but must exist
  if (user.role === 'guard') return <Navigate to="/guard-dashboard" replace />
  
  // Other roles must have an active agency
  if (!user.agency) return <Navigate to="/blocked" replace />
  
  if (user.role === 'client') return <Navigate to="/client" replace />
  
  const validRoles = ['owner', 'admin', 'supervisor']
  if (!validRoles.includes(user.role)) return <Navigate to="/login" replace />
  
  return <Navigate to={`/${user.role}/overview`} replace />
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
            path="/lord/:tab?"
            element={
              <ProtectedRoute allowedRoles={['lord']}>
                <LordDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Owner only */}
          <Route path="/owner" element={<Navigate to="/owner/overview" replace />} />
          <Route
            path="/owner/:tab"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Admin only */}
          <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
          <Route
            path="/admin/:tab"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Supervisor only */}
          <Route path="/supervisor" element={<Navigate to="/supervisor/overview" replace />} />
          <Route
            path="/supervisor/:tab"
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Guard only */}
          <Route
            path="/guard-dashboard"
            element={
              <ProtectedRoute allowedRoles={['guard']}>
                <GuardDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected – Client only */}
          <Route
            path="/client/:tab?"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientDashboard />
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
