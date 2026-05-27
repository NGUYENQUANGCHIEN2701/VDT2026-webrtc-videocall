import { describe, it, vi, beforeEach, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CallPage from '@/pages/CallPage'

// ──────────────────────────────────────────────────────────────────
// Mutable mock values — mutated per test case
// ──────────────────────────────────────────────────────────────────
const mockHangUp = vi.fn()
let mockLocalStream: MediaStream | null = null
let mockRemoteStream: MediaStream | null = null
let mockPeerUsername: string | null = 'bob'

// Mock CallContext — provides mutable values via closure
vi.mock('@/contexts/CallContext', () => ({
  useCall: () => ({
    callStatus: 'connected',
    peerUsername: mockPeerUsername,
    localStream: mockLocalStream,
    remoteStream: mockRemoteStream,
    toasts: [],
    startCall: vi.fn().mockResolvedValue(undefined),
    acceptCall: vi.fn().mockResolvedValue(undefined),
    rejectCall: vi.fn(),
    hangUp: mockHangUp,
  }),
}))

function renderCallPage() {
  return render(
    <MemoryRouter initialEntries={['/call']}>
      <CallPage />
    </MemoryRouter>
  )
}

// ──────────────────────────────────────────────────────────────────
// Test suite — Plan 04 activates all tests
// ──────────────────────────────────────────────────────────────────
describe('CallPage', () => {

  beforeEach(() => {
    mockHangUp.mockClear()
    mockLocalStream = null
    mockRemoteStream = null
    mockPeerUsername = 'bob'
  })

  // UI-03: remote video element
  it('UI-03: renders remote <video> with aria-label="Remote video stream"', () => {
    renderCallPage()
    const remoteVideo = screen.getByLabelText('Remote video stream')
    expect(remoteVideo).toBeInTheDocument()
    expect(remoteVideo.tagName).toBe('VIDEO')
    expect(remoteVideo).not.toHaveAttribute('muted')
  })

  // UI-03: local video element (muted, self-view)
  it('UI-03: renders local <video> with aria-label="Local video preview" and muted attribute', () => {
    renderCallPage()
    const localVideo = screen.getByLabelText('Local video preview') as HTMLVideoElement
    expect(localVideo).toBeInTheDocument()
    expect(localVideo.tagName).toBe('VIDEO')
    // React sets `muted` as a DOM property, not an HTML attribute — use .muted instead of toHaveAttribute
    // This is a jsdom limitation: boolean media attributes need property access, not getAttribute()
    expect(localVideo.muted).toBe(true)
    expect(localVideo.className).toContain('scale-x-[-1]')
  })

  // UI-03: hang-up button accessibility
  it('UI-03: hang-up button has aria-label="End call"', () => {
    renderCallPage()
    const endCallButton = screen.getByRole('button', { name: 'End call' })
    expect(endCallButton).toBeInTheDocument()
  })

  // UI-03: hang-up button click
  it('UI-03: clicking hang-up button calls hangUp()', () => {
    renderCallPage()
    const endCallButton = screen.getByRole('button', { name: 'End call' })
    fireEvent.click(endCallButton)
    expect(mockHangUp).toHaveBeenCalledTimes(1)
  })

  // UI-03: remote video placeholder when stream is null
  it('UI-03: shows "Waiting for remote video..." placeholder when remoteStream is null', () => {
    mockRemoteStream = null
    renderCallPage()
    expect(screen.getByText('Waiting for remote video...')).toBeInTheDocument()
  })

  // UI-03: peer username overlay
  it('UI-03: renders peer username overlay top-left when peerUsername is set', () => {
    mockPeerUsername = 'bob'
    renderCallPage()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  // Pitfall 3: srcObject updates when remoteStream changes
  it('Pitfall 3: srcObject of remote video updates when remoteStream changes from null to a value', () => {
    const { rerender } = renderCallPage()

    // Initially null — video srcObject should be null
    const remoteVideo = screen.getByLabelText('Remote video stream') as HTMLVideoElement
    expect(remoteVideo.srcObject).toBeNull()

    // Update mockRemoteStream and rerender
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream
    mockRemoteStream = fakeStream
    rerender(
      <MemoryRouter initialEntries={['/call']}>
        <CallPage />
      </MemoryRouter>
    )

    expect(remoteVideo.srcObject).toBe(fakeStream)
  })

})
