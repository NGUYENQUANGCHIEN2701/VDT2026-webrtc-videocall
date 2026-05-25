package com.vdt.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Separate @Configuration class that wires JwtChannelInterceptor into the
 * STOMP clientInboundChannel with explicit ordering.
 *
 * DESIGN DECISION: This must be a SEPARATE @Configuration from WebSocketConfig
 * so it gets its own @Order(HIGHEST_PRECEDENCE + 99), ensuring JWT validation
 * runs before any Spring Security channel interceptors (Research Pitfall 1).
 *
 * Only configureClientInboundChannel is overridden here. registerStompEndpoints
 * and configureMessageBroker remain in WebSocketConfig (single responsibility).
 */
@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class WebSocketAuthInterceptorConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
    }
}
