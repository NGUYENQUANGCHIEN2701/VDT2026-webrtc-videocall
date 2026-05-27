import { describe, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CallPage from '@/pages/CallPage'

// ──────────────────────────────────────────────────────────────────
// Mutable mock values — Plan 04 will mutate these per test case
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

// Suppress unused variable warnings — Plan 04 mutates these in test bodies
void mockLocalStream
void mockRemoteStream
void mockPeerUsername

function renderCallPage() {
  return render(
    <MemoryRouter initialEntries={['/call']}>
      <CallPage />
    </MemoryRouter>
  )
}

// ──────────────────────────────────────────────────────────────────
// Test scaffold — Wave 0 stubs
// Plan 04 converts it.skip → it and fills each body.
// Descriptions match VALIDATION.md requirement IDs exactly.
// ──────────────────────────────────────────────────────────────────
describe('CallPage', () => {

  // UI-03: remote video element
  it.skip('UI-03: renders remote <video> with aria-label="Remote video stream"', () => {
    // Plan 04 implements:
    // - renderCallPage()
    // - expect screen.getByRole('video', { name: 'Remote video stream' }) or
    //   screen.getByLabelText('Remote video stream') to be in document
  })

  // UI-03: local video element (muted, self-view)
  it.skip('UI-03: renders local <video> with aria-label="Local video preview" and muted attribute', () => {
    // Plan 04 implements:
    // - renderCallPage()
    // - const localVideo = screen.getByLabelText('Local video preview')
    // - expect localVideo).toHaveAttribute('muted')
  })

  // UI-03: hang-up button accessibility
  it.skip('UI-03: hang-up button has aria-label="End call"', () => {
    // Plan 04 implements:
    // - renderCallPage()
    // - expect screen.getByRole('button', { name: 'End call' }) to be in document
  })

  // UI-03: hang-up button click
  it.skip('UI-03: clicking hang-up button calls hangUp()', () => {
    // Plan 04 implements:
    // - renderCallPage()
    // - userEvent.click(screen.getByRole('button', { name: 'End call' }))
    // - expect mockHangUp called once
  })

  // UI-03: remote video placeholder when stream is null
  it.skip('UI-03: shows "Waiting for remote video..." placeholder when remoteStream is null', () => {
    // Plan 04 implements:
    // - set mockRemoteStream = null
    // - renderCallPage()
    // - expect screen.getByText('Waiting for remote video...') to be in document
  })

})
