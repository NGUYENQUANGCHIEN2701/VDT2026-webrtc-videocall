---
phase: 4
slug: 1-1-call-core
status: draft
shadcn_initialized: true
preset: dark-emerald (slate base, emerald-500 accent)
created: 2026-05-27
---

# Phase 4 — UI Design Contract: 1-1 Call Core

> Visual and interaction contract for Phase 4 frontend build.
> Phase 3 UI-SPEC is the upstream baseline — all tokens, colors, and spacing are inherited.
> This document specifies ONLY Phase 4 additions: IncomingCallModal, CallPage, and outgoing-call state on UserListPage.

---

## 1. Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn/ui (official registry only) | Phase 3 UI-SPEC — inherited |
| Preset | dark-emerald (slate base, emerald-500 accent) | Phase 3 UI-SPEC — inherited |
| Component library | Radix UI via shadcn — do not import directly | Phase 3 UI-SPEC — inherited |
| Icon library | lucide-react | Phase 3 UI-SPEC — inherited |
| CSS framework | Tailwind CSS 3.x | Phase 3 UI-SPEC — inherited |
| Font | Inter (Google Fonts via index.html `<link>`) | Phase 3 UI-SPEC — inherited |
| Theme mode | Dark only — no light mode toggle | Phase 3 UI-SPEC — inherited |
| Accent color | Emerald — `emerald-500` (#10B981) | Phase 3 UI-SPEC — inherited |
| shadcn style | new-york | components.json |

No new packages, registries, or design tokens are introduced in Phase 4.

---

## 2. Spacing Scale

Inherited unchanged from Phase 3 UI-SPEC §2. All values are multiples of 4px.

| Token | Tailwind class | Value | Usage |
|-------|---------------|-------|-------|
| xs | `p-1` / `gap-1` | 4px | Icon internal padding, badge gaps |
| sm | `p-2` / `gap-2` | 8px | Compact row gaps, icon-to-label gaps |
| md | `p-4` / `gap-4` | 16px | Default element padding, modal field gaps |
| lg | `p-6` / `gap-6` | 24px | Card internal padding, modal body padding |
| xl | `p-8` / `gap-8` | 32px | Modal outer padding, video container margin |
| 2xl | `p-12` / `gap-12` | 48px | CallPage centering offset |
| 3xl | `p-16` / `gap-16` | 64px | Page-level vertical centering |

Exceptions: Video stream containers use `aspect-video` (16:9 ratio) rather than fixed-pixel heights. Touch target minimum for call action buttons: 44px height (`h-11`).

---

## 3. Typography

Inherited unchanged from Phase 3 UI-SPEC §3. No new type roles.

| Role | Tailwind | Size | Weight | Line Height | Phase 4 Usage |
|------|---------|------|--------|-------------|---------------|
| Display | `text-2xl font-semibold` | 24px | 600 | 1.3 | Not used in Phase 4 |
| Heading | `text-lg font-semibold` | 18px | 600 | 1.4 | IncomingCallModal caller name, CallPage status label |
| Body | `text-sm font-normal` | 14px | 400 | 1.5 | Modal sub-labels, notification copy |
| Label | `text-xs font-normal` | 12px | 400 | 1.5 | Status badges, modal help text |
| Caption | `text-xs font-normal` | 12px | 400 | 1.5 | Transient toast messages ("Call declined", "No answer") |

Declared weights: **400 (font-normal)** and **600 (font-semibold)** only. No other weights.

---

## 4. Color

Inherited unchanged from Phase 3 UI-SPEC §4. All CSS variables are already wired in `src/index.css`.

### 60/30/10 Distribution

| Role | Tailwind | Hex | Usage |
|------|---------|-----|-------|
| Dominant (60%) | `bg-slate-950` | #020617 | Page background, CallPage video area background |
| Secondary (30%) | `bg-slate-900` / `bg-slate-800` | #0F172A / #1E293B | Modal card surface, control bar, overlay text backdrop |
| Accent (10%) | `bg-emerald-500` | #10B981 | Accept call button, "connected" status indicator |
| Destructive | `bg-red-600` | #DC2626 | Reject call button, hang-up button background |

### Accent Reserved For (Phase 4 additions)

Emerald accent is reserved for these specific elements in Phase 4 — do not use emerald for anything else:

- **Accept call button** in IncomingCallModal
- **"Connected" state indicator** (future Phase 5 connection status badge — reserved here)
- **Call button on UserListPage** (already implemented in Phase 3)
- **Focus rings** on interactive elements (inherited, via `--ring` CSS var)
- **Online status badge** (inherited from Phase 3)

Destructive red (`red-600`) is reserved for: **Reject call button**, **Hang up button** in CallPage (basic hang-up stub added in Phase 4 before full controls in Phase 5).

### Phase 4 Specific Color Decisions

| Element | Value | Rationale |
|---------|-------|-----------|
| IncomingCallModal card | `bg-slate-900 border border-slate-700` | Matches Phase 3 card style (CONTEXT.md specifics) |
| Modal overlay backdrop | `bg-slate-950/80 backdrop-blur-sm` | Dark scrim, consistent with header backdrop pattern |
| Caller avatar fallback | `bg-slate-700 text-slate-200` | Matches Phase 3 UserRow avatar style |
| Remote video background | `bg-slate-950` | Black letterbox when stream is not yet connected |
| Local video pip background | `bg-slate-800` | Slightly elevated so pip is distinguishable from remote |
| "Calling..." outgoing indicator text | `text-emerald-400` | Active state; uses accent text color |
| Toast messages (transient notifications) | `bg-slate-800 border border-slate-700 text-slate-50` | Consistent card style, no special color for neutral toasts |
| "Call declined" toast | `text-red-400` | Error family; matches inline error color from Phase 3 |
| "No answer" toast | `text-amber-400` | Warning color (pre-reserved in Phase 3 §4 semantic colors) |
| "Connection lost" toast | `text-red-400` | Error family |

---

## 5. New Screens and Components: Phase 4

### 5.1 IncomingCallModal

Global overlay rendered in `App.tsx` outside `<Routes>`. Visible from any protected page when `callStatus === 'ringing'`.

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  (backdrop: bg-slate-950/80 backdrop-blur-sm)           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Incoming Call                     [close silent] │  │
│  │  ─────────────────────────────────────────────── │  │
│  │                                                   │  │
│  │            [Avatar 64px]                          │  │
│  │            alice                                  │  │
│  │            is calling you...                      │  │
│  │                                                   │  │
│  │      [Reject]              [Accept]               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

- Backdrop: `fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm`
- Modal card: `w-full max-w-sm mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6`
- Modal header: `text-sm font-normal text-slate-400` — label "Incoming Call"
- Avatar: shadcn `Avatar` size `h-16 w-16` — `AvatarFallback bg-slate-700 text-slate-200 text-xl font-semibold` — first letter of caller username
- Caller name: `text-lg font-semibold text-slate-50` — exact caller username
- Sub-label: `text-sm font-normal text-slate-400` — "is calling you..."
- Avatar + name + sub-label: `flex flex-col items-center gap-2 py-4`

#### Buttons

| Button | Component | Variant | Size | Classes | Label |
|--------|-----------|---------|------|---------|-------|
| Reject | shadcn `Button` | `destructive` | `default` | `h-11 flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold` | Reject |
| Accept | shadcn `Button` | `default` | `default` | `h-11 flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold` | Accept |

Button row: `flex gap-4 mt-2` — both buttons flex-1 for equal width.

Icons:
- Reject: `PhoneOff` (lucide, `size-4 mr-2`)
- Accept: `Phone` (lucide, `size-4 mr-2`)

Accessible: `aria-label="Accept call from {callerUsername}"` / `aria-label="Reject call from {callerUsername}"`.

#### Ringtone Visual Indicator

No visible ringtone element. Audio is synthesized via Web Audio API (`useRingtone()` hook) — 800 Hz sine wave, on 0.3s / off 1.7s repeat. No UI element represents this.

---

### 5.2 Outgoing Call State on UserListPage

When `callStatus === 'calling'` (current user initiated an outgoing call), the UserListPage shows a minimal outgoing-call indicator.

- The Call button for the called user: replace with a disabled `Button` showing `<Loader2 className="animate-spin size-4 mr-2" /> Calling...` in `text-emerald-400`
- Button state: `disabled bg-slate-700 text-slate-400 cursor-not-allowed h-8`
- All other Call buttons on the page: disabled (`opacity-50 pointer-events-none`) while a call is active
- No full-page overlay — the user can still see the list

---

### 5.3 CallPage (`/call` route)

The video call screen. Navigated to automatically via `acceptCall()` inside `CallContext`.

#### Layout

```
┌────────────────────────────────────────────────────────────┐
│  Remote video (fills screen)                               │
│                                                            │
│                  [Remote video stream]                     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  (bottom control bar — minimal in Phase 4)           │  │
│  │  [End Call]                                          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

Phase 4 CallPage is minimal — full call controls (mic/camera toggle, timer, status indicator, PiP self-view) are Phase 5. Phase 4 must display the video streams stably and provide a basic hang-up button.

#### Remote Video Area

- Container: `relative w-full h-screen bg-slate-950 overflow-hidden`
- `<video>` element: `w-full h-full object-cover` — `autoPlay playsInline` — `ref={remoteVideoRef}` wired to `remoteStream`
- When `remoteStream` is null (not yet connected): show a centered placeholder — `flex items-center justify-center bg-slate-950` with a `Users` (lucide) icon `size-16 text-slate-700` and text `text-sm text-slate-500` reading "Waiting for remote video..."

#### Local Video (Minimal Self-View)

Phase 4 includes a minimal local video preview. Full PiP controls are Phase 5.

- Container: `absolute bottom-24 right-4 w-32 aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-lg`
- `<video>` element: `w-full h-full object-cover scale-x-[-1]` (mirrored) — `autoPlay playsInline muted` — `ref={localVideoRef}` wired to `localStream`
- When `localStream` is null: container renders as empty `bg-slate-800` placeholder

#### Control Bar (Phase 4 — Hang Up Only)

- Bar: `absolute bottom-0 left-0 right-0 h-20 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 flex items-center justify-center gap-4`
- Hang up button: shadcn `Button` — `h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white` — icon only: `PhoneOff` (lucide, `size-5`) — `aria-label="End call"`

Note: Full control bar (mic toggle, camera toggle, duration timer, status indicator) is Phase 5 CTRL-01 through CTRL-07. Do not implement these in Phase 4.

#### Peer Username Overlay

- Positioned top-left over remote video: `absolute top-4 left-4 bg-slate-900/70 backdrop-blur-sm rounded-lg px-3 py-1`
- Text: `text-sm font-semibold text-slate-50` — value: `peerUsername` from `useCall()`

---

### 5.4 Transient Toast Notifications

Phase 4 introduces minimal in-app toasts for call lifecycle events. These are simple overlays, not a full toast system (that can be upgraded in a later phase).

Render position: `fixed top-4 right-4 z-50 flex flex-col gap-2`

| Trigger | Message | Style |
|---------|---------|-------|
| Callee rejected the call | "Call declined" | `bg-slate-800 border border-red-600/40 text-red-400` |
| No answer after 30s | "No answer" | `bg-slate-800 border border-amber-500/40 text-amber-400` |
| Remote hung up | "Call ended" | `bg-slate-800 border border-slate-700 text-slate-400` |
| ICE connection lost | "Connection lost" | `bg-slate-800 border border-red-600/40 text-red-400` |

Toast anatomy: `rounded-lg px-4 py-3 text-sm font-normal shadow-lg`. Auto-dismiss after 3 seconds. No close button needed.

Implementation: a simple array in `CallContext` state: `toasts: { id, message, style }[]`. Rendered in `App.tsx` alongside `<IncomingCallModal />`.

---

## 6. Updated Component Inventory

All new components sourced from shadcn official registry only. The following are needed beyond what Phase 3 already installed:

| Component | shadcn add command | Used in | Already installed? |
|-----------|------------------|---------|-------------------|
| `Button` | already installed | IncomingCallModal, CallPage control bar | Yes |
| `Avatar`, `AvatarFallback` | already installed | IncomingCallModal caller avatar | Yes |
| `Skeleton` | already installed | Not new in Phase 4 | Yes |

No new shadcn components need to be installed for Phase 4. All UI is built from the existing component set + raw HTML elements for video streams.

### New Icons Required (from lucide-react)

| Icon | Usage |
|------|-------|
| `PhoneOff` | Reject call button, End call button |
| `Loader2` | "Calling..." spinner on UserListPage outgoing state |
| `Phone` | Accept call button (already imported in UserListPage) |

Note: `Phone`, `Video`, `Users`, `LogOut`, `Loader2` are already used in Phase 3. Only `PhoneOff` is new.

---

## 7. Animation and Transition Contracts

Inherited patterns from Phase 3 UI-SPEC §8 apply. Phase 4 additions:

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| IncomingCallModal appear | `animate-in fade-in zoom-in-95` | 200ms | ease-out |
| IncomingCallModal dismiss | `animate-out fade-out zoom-out-95` | 150ms | ease-in |
| Toast appear | `animate-in fade-in slide-in-from-right-2` | 200ms | ease-out |
| Toast dismiss | `animate-out fade-out slide-out-to-right-2` | 150ms | ease-in |
| "Calling..." button spinner | `animate-spin` (Tailwind, continuous) | — | linear |
| Remote video fade-in on stream attach | `transition-opacity duration-300` (opacity 0 → 1) | 300ms | ease |
| Local video pip appear | `animate-in fade-in zoom-in-90 duration-200` | 200ms | ease-out |

All animations use Tailwind CSS utilities. No framer-motion or animation library.

---

## 8. Copywriting Contract

All copy is in English. Exact strings — do not paraphrase.

### IncomingCallModal

| Element | Copy |
|---------|------|
| Modal header label | `Incoming Call` |
| Caller sub-label | `is calling you...` |
| Reject button | `Reject` |
| Accept button | `Accept` |
| Reject aria-label | `Reject call from {callerUsername}` |
| Accept aria-label | `Accept call from {callerUsername}` |

### UserListPage — Outgoing Call State

| Element | Copy |
|---------|------|
| Calling button (disabled, in-progress) | `Calling...` |
| Calling button aria-label | `Calling {peerUsername}...` |

### CallPage

| Element | Copy |
|---------|------|
| Remote video placeholder heading | `Waiting for remote video...` |
| Peer username overlay | `{peerUsername}` (exact username, no prefix/suffix) |
| End call button aria-label | `End call` |

### Toast Notifications

| Trigger | Toast text |
|---------|-----------|
| Call rejected by callee | `Call declined` |
| No answer after 30 seconds | `No answer` |
| Remote peer ended the call | `Call ended` |
| ICE connection failed / lost | `Connection lost` |

### Destructive Action: Hanging Up

Hang up is NOT a destructive action requiring confirmation. It is reversible (user can call again). No confirmation dialog. Single tap on the red "End call" button immediately terminates. This decision is locked: Phase 4 does simple teardown with no confirmation step.

---

## 9. Accessibility Requirements

Inherited WCAG 2.1 Level AA target from Phase 3 UI-SPEC §10. Phase 4 additions:

| Requirement | Implementation |
|-------------|----------------|
| IncomingCallModal traps focus | Use `dialog` role or `aria-modal="true"` on modal card; focus moves to Accept button on open |
| Modal dismisses on Escape | `onKeyDown` handler on backdrop listens for `Escape` → calls `rejectCall()` |
| Modal announced to screen reader | `role="dialog" aria-modal="true" aria-labelledby="modal-caller-name"` |
| Accept/Reject buttons labeled | `aria-label` includes caller username — button text alone is insufficient |
| CallPage video elements labeled | `<video aria-label="Remote video stream" />` and `<video aria-label="Local video preview" />` |
| End call button labeled | `aria-label="End call"` — icon-only button has no visible text |
| Toast announced to screen reader | `role="status" aria-live="polite"` wrapping toast container |
| Video autoplay requires muted for local | Local video: `muted` attribute required by browsers for autoplay policy |
| Remote video volume | Remote video: NOT muted — user must hear the remote audio |
| Color contrast — Accept button text | `text-white` on `bg-emerald-500` (#10B981) = 3.0:1 — meets AA for large/bold text at 14px semibold |
| Color contrast — Reject button text | `text-white` on `bg-red-600` (#DC2626) = 4.5:1 — meets AA |

---

## 10. Out of Scope for Phase 4

| Feature | Why deferred |
|---------|-------------|
| Mic/camera toggle buttons | Phase 5 (CTRL-01, CTRL-02) |
| Call duration timer | Phase 5 (CTRL-04) |
| Connection status indicator (Connecting / Connected / Reconnecting) | Phase 5 (CTRL-05) |
| Self-view picture-in-picture with drag | Phase 5 (CTRL-06) — Phase 4 has a static fixed-position local preview only |
| Remote username overlay during call (full CTRL-07) | Phase 5 includes the full overlay with name; Phase 4 adds a minimal static overlay |
| Toast system with queue / stacking | Phase 4 uses a minimal implementation; upgrade to shadcn `Sonner` toasts in Phase 5 if needed |
| Ringtone audio file | Phase 4 uses synthesized Web Audio API — no audio file in repo |
| Screen sharing button | Phase 6 |
| Mobile responsive layout | Out of scope (REQUIREMENTS.md — desktop browser only) |
| Light mode | Dark only throughout all phases |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Button, Avatar, AvatarFallback, Skeleton (all from Phase 3) | not required — official registry |
| Third-party | none | not applicable |

No new shadcn components are installed in Phase 4. No third-party registries.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
