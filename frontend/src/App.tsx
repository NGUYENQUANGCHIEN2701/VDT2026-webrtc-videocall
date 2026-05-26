import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import AuthPage from '@/pages/AuthPage'
import UserListPage from '@/pages/UserListPage'

export default function App() {
  const { token } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — mirror SecurityConfig permitAll() paths */}
        <Route path="/login" element={<AuthPage />} />

        {/* Protected routes — mirror SecurityConfig anyRequest().authenticated() */}
        <Route path="/users" element={
          <ProtectedRoute><UserListPage /></ProtectedRoute>
        } />

        {/* Root redirect — token-aware, mirrors SecurityConfig entry point behavior */}
        <Route path="/" element={
          <Navigate to={token ? '/users' : '/login'} replace />
        } />
      </Routes>
    </BrowserRouter>
  )
}
