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
// mock MediaStream exposing getTracks() returning mock tracks each
// with a stop() vi.fn().
// ──────────────────────────────────────────────────────────────────
const mockTrack = { stop: vi.fn() }
const mockMediaStream = {
  getTracks: vi.fn().mockReturnValue([mockTrack]),
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
