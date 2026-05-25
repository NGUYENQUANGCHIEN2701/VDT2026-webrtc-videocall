package com.vdt.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP WebSocket broker configuration.
 * Registers the /ws native WebSocket endpoint (no SockJS — per CLAUDE.md),
 * sets up in-memory simple broker for /topic and /queue, and configures
 * application prefix /app and user prefix /user.
 *
 * NOTE: Channel interceptors (JWT auth) are intentionally NOT registered here.
 * They live in WebSocketAuthInterceptorConfig with @Order(HIGHEST_PRECEDENCE + 99)
 * so they get their own @Order independently from this config (Research Pitfall 1).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket only — no .withSockJS() (per CLAUDE.md constraints)
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Messages sent to /app/... are routed to @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");
        // In-memory broker for topic and queue style messaging
        config.enableSimpleBroker("/topic", "/queue");
        // User-specific destinations: /user/{username}/queue/...
        config.setUserDestinationPrefix("/user");
    }
}
