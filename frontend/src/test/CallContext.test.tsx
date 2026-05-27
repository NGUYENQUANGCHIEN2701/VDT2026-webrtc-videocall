import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CallProvider, useCall } from '@/contexts/CallContext'
import { mockAudioTrack, mockVideoTrack } from './setup'

// ──────────────────────────────────────────────────────────────────
// Mutable mock values — mutated per test case
// ──────────────────────────────────────────────────────────────────
let mockPublish = vi.fn()
let mockSubscribe = vi.fn()
let mockClient: { connected: boolean } = { connected: true }

// Capture subscribe callback so tests can simulate incoming signals
let subscribeCallbackRef: ((frame: { body: string }) => void) | null = null

// Mock react-router-dom — partial mock preserving all actual exports
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
    client: mockClient,
    onlineUsers: [],
    isLoading: false,
    connect: vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
    subscribe: mockSubscribe,
    publish: mockPublish,
  }),
}))

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'mock-token',
    username: 'alice',
    dispatch: vi.fn(),
  }),
}))

// ──────────────────────────────────────────────────────────────────
// Signal message shape — matches backend SignalMessage DTO
// { to, type, from, payload } — from is always overwritten server-side
// ──────────────────────────────────────────────────────────────────
interface SignalMessage {
  to: string
  type: string
  from: string
  payload: string
}

// Helper wrapper providing CallProvider + MemoryRouter
function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <CallProvider>{children}</CallProvider>
    </MemoryRouter>
  )
}

// Helper: simulate an incoming STOMP signal frame
function simulateSignal(msg: SignalMessage) {
  if (subscribeCallbackRef) {
    subscribeCallbackRef({ body: JSON.stringify(msg) })
  }
}

// ──────────────────────────────────────────────────────────────────
// Test suite
// ──────────────────────────────────────────────────────────────────
describe('CallContext', () => {

  beforeEach(() => {
    // Reset mocks before each test
    mockPublish = vi.fn()
    mockSubscribe = vi.fn().mockImplementation((_dest: string, cb: (frame: { body: string }) => void) => {
      subscribeCallbackRef = cb
      return { unsubscribe: vi.fn() }
    })
    mockClient = { connected: true }
    mockNavigate.mockReset()
    subscribeCallbackRef = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-01: outgoing call
  // ──────────────────────────────────────────────────────────────────
  it('CALL-01: startCall(targetUsername) sets callStatus to "calling" and publishes call-request signal', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    expect(result.current.callStatus).toBe('calling')
    expect(mockPublish).toHaveBeenCalledWith(
      '/app/signal',
      expect.stringContaining('"type":"call-request"'),
    )
    expect(mockPublish).toHaveBeenCalledWith(
      '/app/signal',
      expect.stringContaining('"to":"bob"'),
    )
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-01: self-call guard (threat T-4-03)
  // ──────────────────────────────────────────────────────────────────
  it('CALL-01: startCall guards against self-call (no-op when targetUsername === authUsername)', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('alice') // same as mocked username
    })

    expect(mockPublish).not.toHaveBeenCalled()
    expect(result.current.callStatus).toBe('idle')
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-02: incoming call-request signal
  // ──────────────────────────────────────────────────────────────────
  it('CALL-02: call-request signal sets callStatus to "ringing" and stores peerUsername from msg.from', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Wait for subscription to be set up
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    act(() => {
      simulateSignal({ type: 'call-request', from: 'bob', to: 'alice', payload: '' })
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('ringing')
    })
    expect(result.current.peerUsername).toBe('bob')
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-07: 30s no-answer timeout
  // ──────────────────────────────────────────────────────────────────
  it('CALL-07: 30s timeout fires call-end signal and adds "No answer" toast', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useCall(), { wrapper })

    // startCall uses getUserMedia (async) — run with fake timers by
    // using vi.runAllTicks() / runAllTimersAsync pattern
    await act(async () => {
      // Need to run async tasks while fake timers are active
      const startCallPromise = result.current.startCall('bob')
      // Flush microtasks so getUserMedia resolves
      await vi.runAllTicks()
      await startCallPromise
    })

    expect(result.current.callStatus).toBe('calling')

    // Advance 30 seconds to trigger timeout callback
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      // Flush any microtasks triggered by the timeout callback
      await vi.runAllTicks()
    })

    // Verify call-end was published
    const callEndPublish = mockPublish.mock.calls.find((call) => {
      try {
        const body = JSON.parse(call[1] as string) as { type: string }
        return body.type === 'call-end'
      } catch {
        return false
      }
    })
    expect(callEndPublish).toBeDefined()

    // Verify state reset to idle
    expect(result.current.callStatus).toBe('idle')

    // Verify "No answer" toast added
    expect(result.current.toasts.some((t) => t.message === 'No answer')).toBe(true)
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-08: hangUp
  // ──────────────────────────────────────────────────────────────────
  it('CALL-08: hangUp publishes call-end signal and runs teardown', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Start a call first
    await act(async () => {
      await result.current.startCall('bob')
    })

    expect(result.current.callStatus).toBe('calling')

    // Now hangUp
    act(() => {
      result.current.hangUp()
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('idle')
    })

    // Should have published call-end signal
    const callEndPublish = mockPublish.mock.calls.find((call) => {
      try {
        const body = JSON.parse(call[1] as string) as { type: string }
        return body.type === 'call-end'
      } catch {
        return false
      }
    })
    expect(callEndPublish).toBeDefined()
    expect(result.current.localStream).toBeNull()
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-03: reject incoming call
  // ──────────────────────────────────────────────────────────────────
  it('CALL-03: rejectCall publishes call-decline signal and returns state to idle', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Set up ringing state via incoming call-request signal
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    act(() => {
      simulateSignal({ type: 'call-request', from: 'bob', to: 'alice', payload: '' })
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('ringing')
    })

    // Now reject
    act(() => {
      result.current.rejectCall()
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('idle')
    })

    expect(mockPublish).toHaveBeenCalledWith(
      '/app/signal',
      expect.stringContaining('"type":"call-decline"'),
    )
    expect(mockPublish).toHaveBeenCalledWith(
      '/app/signal',
      expect.stringContaining('"to":"bob"'),
    )
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-03: accept incoming call
  // ──────────────────────────────────────────────────────────────────
  it('CALL-03: acceptCall publishes call-accept signal, acquires getUserMedia, navigates to /call', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Set up ringing state
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    act(() => {
      simulateSignal({ type: 'call-request', from: 'bob', to: 'alice', payload: '' })
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('ringing')
    })

    // Accept the call
    await act(async () => {
      await result.current.acceptCall()
    })

    expect(mockPublish).toHaveBeenCalledWith(
      '/app/signal',
      expect.stringContaining('"type":"call-accept"'),
    )
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/call')
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-04: caller receives call-accept and creates offer
  // ──────────────────────────────────────────────────────────────────
  it('CALL-04: call-accept signal triggers createOffer and publishes offer signal', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Start call (puts us in 'calling' state with a pc)
    await act(async () => {
      await result.current.startCall('bob')
    })

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    // Simulate caller receiving call-accept from callee
    await act(async () => {
      simulateSignal({ type: 'call-accept', from: 'bob', to: 'alice', payload: '' })
      // Wait for async operations
      await Promise.resolve()
    })

    await waitFor(() => {
      const offerPublish = mockPublish.mock.calls.find((call) => {
        try {
          const body = JSON.parse(call[1] as string) as { type: string }
          return body.type === 'offer'
        } catch {
          return false
        }
      })
      expect(offerPublish).toBeDefined()
    })

    expect(mockNavigate).toHaveBeenCalledWith('/call')
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-04: callee receives offer and creates answer
  // ──────────────────────────────────────────────────────────────────
  it('CALL-04: offer signal calls setRemoteDescription and publishes answer signal', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Set up as callee: first accept the call to have a pc
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    act(() => {
      simulateSignal({ type: 'call-request', from: 'bob', to: 'alice', payload: '' })
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('ringing')
    })

    await act(async () => {
      await result.current.acceptCall()
    })

    // Now simulate receiving an offer
    await act(async () => {
      simulateSignal({
        type: 'offer',
        from: 'bob',
        to: 'alice',
        payload: JSON.stringify({ type: 'offer', sdp: 'mock-sdp' }),
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      const answerPublish = mockPublish.mock.calls.find((call) => {
        try {
          const body = JSON.parse(call[1] as string) as { type: string }
          return body.type === 'answer'
        } catch {
          return false
        }
      })
      expect(answerPublish).toBeDefined()
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // CALL-04: ICE candidate buffering
  // ──────────────────────────────────────────────────────────────────
  it('CALL-04: ice-candidate signal before setRemoteDescription buffers candidate; drains after', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Accept call to get a pc
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    act(() => {
      simulateSignal({ type: 'call-request', from: 'bob', to: 'alice', payload: '' })
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('ringing')
    })

    await act(async () => {
      await result.current.acceptCall()
    })

    // Get the MockRTCPeerConnection instance that was created
    // We use RTCPeerConnection constructor from setup.ts (MockRTCPeerConnection)
    const MockPC = globalThis.RTCPeerConnection as unknown as {
      lastInstance?: {
        addIceCandidate: ReturnType<typeof vi.fn>
        setRemoteDescription: ReturnType<typeof vi.fn>
      }
    }

    // Send ICE candidates BEFORE offer (before setRemoteDescription)
    act(() => {
      simulateSignal({
        type: 'ice-candidate',
        from: 'bob',
        to: 'alice',
        payload: JSON.stringify({ candidate: 'candidate1', sdpMid: '0', sdpMLineIndex: 0 }),
      })
    })

    act(() => {
      simulateSignal({
        type: 'ice-candidate',
        from: 'bob',
        to: 'alice',
        payload: JSON.stringify({ candidate: 'candidate2', sdpMid: '0', sdpMLineIndex: 0 }),
      })
    })

    // At this point candidates should NOT have been added yet (no remote description set)
    if (MockPC.lastInstance) {
      expect(MockPC.lastInstance.addIceCandidate).not.toHaveBeenCalled()
    }

    // Now send the offer — triggers setRemoteDescription and drains buffer
    await act(async () => {
      simulateSignal({
        type: 'offer',
        from: 'bob',
        to: 'alice',
        payload: JSON.stringify({ type: 'offer', sdp: 'mock-sdp' }),
      })
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // After offer handled, both buffered ICE candidates should have been added
    if (MockPC.lastInstance) {
      await waitFor(() => {
        expect(MockPC.lastInstance!.addIceCandidate).toHaveBeenCalledTimes(2)
      })
    }
  })

  // ──────────────────────────────────────────────────────────────────
  // Toast: call-decline signal received shows "Call declined" toast
  // ──────────────────────────────────────────────────────────────────
  it('call-decline signal received adds toast with message "Call declined"', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Become caller
    await act(async () => {
      await result.current.startCall('bob')
    })

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    // Simulate callee declining
    act(() => {
      simulateSignal({ type: 'call-decline', from: 'bob', to: 'alice', payload: '' })
    })

    await waitFor(() => {
      expect(result.current.toasts.some((t) => t.message === 'Call declined')).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // Toast: call-end signal received shows "Call ended" toast
  // ──────────────────────────────────────────────────────────────────
  it('call-end signal received adds toast with message "Call ended"', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    // Become caller
    await act(async () => {
      await result.current.startCall('bob')
    })

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    // Simulate remote hanging up
    act(() => {
      simulateSignal({ type: 'call-end', from: 'bob', to: 'alice', payload: '' })
    })

    await waitFor(() => {
      expect(result.current.toasts.some((t) => t.message === 'Call ended')).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // CTRL-01: mic mute toggle
  // ──────────────────────────────────────────────────────────────────
  it('CTRL-01a: toggleMute sets isMuted to true', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    expect(result.current.isMuted).toBe(false)

    act(() => {
      result.current.toggleMute()
    })

    await waitFor(() => {
      expect(result.current.isMuted).toBe(true)
    })
  })

  it('CTRL-01b: toggleMute sets audioTrack.enabled to false', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    // Reset enabled to true before test
    mockAudioTrack.enabled = true

    act(() => {
      result.current.toggleMute()
    })

    await waitFor(() => {
      expect(result.current.isMuted).toBe(true)
    })

    expect(mockAudioTrack.enabled).toBe(false)
  })

  it('CTRL-01c: toggleMute twice returns isMuted to false and audioTrack.enabled to true', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    // Reset enabled to true before test
    mockAudioTrack.enabled = true

    act(() => {
      result.current.toggleMute()
    })

    await waitFor(() => {
      expect(result.current.isMuted).toBe(true)
    })

    act(() => {
      result.current.toggleMute()
    })

    await waitFor(() => {
      expect(result.current.isMuted).toBe(false)
    })

    expect(mockAudioTrack.enabled).toBe(true)
  })

  // ──────────────────────────────────────────────────────────────────
  // CTRL-02: camera toggle
  // ──────────────────────────────────────────────────────────────────
  it('CTRL-02a: toggleCamera sets isCameraOff to true', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    expect(result.current.isCameraOff).toBe(false)

    act(() => {
      result.current.toggleCamera()
    })

    await waitFor(() => {
      expect(result.current.isCameraOff).toBe(true)
    })
  })

  it('CTRL-02b: toggleCamera sets videoTrack.enabled to false', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    // Reset enabled to true before test
    mockVideoTrack.enabled = true

    act(() => {
      result.current.toggleCamera()
    })

    await waitFor(() => {
      expect(result.current.isCameraOff).toBe(true)
    })

    expect(mockVideoTrack.enabled).toBe(false)
  })

  it('CTRL-02c: toggleCamera is a no-op when localStream has no video tracks', async () => {
    // Override getUserMedia to return audio-only stream for this test
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce({
      getTracks: vi.fn().mockReturnValue([mockAudioTrack]),
      getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
      getVideoTracks: vi.fn().mockReturnValue([]),
    } as unknown as MediaStream)

    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    expect(result.current.isCameraOff).toBe(false)

    act(() => {
      result.current.toggleCamera()
    })

    // isCameraOff should remain false — no video tracks, so no-op
    await waitFor(() => {
      expect(result.current.isCameraOff).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // CTRL-03: teardown resets isMuted, isCameraOff, iceState
  // ──────────────────────────────────────────────────────────────────
  it('CTRL-03: teardown resets isMuted, isCameraOff, iceState to initial values', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith('/user/queue/signal', expect.any(Function))
    })

    // Toggle mute and camera
    act(() => {
      result.current.toggleMute()
      result.current.toggleCamera()
    })

    await waitFor(() => {
      expect(result.current.isMuted).toBe(true)
      expect(result.current.isCameraOff).toBe(true)
    })

    // Fire ICE handler to set iceState
    const MockPC = globalThis.RTCPeerConnection as unknown as {
      lastInstance?: {
        iceConnectionState: string
        oniceconnectionstatechange: (() => void) | null
      }
    }

    if (MockPC.lastInstance) {
      MockPC.lastInstance.iceConnectionState = 'connected'
      act(() => {
        MockPC.lastInstance!.oniceconnectionstatechange?.()
      })
    }

    await waitFor(() => {
      expect(result.current.iceState).toBe('connected')
    })

    // Now hang up — triggers teardown
    act(() => {
      result.current.hangUp()
    })

    await waitFor(() => {
      expect(result.current.callStatus).toBe('idle')
      expect(result.current.isMuted).toBe(false)
      expect(result.current.isCameraOff).toBe(false)
      expect(result.current.iceState).toBeNull()
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // CTRL-05: iceState tracking via oniceconnectionstatechange
  // ──────────────────────────────────────────────────────────────────
  it('CTRL-05: iceState set on ICE state change to "connected"', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    expect(result.current.iceState).toBeNull()

    const MockPC = globalThis.RTCPeerConnection as unknown as {
      lastInstance?: {
        iceConnectionState: string
        oniceconnectionstatechange: (() => void) | null
      }
    }

    if (MockPC.lastInstance) {
      MockPC.lastInstance.iceConnectionState = 'connected'
      act(() => {
        MockPC.lastInstance!.oniceconnectionstatechange?.()
      })
    }

    await waitFor(() => {
      expect(result.current.iceState).toBe('connected')
    })
  })

  it('CTRL-05b: iceState set to "checking" on ICE state change', async () => {
    const { result } = renderHook(() => useCall(), { wrapper })

    await act(async () => {
      await result.current.startCall('bob')
    })

    const MockPC = globalThis.RTCPeerConnection as unknown as {
      lastInstance?: {
        iceConnectionState: string
        oniceconnectionstatechange: (() => void) | null
      }
    }

    if (MockPC.lastInstance) {
      MockPC.lastInstance.iceConnectionState = 'checking'
      act(() => {
        MockPC.lastInstance!.oniceconnectionstatechange?.()
      })
    }

    await waitFor(() => {
      expect(result.current.iceState).toBe('checking')
    })
  })

})
