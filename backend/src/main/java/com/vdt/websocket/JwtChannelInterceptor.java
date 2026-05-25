package com.vdt.websocket;

import com.vdt.auth.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

/**
 * STOMP channel interceptor that validates the JWT Bearer token on every CONNECT frame.
 * On non-CONNECT frames (SEND, SUBSCRIBE, DISCONNECT), the principal is already set
 * on the session from the CONNECT — no re-validation is needed.
 *
 * Threat T-2-01 mitigation: rejects CONNECT frames with missing, malformed, or expired JWT.
 * Threat T-2-IL mitigation: only the username (not the raw token) is logged after validation.
 *
 * NOTE: UserDetailsService is injected by interface, NOT by CustomUserDetailsService
 * concrete type, to avoid a circular dependency (Research Pitfall 7).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing or invalid Authorization header");
            }

            String token = authHeader.substring(7);

            try {
                String username = jwtService.extractUsername(token);

                if (username == null || jwtService.isTokenExpired(token)) {
                    throw new IllegalArgumentException("Invalid or expired JWT token");
                }

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                accessor.setUser(authToken);

                // Log only the username, never the raw token value (T-2-IL mitigation)
                log.info("WebSocket CONNECT authenticated for user: {}", username);

            } catch (IllegalArgumentException e) {
                throw e;
            } catch (Exception e) {
                throw new IllegalArgumentException("JWT validation failed: " + e.getMessage());
            }
        }

        return message;
    }
}
