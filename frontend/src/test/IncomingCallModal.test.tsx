import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IncomingCallModal } from '@/components/IncomingCallModal'

// ──────────────────────────────────────────────────────────────────
// Mutable mock values — tests mutate these before rendering
// ──────────────────────────────────────────────────────────────────
let mockCallStatus = 'idle'
let mockPeerUsername: string | null = null
const mockAcceptCall = vi.fn().mockResolvedValue(undefined)
const mockRejectCall = vi.fn()

// Mock CallContext — provides mutable values via closure
vi.mock('@/contexts/CallContext', () => ({
  useCall: () => ({
    callStatus: mockCallStatus,
    peerUsername: mockPeerUsername,
    localStream: null,
    remoteStream: null,
    toasts: [],
    startCall: vi.fn().mockResolvedValue(undefined),
    acceptCall: mockAcceptCall,
    rejectCall: mockRejectCall,
    hangUp: vi.fn(),
  }),
}))

// Mock useRingtone — no-op so Web Audio API (not in jsdom) is never called
vi.mock('@/hooks/useRingtone', () => ({
  useRingtone: vi.fn(),
}))

// ──────────────────────────────────────────────────────────────────
// Reset mutable state between tests
// ──────────────────────────────────────────────────────────────────
afterEach(() => {
  mockCallStatus = 'idle'
  mockPeerUsername = null
  mockAcceptCall.mockClear()
  mockRejectCall.mockClear()
})

// ──────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────
describe('IncomingCallModal', () => {

  // CALL-02: renders nothing when not ringing
  it('CALL-02: renders nothing when callStatus !== "ringing"', () => {
    mockCallStatus = 'idle'
    mockPeerUsername = null

    const { container } = render(<IncomingCallModal />)

    expect(container.firstChild).toBeNull()
  })

  // CALL-02: modal renders when ringing
  it('CALL-02: renders modal when callStatus === "ringing" with caller name', () => {
    mockCallStatus = 'ringing'
    mockPeerUsername = 'bob'

    render(<IncomingCallModal />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('Incoming Call')).toBeInTheDocument()
    expect(screen.getByText('is calling you...')).toBeInTheDocument()
  })

  // CALL-02: accessibility attributes
  it('CALL-02: modal has correct ARIA attributes', () => {
    mockCallStatus = 'ringing'
    mockPeerUsername = 'bob'

    render(<IncomingCallModal />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-caller-name')
  })

  // CALL-03: Accept button handler
  it('CALL-03: clicking Accept button calls acceptCall()', async () => {
    mockCallStatus = 'ringing'
    mockPeerUsername = 'bob'

    render(<IncomingCallModal />)

    const acceptBtn = screen.getByRole('button', { name: 'Accept call from bob' })
    await userEvent.click(acceptBtn)

    expect(mockAcceptCall).toHaveBeenCalledOnce()
  })

  // CALL-03: Reject button handler
  it('CALL-03: clicking Reject button calls rejectCall()', async () => {
    mockCallStatus = 'ringing'
    mockPeerUsername = 'bob'

    render(<IncomingCallModal />)

    const rejectBtn = screen.getByRole('button', { name: 'Reject call from bob' })
    await userEvent.click(rejectBtn)

    expect(mockRejectCall).toHaveBeenCalledOnce()
  })

  // CALL-02: Escape key accessibility (UI-SPEC §9)
  it('CALL-02: Escape key on backdrop calls rejectCall()', async () => {
    mockCallStatus = 'ringing'
    mockPeerUsername = 'bob'

    render(<IncomingCallModal />)

    await userEvent.keyboard('{Escape}')

    expect(mockRejectCall).toHaveBeenCalledOnce()
  })

})
