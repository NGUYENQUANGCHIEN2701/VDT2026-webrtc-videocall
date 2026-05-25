package com.vdt.websocket;

import com.vdt.websocket.dto.SignalMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * STOMP controller that relays WebRTC signaling messages between authenticated clients.
 *
 * Receives SEND frames on /app/signal, enforces the spoof-prevention guarantee
 * (T-2-02 mitigation), and forwards to the recipient's /user/queue/signal destination.
 *
 * Security properties:
 * <ul>
 *   <li>T-2-02 (Spoofing): {@code message.from} is unconditionally overwritten with
 *       {@code principal.getName()} before relay — client-supplied value is destroyed.</li>
 *   <li>T-2-SP (Information disclosure): The opaque SDP/ICE field is NEVER written
 *       to any log sink; only {@code type} is logged for debugging the offer/answer/ICE
 *       sequence. Raw SDP can leak private LAN IP addresses (host candidates).</li>
 *   <li>T-2-RT (Null principal): Defense-in-depth null check drops the message
 *       if principal is absent (should not happen — JwtChannelInterceptor rejects
 *       unauthenticated CONNECT, but guard is here for defense-in-depth).</li>
 * </ul>
 *
 * Destination routing:
 * The relative destination "/queue/signal" is passed to {@code convertAndSendToUser}.
 * Spring's UserDestinationMessageHandler prefixes it to the full per-user destination.
 * Passing the pre-prefixed form would double the prefix — see Research Pitfall 6.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class SignalController {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Relay a signaling message to the named recipient.
     *
     * @param message   inbound signal frame; {@code from} field is overwritten server-side
     * @param principal the authenticated sender, set by {@link JwtChannelInterceptor} on CONNECT
     */
    @MessageMapping("/signal")
    public void handleSignal(@Payload SignalMessage message, Principal principal) {
        // Defense-in-depth: should not happen because JwtChannelInterceptor rejects
        // unauthenticated CONNECT frames, but guard against Plan 02-01 regressions.
        if (principal == null) {
            log.warn("Signal received without authenticated principal — dropping");
            return;
        }

        // Defensive null/blank check for the recipient field.
        // Open Question 2 from 02-RESEARCH.md defers full input validation to Phase 4.
        if (message == null || message.getTo() == null || message.getTo().isBlank()) {
            log.warn("Signal from {} missing recipient — dropping", principal.getName());
            return;
        }

        // T-2-02 spoofing mitigation: overwrite client-supplied from with the
        // authenticated principal's name BEFORE relaying. Any attacker-controlled
        // from value is permanently discarded here.
        message.setFrom(principal.getName());

        // Log type for debugging the offer/answer/ICE sequence.
        // NEVER log message.getPayload() — raw SDP can leak private LAN IP addresses
        // (host ICE candidates). T-2-SP mitigation.
        log.debug("Signal from {} to {} type={}", message.getFrom(), message.getTo(), message.getType());

        // Relay using RELATIVE destination "/queue/signal".
        // Spring's UserDestinationMessageHandler resolves this to the full per-user
        // destination automatically. Passing the pre-prefixed form would double it
        // (Research Pitfall 6) and make the message undeliverable.
        messagingTemplate.convertAndSendToUser(message.getTo(), "/queue/signal", message);
    }
}
