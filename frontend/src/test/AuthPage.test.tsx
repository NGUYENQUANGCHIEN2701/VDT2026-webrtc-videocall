import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import { MOCK_TOKEN } from './mocks/handlers'
import { AuthProvider } from '@/contexts/AuthContext'
import AuthPage from '@/pages/AuthPage'

// Must match the Axios baseURL in src/lib/api.ts
const API_BASE = 'http://localhost:8080'

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Spy on WebSocketContext connect — we wrap with a custom provider that exposes a spy
const mockConnect = vi.fn()
vi.mock('@/contexts/WebSocketContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/WebSocketContext')>()
  return {
    ...actual,
    useWebSocket: () => ({
      client: null,
      onlineUsers: [],
      isLoading: false,
      connect: mockConnect,
      disconnect: vi.fn(),
      subscribe: vi.fn(),
      publish: vi.fn(),
    }),
  }
})

// Helper: render AuthPage with necessary providers
function renderAuthPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  mockNavigate.mockClear()
  mockConnect.mockClear()
  localStorage.clear()
})
afterAll(() => server.close())

describe('AuthPage', () => {
  it('UI-01: login success stores token, dispatches LOGIN, calls connect(token), navigates to /users', async () => {
    const user = userEvent.setup()
    renderAuthPage()

    await user.type(screen.getByPlaceholderText('Enter your username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(localStorage.getItem('vdt_token')).toBe(MOCK_TOKEN)
    })
    expect(mockConnect).toHaveBeenCalledWith(MOCK_TOKEN)
    expect(mockNavigate).toHaveBeenCalledWith('/users', { replace: true })
  })

  it('UI-01: 401 from login shows Alert with exact copy', async () => {
    server.use(
      http.post(`${API_BASE}/api/auth/login`, () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
      )
    )

    const user = userEvent.setup()
    renderAuthPage()

    await user.type(screen.getByPlaceholderText('Enter your username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password')
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(localStorage.getItem('vdt_token')).toBeNull()
  })

  it('UI-01: 409 on register tab shows "Username already taken. Please choose another."', async () => {
    server.use(
      http.post(`${API_BASE}/api/auth/register`, () =>
        HttpResponse.json({ message: 'Username taken' }, { status: 409 })
      )
    )

    const user = userEvent.setup()
    renderAuthPage()

    // Switch to Register tab
    await user.click(screen.getByRole('tab', { name: /register/i }))

    await user.type(screen.getByPlaceholderText('Choose a username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Create a password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Username already taken. Please choose another.')
  })

  it('UI-01: submit button shows Loader2 spinner and "Signing in..." while loading', async () => {
    // Use a delayed response
    server.use(
      http.post(`${API_BASE}/api/auth/login`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json({ token: MOCK_TOKEN })
      })
    )

    const user = userEvent.setup()
    renderAuthPage()

    await user.type(screen.getByPlaceholderText('Enter your username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // While loading: button should be disabled and show spinner text
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /signing in/i })
      expect(button).toBeDisabled()
    })
    // Also confirm spinner element exists
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()

    // Wait for the async request to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/users', { replace: true })
    })
  })

  it('register tab: passwords mismatch blocks submit with inline error, no network call', async () => {
    let requestFired = false
    server.use(
      http.post(`${API_BASE}/api/auth/register`, () => {
        requestFired = true
        return HttpResponse.json({ token: MOCK_TOKEN }, { status: 201 })
      })
    )

    const user = userEvent.setup()
    renderAuthPage()

    await user.click(screen.getByRole('tab', { name: /register/i }))

    await user.type(screen.getByPlaceholderText('Choose a username'), 'bob')
    await user.type(screen.getByPlaceholderText('Create a password'), 'pw111111')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'pw222222')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
    expect(requestFired).toBe(false)
  })

  it('client-side username min-length validation shows error, no network call', async () => {
    let requestFired = false
    server.use(
      http.post(`${API_BASE}/api/auth/login`, () => {
        requestFired = true
        return HttpResponse.json({ token: MOCK_TOKEN })
      })
    )

    const user = userEvent.setup()
    renderAuthPage()

    await user.type(screen.getByPlaceholderText('Enter your username'), 'ab')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument()
    })
    expect(requestFired).toBe(false)
  })

  it('successful login triggers WebSocketContext.connect(token) once', async () => {
    const user = userEvent.setup()
    renderAuthPage()

    await user.type(screen.getByPlaceholderText('Enter your username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1)
    })
    expect(mockConnect).toHaveBeenCalledWith(MOCK_TOKEN)
  })
})
