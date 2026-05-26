import { createContext, useContext, useReducer, type ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'   // named import — v4 breaking change

export interface AuthState {
  token: string | null
  username: string | null
}

export type AuthAction =
  | { type: 'LOGIN'; token: string; username: string }
  | { type: 'LOGOUT' }

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('vdt_token', action.token)
      return { token: action.token, username: action.username }
    case 'LOGOUT':
      localStorage.removeItem('vdt_token')
      return { token: null, username: null }
    default:
      return state
  }
}

// Mirrors JwtAuthenticationFilter — read token from storage on initialization
const initState = (): AuthState => {
  const token = localStorage.getItem('vdt_token')
  if (token) {
    try {
      const { sub } = jwtDecode<{ sub: string }>(token)
      return { token, username: sub }
    } catch {
      localStorage.removeItem('vdt_token')
    }
  }
  return { token: null, username: null }
}

interface AuthContextValue extends AuthState {
  dispatch: React.Dispatch<AuthAction>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, initState)

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
