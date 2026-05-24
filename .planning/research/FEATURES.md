# Feature Landscape

**Domain:** WebRTC 1-1 (and group) video call web application
**Project:** VDT-WebRTC — Viettel Digital Talent internship deliverable
**Researched:** 2026-05-24
**Confidence:** HIGH (MDN WebRTC docs, Screen Capture API, MediaRecorder API verified)

---

## Table Stakes

Features users expect at minimum. Missing any of these makes the product feel broken or unfinished, which directly costs demo score.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User registration + login | Entry point to all functionality | Low | Username + password, JWT; already in scope |
| Online user list (realtime) | How users discover who to call | Low-Med | WebSocket push updates; list must auto-refresh on join/leave without page reload |
| Incoming call notification (ring UI) | Without this, callee has no way to know they are being called | Low | Modal/overlay with caller name + Accept/Reject buttons; ringtone audio strongly recommended |
| Accept / Reject call | Callee must be able to decline gracefully | Low | Reject sends hang-up signal; caller sees "Call declined" state |
| Mute microphone toggle | Universal expectation in every call product | Low | Toggle `audioTrack.enabled`; button must show current state visually |
| Camera on/off toggle | Universal expectation; privacy control | Low | Toggle `videoTrack.enabled`; show placeholder/avatar when off |
| End call button | Always visible, one tap to exit | Low | Both parties can hang up at any time; must clean up all tracks and peer connection |
| Local video preview (picture-in-picture style) | Users expect to see themselves | Low | Small self-view overlay on top of remote video; positioned bottom-right by convention |
| Remote video (full-screen dominant) | Primary call view | Low | `<video autoplay playsinline>` with remote stream; must fill available space |
| Connection status indicator | Users need to know if call is connecting vs connected | Low | Show "Connecting...", "Connected", "Reconnecting..." states visually |
| Error state handling | Failed connections must show human-readable messages | Med | ICE failure, getUserMedia denied, peer disconnected unexpectedly |
| Call duration timer | Shows call is live and functioning | Low | Simple elapsed seconds counter once `connectionState === "connected"` |

---

## Differentiators

Features that are not expected but elevate the demo significantly. All three are explicitly in scope for high score.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Screen sharing (mid-call) | Enables collaboration use case; technically impressive | Med | `getDisplayMedia()` + `sender.replaceTrack(screenTrack)` — no full renegotiation needed in most cases; toggle back to camera requires another `replaceTrack` |
| Group call — mesh P2P (3-5 people) | Extends 1-1 to multi-party; shows architecture understanding | High | N*(N-1)/2 peer connections; each participant manages connections to all others; UI must layout N video tiles dynamically |
| Call recording (local download) | Tangible output users can inspect; impressive for demo | Med | `MediaRecorder(combinedStream)`; collect `dataavailable` chunks; on stop: Blob → `URL.createObjectURL` → auto-download `.webm` file |
| Screen share + system audio | Captures tab/system audio alongside screen video | Low-Med | `getDisplayMedia({ audio: true, video: true })` — browser may prompt user; Chrome supports it, Firefox partial |
| Polite/impolite negotiation (perfect negotiation pattern) | Handles offer collisions and renegotiation cleanly; no demo-crashing glitches | Med | Assign polite role to callee; single negotiation codebase for both peers; critical for screen share track replacement |
| Camera picture-in-picture during screen share | When screen sharing, keep small webcam overlay so remote sees your face | Med | Render both streams simultaneously; webcam as overlay on screen share |
| Visual call quality indicator | Signal strength / ICE candidate type displayed | Low | Read `RTCStatsReport`; show host vs srflx vs relay type; good for demo storytelling |

---

## Anti-Features

Deliberate exclusions. These would expand scope without proportional demo value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| TURN server / relay setup | No value on LAN; production complexity not needed for demo | Use Google STUN (`stun.l.google.com:19302`); document the LAN assumption clearly |
| SFU/MCU for group call | Requires separate media server (mediasoup, Janus, Jitsi); far outside scope | Mesh P2P: each peer connects to all others; works fine for 3-5 people |
| Chat/text messaging during call | Adds data channel complexity; not in requirements | Out of scope; demo video/audio only |
| File transfer | Data channel + chunking complexity; not required | Out of scope |
| Server-side recording storage | Needs storage, codec processing on backend | Local download via `URL.createObjectURL` is sufficient |
| Push notifications (FCM/APNS) | Mobile push; browser-only app, WebSocket is enough | WebSocket delivers incoming call notification while app is open |
| End-to-end encryption beyond WebRTC defaults | DTLS/SRTP is automatic; manual E2E adds complexity with no demo benefit | WebRTC handles it natively; no additional implementation needed |
| Full mobile responsive layout | Not a mobile app; LAN demo on desktop browser | Ensure it works at 1080p desktop; no need for phone layouts |
| Virtual backgrounds / video filters | Requires WebGL/TensorFlow.js; massive scope expansion | Not in requirements |
| Custom noise cancellation | Browser handles this via getUserMedia constraints | `{ audio: { echoCancellation: true, noiseSuppression: true } }` is enough |

---

## Call State Machine

The application UI and signaling must track this state explicitly. Mapping signaling events to UI states is where most bugs occur.

```
IDLE
  │
  ├─[User clicks Call]──────────────────► CALLING (outgoing ring)
  │                                          │
  │                                          ├─[Callee accepts]──► CONNECTING
  │                                          ├─[Callee rejects]──► IDLE (show "Call declined")
  │                                          ├─[No answer / timeout ~30s]──► IDLE (show "No answer")
  │                                          └─[Caller cancels]──► IDLE
  │
  ├─[Incoming call signal received]────► RINGING (incoming ring)
  │                                          │
  │                                          ├─[User accepts]────► CONNECTING
  │                                          └─[User rejects]────► IDLE (send reject signal)
  │
CONNECTING (WebRTC handshake: SDP offer/answer + ICE gathering)
  │   RTCPeerConnection.connectionState: "new" → "connecting"
  │   RTCPeerConnection.iceConnectionState: "checking" → "connected"
  │
  ├─[connectionState === "connected"]──► IN_CALL
  └─[connectionState === "failed"]─────► IDLE (show "Connection failed")

IN_CALL (media flowing)
  │   Sub-states tracked independently (orthogonal flags):
  │   - micEnabled: boolean
  │   - cameraEnabled: boolean
  │   - screenSharing: boolean
  │   - recording: boolean
  │
  ├─[Either party sends hang-up]───────► ENDING
  └─[connectionState === "disconnected"]► RECONNECTING (brief grace period ~5s)
        └─[timeout or "failed"]──────────► IDLE (show "Call ended unexpectedly")

ENDING (cleanup: stop all tracks, close RTCPeerConnection, reset state)
  └──────────────────────────────────────► IDLE
```

### Signaling Messages (WebSocket STOMP topics)

| Message | Direction | Trigger |
|---------|-----------|---------|
| `call-request` | Caller → Callee | User initiates call |
| `call-accept` | Callee → Caller | User clicks Accept |
| `call-reject` | Callee → Caller | User clicks Reject |
| `call-cancel` | Caller → Callee | Caller hangs up before answer |
| `sdp-offer` | Caller → Callee | After callee accepts, caller sends SDP offer |
| `sdp-answer` | Callee → Caller | Response to SDP offer |
| `ice-candidate` | Both → Both | ICE candidates trickled continuously |
| `hang-up` | Either → Other | End call while IN_CALL |
| `user-busy` | Callee → Caller | Auto-reject when callee is already in a call |

---

## UI/UX Patterns for Call Controls

### Call Controls Bar

Render as a horizontal bar at the bottom of the video screen. Keep always visible.

Recommended control order (left to right):
```
[ Mute mic ] [ Camera off ] [ Screen share ] [ Record ] [ End call ]
```

- Each button: icon + label below; active state = filled/colored icon, inactive = outline/grey
- End call: red background, always rightmost, always prominent
- Screen share active: blue highlight on button + "Sharing screen" text label
- Recording active: red dot indicator + elapsed recording time counter

### Local Video (Self-View)

- Position: bottom-right corner overlay
- Size: approximately 20% of call area width
- Mirror horizontally with CSS `transform: scaleX(-1)`
- Show placeholder (avatar with username initials) when camera is off

### Remote Video

- Full-bleed, background color `#1a1a1a` for letterboxing
- CSS `object-fit: cover` for standard 16:9 fill
- Show remote username as overlay text (top-left corner, semi-transparent chip)
- When remote camera is off: show centered avatar/placeholder with their name

### Incoming Call Modal

- Full-screen overlay with semi-transparent dark backdrop
- Caller avatar + name + pulsing "Incoming call..." animation
- Two large buttons: green Accept (phone icon) and red Reject (phone-down icon)
- Ringtone: loop a short audio clip using `<audio loop autoplay>`
- Edge case: if user is already IN_CALL → auto-send `user-busy`, do not show modal

### Connection Status Overlay

| State | UI |
|-------|----|
| CALLING | Spinner + "Calling [name]..." + Cancel button |
| RINGING | Ring animation + "Incoming call from [name]" + Accept/Reject |
| CONNECTING | Spinner + "Connecting to [name]..." |
| IN_CALL | Green dot + elapsed timer (e.g. "02:34") |
| RECONNECTING | Yellow warning icon + "Reconnecting..." |
| FAILED | Brief error toast → auto-navigate back to user list |

### Group Call Layout (3-5 participants)

- CSS Grid with auto-fill tiles: 1 col for 1 person, 2x1 for 2, 2x2 for 3-4, 3-col wrap for 5
- Each tile: remote video + name overlay + muted indicator icon
- Active speaker detection optional: enlarge tile of loudest speaker via `RTCStatsReport`

---

## Feature Dependencies

```
Authentication (register/login)
  └──► Everything else (JWT required for WebSocket + REST)

Online user list (WebSocket broadcast)
  └──► Initiating a call (must see who to call)

WebSocket connection
  └──► All signaling messages

Signaling (offer/answer/ICE)
  └──► WebRTC peer connection establishment

1-1 video call (active RTCPeerConnection)
  ├──► Screen sharing (requires active sender to call replaceTrack on)
  ├──► Recording (requires active MediaStream to pass to MediaRecorder)
  └──► Group call (extends same RTCPeerConnection logic to N participants)
```

### Enforced Build Order

1. Auth (register/login/JWT)
2. WebSocket signaling server + client connection
3. Online user list with realtime updates
4. 1-1 call state machine (IDLE → CALLING → CONNECTING → IN_CALL → IDLE)
5. Call controls UI (mic/camera toggle, hang up, timer, status overlay)
6. Screen sharing (mid-call `replaceTrack`)
7. Call recording (MediaRecorder on composite stream)
8. Group call (N-way mesh — most complex, build last when 1-1 is solid)

---

## Sources

- MDN WebRTC Signaling and Video Calling (HIGH)
- MDN Perfect Negotiation Pattern (HIGH)
- MDN Screen Capture API (HIGH)
- MDN MediaRecorder API (HIGH)
- MDN RTCPeerConnection.connectionState (HIGH)
- Project context: .planning/PROJECT.md
