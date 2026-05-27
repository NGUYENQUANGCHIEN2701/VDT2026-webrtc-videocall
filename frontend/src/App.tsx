import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCall } from '@/contexts/CallContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { IncomingCallModal } from '@/components/IncomingCallModal'
import AuthPage from '@/pages/AuthPage'
import UserListPage from '@/pages/UserListPage'
import CallPage from '@/pages/CallPage'

export default function App() {
  const { token } = useAuth()
  const { toasts } = useCall()

  return (
    <>
      <Routes>
        {/* Public routes — mirror SecurityConfig permitAll() paths */}
        <Route path="/login" element={<AuthPage />} />

        {/* Protected routes — mirror SecurityConfig anyRequest().authenticated() */}
        <Route path="/users" element={
          <ProtectedRoute><UserListPage /></ProtectedRoute>
        } />

        {/* Call route — protected, navigated to by acceptCall() per D-07 */}
        <Route path="/call" element={
          <ProtectedRoute><CallPage /></ProtectedRoute>
        } />

        {/* Root redirect — token-aware, mirrors SecurityConfig entry point behavior */}
        <Route path="/" element={
          <Navigate to={token ? '/users' : '/login'} replace />
        } />
      </Routes>

      {/* Global overlays — rendered outside Routes so they appear on any page (D-06) */}
      <IncomingCallModal />

      {/* Toast notification list — UI-SPEC §5.4 (Plan 02 populates toasts array) */}
      <div role="status" aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-lg px-4 py-3 text-sm font-normal shadow-lg animate-in fade-in slide-in-from-right-2 duration-200 ${t.style}`}>
            {t.message}
          </div>
        ))}
      </div>
    </>
  )
}
