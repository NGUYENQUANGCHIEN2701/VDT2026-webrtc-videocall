# Phase 6: Screen Sharing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 06-screen-sharing
**Areas discussed:** Share button trong control bar, PiP khi đang screen share, Camera toggle khi đang share

---

## Share button trong control bar

### Q1: Share Screen đặt vào đâu trong control bar?

| Option | Description | Selected |
|--------|-------------|----------|
| [Mic] [Share] [End Call] [Camera] | Share vào giữa-trái, End Call vẫn anchor trung tâm. Symmetric layout: 2 button mỗi bên End Call. | ✓ |
| [Mic] [End Call] [Camera] [Share] | Share ở ngoài cùng bên phải — dễ thêm, nhưng layout mất cân bằng (3 button bên phải End Call). | |
| Float button riêng trên control bar | Share là floating pill/button ở top-right corner trong lúc call — tách biệt hoàn toàn khỏi control bar. | |

**User's choice:** [Mic] [Share] [End Call] [Camera] — symmetric layout

---

### Q2: Button Share Screen thay đổi thế nào khi đang sharing?

| Option | Description | Selected |
|--------|-------------|----------|
| Single toggle — icon + nền đổi màu | Khi share: icon đổi sang MonitorOff + nền đổi sang bg-emerald-600 (cho thấy đang active). Nhấn lại để stop. Giống pattern Mic/Camera. | ✓ |
| Single toggle — nền đổi sang bg-red-600 | Khi share: nền đỏ bắt mắt như Muted state. Nhấn lại để stop sharing. | |

**User's choice:** Single toggle — icon + nền đổi màu (bg-emerald-600 khi active)

---

## PiP khi đang screen share

### Q1: Khi screen share đang active, local PiP hiển thị gì?

| Option | Description | Selected |
|--------|-------------|----------|
| Vẫn hiển thị camera | srcObject = localStream (camera) không đổi. User thấy mặt mình trong khi share màn hình — giống Google Meet/Teams. | ✓ |
| Đổi sang screen preview | srcObject = screenStream. User thấy preview nhỏ của màn hình đang share — confirm được remote đang thấy gì, nhưng không thấy mặt mình nữa. | |

**User's choice:** Vẫn hiển thị camera

---

### Q2: Có thêm indicator nào trên PiP khi đang share không?

| Option | Description | Selected |
|--------|-------------|----------|
| Không cần indicator trên PiP | Share button trong control bar đã chỉ rõ trạng thái. PiP giữ nguyên — đơn giản hơn. | ✓ |
| Thêm label nhỏ 'Sharing' lên PiP | Ví dụ: badge nhỏ 'Sharing screen' ở góc PiP — rõ hơn nhưng thêm UI complexity. | |

**User's choice:** Không cần indicator trên PiP

---

## Camera toggle khi đang share

### Q1: Nút Camera trong control bar khi screen share đang active?

| Option | Description | Selected |
|--------|-------------|----------|
| Disable Camera button khi đang share | Camera button opacity-50 + disabled khi isScreenSharing. Rõ ràng, tránh confusion. Remote đang thấy màn hình — toggle camera không có ý nghĩa. | ✓ |
| Vẫn để Camera button hoạt động | User có thể tắt camera khi đang share — ảnh hưởng PiP của mình, không ảnh hưởng remote (họ vẫn thấy màn hình). | |

**User's choice:** Disable Camera button khi đang share

---

### Q2: Khi user dùng browser native 'Stop sharing' button, xử lý thế nào?

| Option | Description | Selected |
|--------|-------------|----------|
| Tự động restore camera | Lắng nghe track.onended. Khi screenTrack kết thúc: replaceTrack() lại với camera track, reset isScreenSharing. Remote tự động thấy camera lại. | ✓ |
| Gọi teardown + kết thúc cuộc gọi | Browser stop = user muốn dừng hoàn toàn. Đơn giản hơn nhưng quá aggressive — user chỉ muốn dừng share, không muốn cút khỏi cuộc gọi. | |

**User's choice:** Tự động restore camera — track.onended → replaceTrack(cameraTrack)

---

## Claude's Discretion

- Screen sender reference: cách lưu video sender ref (local variable vs `screenSenderRef`) — planner quyết định
- `getDisplayMedia` constraints: để browser default picker — không cần constraint cụ thể
- Icon availability: verify `Monitor`/`MonitorOff` trong lucide-react version hiện tại; fallback sang `Share2` nếu không có

## Deferred Ideas

- Screen sharing trong group call — Phase 7
- Annotation overlay khi share — COLLAB-03 trong v2 requirements
- Screen preview trong PiP — user explicitly chọn không làm
