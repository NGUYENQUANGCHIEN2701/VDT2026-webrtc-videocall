import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Video } from 'lucide-react'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import api from '@/lib/api'

// Exact copy strings from UI-SPEC §9 — must not paraphrase
const COPY = {
  login: {
    usernamePlaceholder: 'Enter your username',
    passwordPlaceholder: 'Enter your password',
    submit: 'Sign In',
    submitLoading: 'Signing in...',
  },
  register: {
    usernamePlaceholder: 'Choose a username',
    passwordPlaceholder: 'Create a password',
    confirmPlaceholder: 'Confirm your password',
    submit: 'Create Account',
    submitLoading: 'Creating account...',
  },
  errors: {
    usernameRequired: 'Username is required',
    usernameTooShort: 'Username must be at least 3 characters',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 6 characters',
    passwordsMismatch: 'Passwords do not match',
    invalidCredentials: 'Invalid username or password',
    usernameTaken: 'Username already taken. Please choose another.',
    serverError: 'Something went wrong. Please try again.',
  },
} as const

interface FieldErrors {
  username?: string
  password?: string
  confirmPassword?: string
}

export default function AuthPage() {
  const { dispatch } = useAuth()
  const { connect } = useWebSocket()
  const navigate = useNavigate()

  // Login tab state
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({})
  const [loginApiError, setLoginApiError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Register tab state
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regErrors, setRegErrors] = useState<FieldErrors>({})
  const [regApiError, setRegApiError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  // Validate login fields inline; return true if valid
  const validateLogin = (): boolean => {
    const errs: FieldErrors = {}
    if (!loginUsername) {
      errs.username = COPY.errors.usernameRequired
    } else if (loginUsername.length < 3) {
      errs.username = COPY.errors.usernameTooShort
    }
    if (!loginPassword) {
      errs.password = COPY.errors.passwordRequired
    } else if (loginPassword.length < 6) {
      errs.password = COPY.errors.passwordTooShort
    }
    setLoginErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Validate register fields inline; return true if valid
  const validateRegister = (): boolean => {
    const errs: FieldErrors = {}
    if (!regUsername) {
      errs.username = COPY.errors.usernameRequired
    } else if (regUsername.length < 3) {
      errs.username = COPY.errors.usernameTooShort
    }
    if (!regPassword) {
      errs.password = COPY.errors.passwordRequired
    } else if (regPassword.length < 6) {
      errs.password = COPY.errors.passwordTooShort
    }
    if (regPassword !== regConfirm) {
      errs.confirmPassword = COPY.errors.passwordsMismatch
    }
    setRegErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Map HTTP status to user-facing error message
  const mapApiError = (status: number): string => {
    if (status === 401) return COPY.errors.invalidCredentials
    if (status === 409) return COPY.errors.usernameTaken
    return COPY.errors.serverError
  }

  // Shared post-success handler: decode JWT, dispatch LOGIN, connect STOMP, navigate
  const handleAuthSuccess = (token: string) => {
    let username = ''
    try {
      const payload = jwtDecode<{ sub: string }>(token)
      username = payload.sub
    } catch {
      // Decoding fallback per CONTEXT.md Claude's Discretion:
      // If jwtDecode throws, username remains '' — user is still authenticated.
      // A future call to /api/users/me could resolve it, but that is deferred to Plan 03+.
      username = ''
    }
    dispatch({ type: 'LOGIN', token, username })
    connect(token) // D-09: initiate STOMP connection on successful login
    navigate('/users', { replace: true })
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginApiError(null)
    if (!validateLogin()) return

    setLoginLoading(true)
    try {
      const { data } = await api.post<{ token: string }>('/api/auth/login', {
        username: loginUsername,
        password: loginPassword,
      })
      handleAuthSuccess(data.token)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status ?? 0
      setLoginApiError(mapApiError(status))
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegApiError(null)
    if (!validateRegister()) return

    setRegLoading(true)
    try {
      const { data } = await api.post<{ token: string }>('/api/auth/register', {
        username: regUsername,
        password: regPassword,
      })
      handleAuthSuccess(data.token)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status ?? 0
      setRegApiError(mapApiError(status))
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <main aria-label="Authentication" className="w-full max-w-md">
        {/* Logo block above tabs — UI-SPEC §5 */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Video className="size-8 text-emerald-400" />
          <h1 className="text-xl font-semibold text-slate-50">VDT-WebRTC</h1>
        </div>

        {/* Card — UI-SPEC §5 */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-8">
          <Tabs defaultValue="login">
            <TabsList className="bg-slate-800 rounded-lg p-1 w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* ── Login Tab ── */}
            <TabsContent value="login">
              {loginApiError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{loginApiError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLoginSubmit} noValidate>
                <div className="space-y-4">
                  {/* Username field */}
                  <div>
                    <Label htmlFor="login-username" className="text-sm font-normal text-slate-300">
                      Username
                    </Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder={COPY.login.usernamePlaceholder}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      disabled={loginLoading}
                      aria-describedby={loginErrors.username ? 'login-username-error' : undefined}
                      className="mt-1 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-400"
                    />
                    {loginErrors.username && (
                      <p id="login-username-error" className="text-xs text-red-400 mt-1">
                        {loginErrors.username}
                      </p>
                    )}
                  </div>

                  {/* Password field */}
                  <div>
                    <Label htmlFor="login-password" className="text-sm font-normal text-slate-300">
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={COPY.login.passwordPlaceholder}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loginLoading}
                      aria-describedby={loginErrors.password ? 'login-password-error' : undefined}
                      className="mt-1 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-400"
                    />
                    {loginErrors.password && (
                      <p id="login-password-error" className="text-xs text-red-400 mt-1">
                        {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Submit button — UI-SPEC §5 loading state */}
                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-10"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        {COPY.login.submitLoading}
                      </>
                    ) : (
                      COPY.login.submit
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* ── Register Tab ── */}
            <TabsContent value="register">
              {regApiError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{regApiError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleRegisterSubmit} noValidate>
                <div className="space-y-4">
                  {/* Username field */}
                  <div>
                    <Label htmlFor="reg-username" className="text-sm font-normal text-slate-300">
                      Username
                    </Label>
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder={COPY.register.usernamePlaceholder}
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      disabled={regLoading}
                      maxLength={32}
                      aria-describedby={regErrors.username ? 'reg-username-error' : undefined}
                      className="mt-1 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-400"
                    />
                    {regErrors.username && (
                      <p id="reg-username-error" className="text-xs text-red-400 mt-1">
                        {regErrors.username}
                      </p>
                    )}
                  </div>

                  {/* Password field */}
                  <div>
                    <Label htmlFor="reg-password" className="text-sm font-normal text-slate-300">
                      Password
                    </Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder={COPY.register.passwordPlaceholder}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={regLoading}
                      aria-describedby={regErrors.password ? 'reg-password-error' : undefined}
                      className="mt-1 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-400"
                    />
                    {regErrors.password && (
                      <p id="reg-password-error" className="text-xs text-red-400 mt-1">
                        {regErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password field */}
                  <div>
                    <Label htmlFor="reg-confirm" className="text-sm font-normal text-slate-300">
                      Confirm Password
                    </Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder={COPY.register.confirmPlaceholder}
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      disabled={regLoading}
                      aria-describedby={regErrors.confirmPassword ? 'reg-confirm-error' : undefined}
                      className="mt-1 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-400"
                    />
                    {regErrors.confirmPassword && (
                      <p id="reg-confirm-error" className="text-xs text-red-400 mt-1">
                        {regErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Submit button — UI-SPEC §5 loading state */}
                  <Button
                    type="submit"
                    disabled={regLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-10"
                  >
                    {regLoading ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        {COPY.register.submitLoading}
                      </>
                    ) : (
                      COPY.register.submit
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
