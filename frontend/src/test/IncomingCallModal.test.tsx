import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
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
// Test scaffold — Wave 0 stubs (+ 1 active test against stub)
// Plan 03 converts it.skip → it and fills each body.
// ──────────────────────────────────────────────────────────────────
describe('IncomingCallModal', () => {

  // ACTIVE: stub already returns null when not ringing — test this now
  it('CALL-02: renders nothing when callStatus !== "ringing"', () => {
    mockCallStatus = 'idle'
    mockPeerUsername = null

    const { container } = render(<IncomingCallModal />)

    // Stub returns null → container has no children
    expect(container.firstChild).toBeNull()
  })

  // CALL-02: modal renders when ringing
  it.skip('CALL-02: renders modal when callStatus === "ringing" with caller name', () => {
    // Plan 03 implements:
    // - set mockCallStatus = 'ringing', mockPeerUsername = 'bob'
    // - render IncomingCallModal
    // - expect screen.getByRole('dialog') to be in document
    // - expect screen.getByText(/bob/i) to be in document
    // - expect screen.getByText(/Incoming Call/i) to be in document
  })

  // CALL-03: Accept button handler
  it.skip('CALL-03: clicking Accept button calls acceptCall()', () => {
    // Plan 03 implements:
    // - set mockCallStatus = 'ringing'
    // - render, click Accept button
    // - expect mockAcceptCall called once
  })

  // CALL-03: Reject button handler
  it.skip('CALL-03: clicking Reject button calls rejectCall()', () => {
    // Plan 03 implements:
    // - set mockCallStatus = 'ringing'
    // - render, click Reject button
    // - expect mockRejectCall called once
  })

  // CALL-02: Escape key accessibility (UI-SPEC §9)
  it.skip('CALL-02: Escape key on backdrop calls rejectCall()', () => {
    // Plan 03 implements:
    // - set mockCallStatus = 'ringing'
    // - render, press Escape key
    // - expect mockRejectCall called once
  })

})
