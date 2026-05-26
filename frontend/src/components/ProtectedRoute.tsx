import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token } = useAuth()

  if (!token) {
    // Mirrors SecurityConfig 401 response — redirects to login with replace
    // replace: true prevents back-button returning to protected route
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
