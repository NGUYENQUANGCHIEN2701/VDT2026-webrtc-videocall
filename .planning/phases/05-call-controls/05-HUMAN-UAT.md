---
status: partial
phase: 05-call-controls
source: [05-VERIFICATION.md]
started: 2026-05-27T15:24:14.456Z
updated: 2026-05-27T15:24:14.456Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Mic mute — live audio silencing
expected: Bấm nút Mic trong cuộc gọi thực → `track.enabled=false` tắt hẳn audio RTP tới remote peer; remote không nghe thấy tiếng. Bấm lại → audio phục hồi.
result: [pending]

### 2. Camera toggle — live video freeze
expected: Bấm nút Camera trong cuộc gọi thực → `videoTrack.enabled=false` → remote thấy khung hình đen/đóng băng. Bấm lại → video phục hồi.
result: [pending]

### 3. Timer — real-time increment
expected: Khi cuộc gọi chuyển sang `callStatus=connected`, timer bắt đầu từ 00:00 và đếm lên từng giây (00:01, 00:02...) chính xác theo thời gian thực.
result: [pending]

### 4. ICE status pill — Connecting → Connected transitions
expected: Khi kết nối được thiết lập trên LAN, pill status chuyển từ "● Connecting..." (amber) → "● Connected" (emerald) đúng lúc, phản ánh `oniceconnectionstatechange` thực tế.
result: [pending]

### 5. End call — bilateral teardown
expected: Bấm End Call → cả hai phía đều trở về UserListPage; không có state bị kẹt (isMuted/isCameraOff/iceState reset về false/false/null).
result: [pending]

### 6. Cancel button — outgoing call cancellation
expected: Trong khi đang gọi (`callStatus=calling`), bấm Cancel → signal `call-end` gửi tới callee; modal "Incoming call" của callee tự đóng; caller trở về danh sách user.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
