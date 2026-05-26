import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Video, Phone, LogOut, Users } from 'lucide-react'
import api from '@/lib/api'

// ──────────────────────────────────────────────────────────────────
// Copy strings — UI-SPEC §9
// ──────────────────────────────────────────────────────────────────
const COPY = {
  appName: 'VDT-WebRTC',
  panelTitle: 'Online Users',
  countBadge: (n: number) => `${n} online`,
  onlineBadge: '● Online',
  callButton: 'Call',
  logoutButton: 'Logout',
  emptyHeading: 'No one else is online',
  emptyBody: 'Share the app link with a friend to start a call.',
  loadingLabel: 'Loading online users...',
} as const

// ──────────────────────────────────────────────────────────────────
// UserRow — extracted for readability (keeps page file under ~180 lines)
// ──────────────────────────────────────────────────────────────────
function UserRow({ user }: { user: string }) {
  return (
    <li
      key={user}
      className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/50 transition-colors duration-150 animate-in fade-in slide-in-from-top-1 duration-300"
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-slate-700 text-slate-200 text-sm font-semibold">
          {user[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-normal text-slate-50 truncate max-w-[160px]">{user}</span>
      <span className="flex-1" />
      <span className="text-xs font-normal text-emerald-400">{COPY.onlineBadge}</span>
      <Button
        size="sm"
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
        aria-label={`Call ${user}`}
        onClick={() => { /* TODO Phase 4 — call initiation */ }}
      >
        <Phone className="size-4 mr-2" />
        {COPY.callButton}
      </Button>
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────
// UserListPage
// ──────────────────────────────────────────────────────────────────
export default function UserListPage() {
  const { username, dispatch } = useAuth()
  const { onlineUsers, isLoading, disconnect } = useWebSocket()
  const navigate = useNavigate()

  // Self-filter — RESEARCH Pitfall 4 / UI-SPEC §6
  const otherUsers = onlineUsers.filter(u => u !== username)

  // Logout handler — D-07 / D-12 / threat T-3-14 / T-3-16
  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Token may already be invalid — proceed anyway (T-3-16 mitigated)
    }
    await disconnect()
    dispatch({ type: 'LOGOUT' })
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Header — UI-SPEC §6 ── */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 h-14">
        <div className="flex items-center justify-between px-6 h-full">
          {/* Left: logo */}
          <div className="flex items-center gap-2">
            <Video className="size-5 text-emerald-400" />
            <span className="text-base font-semibold text-slate-50">{COPY.appName}</span>
          </div>
          {/* Right: username + logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4 mr-1" />
              {COPY.logoutButton}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Content — UI-SPEC §6 ── */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <section
          aria-label="Online users"
          className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden"
        >
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-50">{COPY.panelTitle}</h2>
            <span className="text-xs font-normal text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full">
              {COPY.countBadge(otherUsers.length)}
            </span>
          </div>

          {/* ── Loading state: 3 skeleton rows — UI-SPEC §6 ── */}
          {isLoading && (
            <div role="status" aria-label={COPY.loadingLabel}>
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <div className="flex-1" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state — UI-SPEC §6 ── */}
          {!isLoading && otherUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="size-12 text-slate-600 mb-4" />
              <p className="text-base font-semibold text-slate-400">{COPY.emptyHeading}</p>
              <p className="text-sm text-slate-500">{COPY.emptyBody}</p>
            </div>
          )}

          {/* ── User list — UI-SPEC §6 ── */}
          {!isLoading && otherUsers.length > 0 && (
            <ul className="divide-y divide-slate-700/50">
              {otherUsers.map(user => (
                <UserRow key={user} user={user} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
