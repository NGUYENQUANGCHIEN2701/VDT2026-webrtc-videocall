package com.vdt.websocket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Wire DTO for WebRTC signaling messages exchanged via STOMP /app/signal.
 *
 * Uses @Data/@NoArgsConstructor/@AllArgsConstructor (not Java record) for
 * Jackson round-trip compatibility with the React frontend — matches the
 * project's DTO style established in Phase 1 (commit d79cb49).
 *
 * The {@code payload} field carries SDP offers/answers and ICE candidates.
 * It is treated as an opaque string by the backend — never parsed, never
 * validated, never logged. This is intentional: it keeps CALL-06 (Google STUN
 * ICE configuration) entirely frontend-side.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignalMessage {

    /** Target recipient's username. Required — controller drops the message if blank. */
    private String to;

    /**
     * Signal type. Intended values: "offer" | "answer" | "ice-candidate" |
     * "call-request" | "call-accept" | "call-decline" | "call-end".
     * NOT enforced as an enum for forward compatibility with Phase 4 call control messages.
     */
    private String type;

    /**
     * Opaque SDP string or ICE candidate JSON. The backend never inspects this field.
     * Carrying it unmodified from sender to recipient is the entire point.
     */
    private String payload;

    /**
     * Sender username. ALWAYS overwritten by the server with {@code principal.getName()}
     * before relay — the client-supplied value is destroyed. This is the T-2-02 spoofing
     * mitigation: even if the client sends from="admin", the recipient sees the real
     * authenticated username.
     */
    private String from;
}
