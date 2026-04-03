import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to their own dashboard
    const redirectMap = {
      lord: '/lord',
      owner: '/owner',
      admin: '/admin',
      supervisor: '/supervisor',
    }
    return <Navigate to={redirectMap[user?.role] || '/login'} replace />
  }

  // Final check: All non-lords MUST have an agency
  if (user?.role !== 'lord' && !user?.agency) {
    return <Navigate to="/blocked" replace />
  }

  return children
}
