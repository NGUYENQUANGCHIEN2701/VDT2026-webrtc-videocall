package com.vdt.websocket;

import com.vdt.user.UserRepository;
import com.vdt.user.UserStatus;
import com.vdt.websocket.dto.PresenceDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;

import java.security.Principal;
import java.util.List;

/**
 * Listens to STOMP lifecycle events and maintains presence state.
 *
 * Threat T-2-PS mitigation: username is always read from accessor.getUser().getName()
 * (the principal set by JwtChannelInterceptor), never from client-supplied frame headers.
 *
 * Threat T-2-PR mitigation: OFFLINE DB write is gated on !presenceService.isUserOnline()
 * to guard against duplicate SessionDisconnectEvent firings (Pitfall 3).
 *
 * Threat T-2-PN mitigation: null principal is handled gracefully — logs a warning
 * and returns instead of throwing NPE (Pitfall 4).
 *
 * NOTE: async annotation is intentionally NOT used — adding it would reorder events and break
 * the ordering guarantees of the STOMP broker channel.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceEventListener {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    /**
     * Handles SessionConnectedEvent fired after a successful STOMP CONNECT.
     * The principal on the event is always set by JwtChannelInterceptor (Plan 02-01).
     */
    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();

        if (user == null) {
            // Pitfall 4: interceptor ordering issue — log and bail out gracefully
            log.warn("SessionConnectedEvent without principal — interceptor ordering issue, see Pitfall 4");
            return;
        }

        String username = user.getName();
        String sessionId = accessor.getSessionId();

        presenceService.addSession(sessionId, username);

        // Flip DB status to ONLINE (PRES-02)
        userRepository.findByUsername(username).ifPresent(u -> {
            u.setStatus(UserStatus.ONLINE);
            userRepository.save(u);
        });

        broadcastPresence();

        log.debug("User connected: username={}, sessionId={}", username, sessionId);
    }

    /**
     * Handles SessionDisconnectEvent fired when a STOMP session closes.
     * Session ID is always available; principal may be null (Pitfall 4).
     */
    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();

        // Remove session first (idempotent — ConcurrentHashMap.remove is a no-op when absent)
        presenceService.removeSession(sessionId);

        if (user != null) {
            String username = user.getName();

            // Only flip to OFFLINE if the user has NO remaining sessions (Pitfall 3 idempotency guard)
            // This also handles the multiple-tabs scenario correctly
            if (!presenceService.isUserOnline(username)) {
                userRepository.findByUsername(username).ifPresent(u -> {
                    u.setStatus(UserStatus.OFFLINE);
                    userRepository.save(u);
                });
                log.debug("User went offline: username={}", username);
            } else {
                log.debug("Session removed but user still has active sessions: username={}", username);
            }
        } else {
            // Principal is null — session may have been untracked (e.g., failed auth before registry add)
            log.debug("SessionDisconnectEvent for sessionId={} had no principal", sessionId);
        }

        // Always broadcast — even if principal was null, a tracked session was removed
        broadcastPresence();
    }

    /**
     * Publishes the current online user list to all /topic/presence subscribers.
     */
    private void broadcastPresence() {
        List<String> onlineUsers = presenceService.getOnlineUsers();
        messagingTemplate.convertAndSend("/topic/presence", new PresenceDTO(onlineUsers));
        log.debug("Presence broadcast: onlineUsers={}", onlineUsers);
    }
}
