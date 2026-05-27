import { describe, it, vi, beforeEach, afterEach, expect, act } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CallPage from '@/pages/CallPage'

// ──────────────────────────────────────────────────────────────────
// Mutable mock values — mutated per test case
// ──────────────────────────────────────────────────────────────────
const mockHangUp = vi.fn()
const mockToggleMute = vi.fn()
const mockToggleCamera = vi.fn()
let mockLocalStream: MediaStream | null = null
let mockRemoteStream: MediaStream | null = null
let mockPeerUsername: string | null = 'bob'
let mockIsMuted = false
let mockIsCameraOff = false
let mockIceState: RTCIceConnectionState | null = null
let mockCallStatus = 'connected'

// Mock CallContext — provides mutable values via closure
vi.mock('@/contexts/CallContext', () => ({
  useCall: () => ({
    callStatus: mockCallStatus,
    peerUsername: mockPeerUsername,
    localStream: mockLocalStream,
    remoteStream: mockRemoteStream,
    toasts: [],
    startCall: vi.fn().mockResolvedValue(undefined),
    acceptCall: vi.fn().mockResolvedValue(undefined),
    rejectCall: vi.fn(),
    hangUp: mockHangUp,
    isMuted: mockIsMuted,
    isCameraOff: mockIsCameraOff,
    iceState: mockIceState,
    toggleMute: mockToggleMute,
    toggleCamera: mockToggleCamera,
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
    mockToggleMute.mockClear()
    mockToggleCamera.mockClear()
    mockLocalStream = null
    mockRemoteStream = null
    mockPeerUsername = 'bob'
    mockIsMuted = false
    mockIsCameraOff = false
    mockIceState = null
    mockCallStatus = 'connected'
  })

  afterEach(() => {
    vi.useRealTimers()
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

  // ──────────────────────────────────────────────────────────────────
  // Phase 5 — CTRL-01 through CTRL-05 tests (Plan 02)
  // ──────────────────────────────────────────────────────────────────

  // 05-02-01: CTRL-01 — mic button aria-label when active
  it('05-02-01: CTRL-01 — mic button has aria-label="Mute microphone" when isMuted=false', () => {
    mockIsMuted = false
    renderCallPage()
    const micButton = screen.getByRole('button', { name: 'Mute microphone' })
    expect(micButton).toBeInTheDocument()
  })

  // 05-02-02: CTRL-01 — mic button aria-label when muted
  it('05-02-02: CTRL-01 — mic button has aria-label="Unmute microphone" when isMuted=true', () => {
    mockIsMuted = true
    renderCallPage()
    const micButton = screen.getByRole('button', { name: 'Unmute microphone' })
    expect(micButton).toBeInTheDocument()
  })

  // 05-02-03: CTRL-01 — clicking mic button calls toggleMute
  it('05-02-03: CTRL-01 — clicking mic button calls mockToggleMute once', () => {
    mockIsMuted = false
    renderCallPage()
    const micButton = screen.getByRole('button', { name: 'Mute microphone' })
    fireEvent.click(micButton)
    expect(mockToggleMute).toHaveBeenCalledTimes(1)
  })

  // 05-02-04: CTRL-02 — camera button aria-label when active and stream has video tracks
  it('05-02-04: CTRL-02 — camera button has aria-label="Turn off camera" when isCameraOff=false and stream has video tracks', () => {
    mockIsCameraOff = false
    mockLocalStream = { getVideoTracks: () => [{ enabled: true }], getTracks: () => [] } as unknown as MediaStream
    renderCallPage()
    const cameraButton = screen.getByRole('button', { name: 'Turn off camera' })
    expect(cameraButton).toBeInTheDocument()
  })

  // 05-02-05: CTRL-02 — camera button disabled when no video tracks
  it('05-02-05: CTRL-02 — camera button has aria-label="Camera unavailable" and is disabled when stream has no video tracks', () => {
    mockLocalStream = { getVideoTracks: () => [], getTracks: () => [] } as unknown as MediaStream
    renderCallPage()
    const cameraButton = screen.getByRole('button', { name: 'Camera unavailable' })
    expect(cameraButton).toBeInTheDocument()
    expect(cameraButton).toBeDisabled()
  })

  // 05-02-06: CTRL-04 — timer shows "00:00" when callStatus is not 'connected'
  it('05-02-06: CTRL-04 — timer shows "00:00" when callStatus="calling"', () => {
    mockCallStatus = 'calling'
    renderCallPage()
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  // 05-02-07: CTRL-04 — timer increments when connected
  it('05-02-07: CTRL-04 — timer increments to "00:03" after advancing fake timers 3s when callStatus="connected"', async () => {
    vi.useFakeTimers()
    mockCallStatus = 'connected'
    renderCallPage()
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('00:03')).toBeInTheDocument()
  })

  // 05-02-08: CTRL-05 — status pill shows Connecting when iceState is null
  it('05-02-08: CTRL-05 — status pill contains "● Connecting..." when iceState=null', () => {
    mockIceState = null
    renderCallPage()
    expect(screen.getByText('● Connecting...')).toBeInTheDocument()
  })

  // 05-02-09: CTRL-05 — status pill shows Connected
  it('05-02-09: CTRL-05 — status pill contains "● Connected" when iceState="connected"', () => {
    mockIceState = 'connected'
    renderCallPage()
    expect(screen.getByText('● Connected')).toBeInTheDocument()
  })

  // 05-02-10: CTRL-05 — status pill shows Reconnecting
  it('05-02-10: CTRL-05 — status pill contains "● Reconnecting..." when iceState="disconnected"', () => {
    mockIceState = 'disconnected'
    renderCallPage()
    expect(screen.getByText('● Reconnecting...')).toBeInTheDocument()
  })

  // 05-02-11: CTRL-05 — status pill has correct ARIA attributes
  it('05-02-11: CTRL-05 — status pill has role="status" and aria-live="polite"', () => {
    renderCallPage()
    const statusPill = screen.getByRole('status')
    expect(statusPill).toHaveAttribute('aria-live', 'polite')
  })

})
