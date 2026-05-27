import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// ──────────────────────────────────────────────────────────────────
// Global RTCPeerConnection mock
// jsdom does not implement RTCPeerConnection — stub globally so all
// tests that import WebRTC code can run without a real browser.
// ──────────────────────────────────────────────────────────────────
class MockRTCPeerConnection {
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
}

vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection)

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
