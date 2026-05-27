import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// ──────────────────────────────────────────────────────────────────
// Global RTCPeerConnection mock
// jsdom does not implement RTCPeerConnection — stub globally so all
// tests that import WebRTC code can run without a real browser.
// ──────────────────────────────────────────────────────────────────
class MockRTCPeerConnection {
  // Static registry — tests can retrieve the most-recently-created instance
  // via (globalThis.RTCPeerConnection as typeof MockRTCPeerConnection).lastInstance
  static lastInstance: MockRTCPeerConnection | null = null

  onicecandidate: ((e: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((e: RTCTrackEvent) => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  iceConnectionState = 'new'

  addTrack = vi.fn()
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' })
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' })
  setLocalDescription = vi.fn().mockResolvedValue(undefined)
  setRemoteDescription = vi.fn().mockResolvedValue(undefined)
  addIceCandidate = vi.fn().mockResolvedValue(undefined)
  close = vi.fn()

  constructor(_config?: RTCConfiguration) {
    MockRTCPeerConnection.lastInstance = this
  }
}

vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection)

// ──────────────────────────────────────────────────────────────────
// Global RTCSessionDescription mock
// jsdom does not implement RTCSessionDescription — stub to pass-through
// the init object so setRemoteDescription can receive it.
// ──────────────────────────────────────────────────────────────────
class MockRTCSessionDescription {
  type: RTCSdpType
  sdp: string
  constructor(init: RTCSessionDescriptionInit) {
    this.type = init.type as RTCSdpType
    this.sdp = init.sdp ?? ''
  }
}
vi.stubGlobal('RTCSessionDescription', MockRTCSessionDescription)

// ──────────────────────────────────────────────────────────────────
// Global RTCIceCandidate mock
// jsdom does not implement RTCIceCandidate — stub to pass-through init.
// ──────────────────────────────────────────────────────────────────
class MockRTCIceCandidate {
  candidate: string
  sdpMid: string | null
  sdpMLineIndex: number | null
  constructor(init?: RTCIceCandidateInit) {
    this.candidate = init?.candidate ?? ''
    this.sdpMid = init?.sdpMid ?? null
    this.sdpMLineIndex = init?.sdpMLineIndex ?? null
  }
}
vi.stubGlobal('RTCIceCandidate', MockRTCIceCandidate)

// ──────────────────────────────────────────────────────────────────
// Global navigator.mediaDevices.getUserMedia mock
// jsdom does not implement getUserMedia — stub to resolve with a
// mock MediaStream exposing getTracks() / getAudioTracks() /
// getVideoTracks() returning mockable track objects with stop() and
// enabled properties for Phase 5 toggle tests.
// ──────────────────────────────────────────────────────────────────
export const mockAudioTrack = { stop: vi.fn(), enabled: true }
export const mockVideoTrack = { stop: vi.fn(), enabled: true }
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([mockAudioTrack]),
  getAudioTracks: vi.fn().mockReturnValue([mockAudioTrack]),
  getVideoTracks: vi.fn().mockReturnValue([mockVideoTrack]),
}

vi.stubGlobal('navigator', {
  ...globalThis.navigator,
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
  },
})

afterEach(() => {
  cleanup()
})
