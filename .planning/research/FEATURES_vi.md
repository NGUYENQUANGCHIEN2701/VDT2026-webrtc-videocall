# Feature Landscape

**Domain:** Ung dung web video call WebRTC 1-1 (va group)
**Du an:** VDT-WebRTC — Viettel Digital Talent internship deliverable
**Nghien cuu:** 2026-05-24
**Do tin cay:** HIGH (MDN WebRTC, Screen Capture API, MediaRecorder API)

---

## Tieu chuan bat buoc (Table Stakes)

Nhung tinh nang nguoi dung ky vong toi thieu. Thieu bat ky muc nao se lam san pham giong bi hong hoac chua xong.

| Tinh nang | Vi sao can | Do phuc tap | Ghi chu |
|---------|--------------|------------|-------|
| Dang ky + dang nhap | Cua vao tat ca chuc nang | Low | Username + password, JWT; da trong scope |
| Danh sach online realtime | De biet ai de goi | Low-Med | WebSocket push updates; list auto-refresh join/leave khong can reload |
| Thong bao incoming call (ring UI) | Neu khong, callee khong biet co cuoc goi | Low | Modal/overlay voi caller name + Accept/Reject; co nhac chuong |
| Accept / Reject call | Callee can tu choi on dinh | Low | Reject gui hang-up signal; caller thay "Call declined" |
| Mute mic | Ky vong co ban moi app call | Low | Toggle `audioTrack.enabled`; nut hien trang thai |
| Camera on/off | Ky vong co ban; privacy control | Low | Toggle `videoTrack.enabled`; hien placeholder khi tat |
| End call | Luon hien, 1 tap de thoat | Low | Ca hai ben co the hang up; cleanup tracks + pc |
| Local video preview | User muon thay minh | Low | Self-view overlay nho, goc duoi phai, mirrored |
| Remote video full-screen | View chinh cuoc goi | Low | `<video autoplay playsinline>` day man hinh |
| Connection status | Biet dang ket noi hay da ket noi | Low | Hien "Connecting...", "Connected...", "Reconnecting..." |
| Error handling | Loi can thong bao de hieu | Med | ICE failure, getUserMedia denied, disconnect dot ngot |
| Call duration timer | Xac nhan call dang live | Low | Dem thoi gian khi `connectionState === "connected"` |

---

## Diem khac biet (Differentiators)

Tinh nang khong bat buoc nhung lam demo an diem. Ca 3 nam trong scope.

| Tinh nang | Gia tri | Do phuc tap | Ghi chu |
|---------|-------------------|------------|-------|
| Screen sharing (giua call) | Hop tac, demo an tuong | Med | `getDisplayMedia()` + `sender.replaceTrack(screenTrack)`; khong can renegotiation; stop thi replace lai camera |
| Group call — mesh P2P (3-5 nguoi) | Mo rong 1-1 thanh multi-party | High | N*(N-1)/2 ket noi; moi participant quan ly ket noi den tat ca others; UI grid dong |
| Call recording (local download) | Co artifact de cho xem demo | Med | `MediaRecorder(combinedStream)`; thu thap chunks; stop -> Blob -> download `.webm` |
| Screen share + system audio | Chia se ca audio he thong | Low-Med | `getDisplayMedia({ audio: true, video: true })` — Chrome ho tro, Firefox partial |
| Perfect Negotiation (polite/impolite) | Tranh offer collision khi renegotiate | Med | Callee la polite; impolite bo qua offer collision |
| Camera PiP khi screen share | Khi share, van thay mat nguoi dung | Med | Render 2 streams, webcam overlay tren screen share |
| Chi bao chat luong call | Hien loai ICE candidate | Low | Doc `RTCStatsReport`; show host vs srflx vs relay |

---

## Anti-Features

Cac muc loai bo co chu dich. Lam them se bung scope khong tuong xung demo value.

| Anti-Feature | Vi sao tranh | Thay vao do |
|--------------|-----------|--------------|
| TURN server / relay setup | Khong can tren LAN; phuc tap prod | Dung Google STUN; ghi ro gia dinh LAN |
| SFU/MCU cho group call | Can media server rieng (mediasoup, Janus, Jitsi); qua scope | Mesh P2P, du cho 3-5 peer |
| Chat/text trong call | Data channel phuc tap; khong trong requirements | Out of scope; demo chi video/audio |
| File transfer | Data channel + chunking phuc tap; khong can | Out of scope |
| Server-side recording | Can storage, codec processing | Local download qua `URL.createObjectURL` |
| Push notifications (FCM/APNS) | Mobile push; web app du qua WebSocket khi app mo | WebSocket thong bao incoming call |
| End-to-end encryption ngoai WebRTC | DTLS/SRTP tu dong; lam them khong can | De WebRTC lo mac dinh |
| Full mobile responsive layout | Khong phai mobile app; LAN demo | Tap trung 1080p desktop |
| Virtual backgrounds / video filters | Can WebGL/TensorFlow.js; scope bung lon | Khong lam |
| Custom noise cancellation | Browser ho tro qua constraints | `{ audio: { echoCancellation: true, noiseSuppression: true } }` |

---

## Call State Machine

UI va signaling can theo doi state nay ro rang. Nhieu bug xay ra khi mapping state sai.

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

| Message | Huong | Trigger |
|---------|-----------|---------|
| `call-request` | Caller → Callee | User khoi tao call |
| `call-accept` | Callee → Caller | User click Accept |
| `call-reject` | Callee → Caller | User click Reject |
| `call-cancel` | Caller → Callee | Caller hang up truoc khi answer |
| `sdp-offer` | Caller → Callee | Sau khi callee accept, caller gui SDP offer |
| `sdp-answer` | Callee → Caller | Tra loi SDP offer |
| `ice-candidate` | Ca hai | ICE candidates trickle lien tuc |
| `hang-up` | Mot ben → Ben kia | End call khi IN_CALL |
| `user-busy` | Callee → Caller | Auto-reject khi callee dang call |

---

## UI/UX Patterns cho Call Controls

### Thanh dieu khien cuoc goi

Render thanh ngang o duoi man hinh. Luon hien.

Thu tu de xuat (trai → phai):
```
[ Mute mic ] [ Camera off ] [ Screen share ] [ Record ] [ End call ]
```

- Moi nut: icon + label duoi; active = filled/colored, inactive = outline/grey
- End call: nen do, luon ben phai, noi bat
- Screen share active: highlight xanh + label "Sharing screen"
- Recording active: cham do + elapsed time

### Local Video (Self-View)

- Vi tri: overlay goc duoi phai
- Kich thuoc: ~20% chieu rong call area
- Mirror ngang bang CSS `transform: scaleX(-1)`
- Khi camera off: hien placeholder/avatar

### Remote Video

- Full-bleed, nen `#1a1a1a` de letterbox
- CSS `object-fit: cover` cho 16:9 fill
- Hien ten remote o goc tren trai (chip trong suot)
- Khi remote camera off: hien avatar/placeholder o giua

### Incoming Call Modal

- Overlay fullscreen voi backdrop toi
- Caller avatar + name + animation "Incoming call..."
- Hai nut lon: Accept xanh (phone icon) va Reject do (phone-down icon)
- Ringtone: loop audio bang `<audio loop autoplay>`
- Edge case: neu user dang IN_CALL → auto-send `user-busy`, khong hien modal

### Connection Status Overlay

| State | UI |
|-------|----|
| CALLING | Spinner + "Calling [name]..." + Cancel button |
| RINGING | Ring animation + "Incoming call from [name]" + Accept/Reject |
| CONNECTING | Spinner + "Connecting to [name]..." |
| IN_CALL | Cham xanh + elapsed timer (vd: "02:34") |
| RECONNECTING | Icon canh bao vang + "Reconnecting..." |
| FAILED | Toast loi ngan → tu dong quay ve user list |

### Group Call Layout (3-5 participants)

- CSS Grid: 1 cot cho 1 nguoi, 2x1 cho 2, 2x2 cho 3-4, 3 cot cho 5
- Moi tile: remote video + overlay ten + icon muted
- Active speaker detection optional: phong to tile nguoi noi to via `RTCStatsReport`

---

## Feature Dependencies

```
Authentication (register/login)
  └──► Tat ca phan con lai (JWT can cho WebSocket + REST)

Online user list (WebSocket broadcast)
  └──► Initiating a call (phai biet ai de goi)

WebSocket connection
  └──► Tat ca signaling messages

Signaling (offer/answer/ICE)
  └──► WebRTC peer connection establishment

1-1 video call (RTCPeerConnection hoat dong)
  ├──► Screen sharing (can sender de replaceTrack)
  ├──► Recording (can MediaStream de MediaRecorder)
  └──► Group call (mo rong logic RTCPeerConnection cho N participants)
```

### Thu tu build bat buoc

1. Auth (register/login/JWT)
2. WebSocket signaling server + client connection
3. Online user list realtime
4. 1-1 call state machine (IDLE → CALLING → CONNECTING → IN_CALL → IDLE)
5. Call controls UI (mic/camera toggle, hang up, timer, status overlay)
6. Screen sharing (mid-call `replaceTrack`)
7. Call recording (MediaRecorder on composite stream)
8. Group call (mesh N-way — phuc tap nhat, lam sau khi 1-1 on dinh)

---

## Sources

- MDN WebRTC Signaling and Video Calling (HIGH)
- MDN Perfect Negotiation Pattern (HIGH)
- MDN Screen Capture API (HIGH)
- MDN MediaRecorder API (HIGH)
- MDN RTCPeerConnection.connectionState (HIGH)
- Project context: .planning/PROJECT.md
