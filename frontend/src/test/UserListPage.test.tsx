import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import UserListPage from '@/pages/UserListPage'

// Must match the Axios baseURL in src/lib/api.ts
const API_BASE = 'http://localhost:8080'

// ──────────────────────────────────────────────────────────────────
// Mutable mock values — tests mutate these before rendering
// ──────────────────────────────────────────────────────────────────
let mockOnlineUsers: string[] = []
let mockIsLoading = false
const mockDisconnect = vi.fn().mockResolvedValue(undefined)
let mockUsername: string | null = 'alice'
const mockDispatch = vi.fn()

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock WebSocketContext
vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    client: null,
    onlineUsers: mockOnlineUsers,
    isLoading: mockIsLoading,
    connect: vi.fn(),
    disconnect: mockDisconnect,
    subscribe: vi.fn(),
    publish: vi.fn(),
  }),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'mock-token',
    username: mockUsername,
    dispatch: mockDispatch,
  }),
}))

function renderUserListPage() {
  return render(
    <MemoryRouter initialEntries={['/users']}>
      <UserListPage />
    </MemoryRouter>
  )
}

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  mockNavigate.mockClear()
  mockDisconnect.mockClear()
  mockDispatch.mockClear()
  // Reset to defaults
  mockOnlineUsers = []
  mockIsLoading = false
  mockUsername = 'alice'
})
afterAll(() => server.close())

describe('UserListPage', () => {
  it('UI-02: renders one row per online user (filtered) and shows count badge', () => {
    mockOnlineUsers = ['alice', 'bob', 'carol']
    mockIsLoading = false
    mockUsername = 'alice'

    renderUserListPage()

    // bob and carol should be in the list
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('carol')).toBeInTheDocument()

    // alice should NOT be in the list (self-filtered)
    const listItems = screen.getAllByRole('listitem')
    const listText = listItems.map((li) => li.textContent).join(' ')
    expect(listText).not.toContain('alice')

    // Count badge shows 2 online (bob + carol)
    expect(screen.getByText('2 online')).toBeInTheDocument()
  })

  it('UI-02: filters self even when case matches exactly (case-sensitive contract)', () => {
    mockOnlineUsers = ['Alice', 'Bob']
    mockIsLoading = false
    mockUsername = 'Alice'

    renderUserListPage()

    // Bob should be visible
    expect(screen.getByText('Bob')).toBeInTheDocument()

    // Alice should NOT appear in the list area
    const listItems = screen.getAllByRole('listitem')
    const listText = listItems.map((li) => li.textContent).join(' ')
    expect(listText).not.toContain('Alice')
  })

  it('UI-02: shows 3 skeleton rows wrapped in role=status while loading', () => {
    mockOnlineUsers = []
    mockIsLoading = true

    renderUserListPage()

    // role="status" wrapper should exist
    const statusEl = screen.getByRole('status')
    expect(statusEl).toBeInTheDocument()
    expect(statusEl).toHaveAttribute('aria-label', 'Loading online users...')

    // The status element should contain 3 children (skeleton rows)
    expect(statusEl.children.length).toBe(3)

    // No user names should be visible
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('UI-02: shows empty state when no other users are online after filtering self', () => {
    mockOnlineUsers = ['alice']
    mockIsLoading = false
    mockUsername = 'alice'

    renderUserListPage()

    // Empty state heading and body
    expect(screen.getByText('No one else is online')).toBeInTheDocument()
    expect(screen.getByText('Share the app link with a friend to start a call.')).toBeInTheDocument()

    // No list items
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('UI-02: Call button has aria-label="Call {username}" for each user', () => {
    mockOnlineUsers = ['alice', 'bob', 'carol']
    mockIsLoading = false
    mockUsername = 'alice'

    renderUserListPage()

    // Call buttons for bob and carol should have proper aria-labels
    expect(screen.getByRole('button', { name: 'Call bob' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Call carol' })).toBeInTheDocument()

    // No call button for alice (self-filtered)
    expect(screen.queryByRole('button', { name: 'Call alice' })).not.toBeInTheDocument()
  })

  it('UI-02: Logout calls api.post(/api/auth/logout), disconnect(), dispatch(LOGOUT), navigate(/login)', async () => {
    mockOnlineUsers = ['bob']
    mockIsLoading = false
    mockUsername = 'alice'

    let logoutCalled = false
    server.use(
      http.post(`${API_BASE}/api/auth/logout`, () => {
        logoutCalled = true
        return new HttpResponse(null, { status: 200 })
      })
    )

    const user = userEvent.setup()
    renderUserListPage()

    const logoutButton = screen.getByRole('button', { name: /logout/i })
    await user.click(logoutButton)

    await waitFor(() => {
      expect(logoutCalled).toBe(true)
    })

    // All steps must have been called
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'LOGOUT' })
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })
})
