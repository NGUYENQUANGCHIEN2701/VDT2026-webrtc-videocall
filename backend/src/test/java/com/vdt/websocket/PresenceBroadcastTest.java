package com.vdt.websocket;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * Wave 0 stub tests for PRES-01 and PRES-02 presence broadcast behavior.
 * These will be driven to GREEN by Plan 02-02 which implements PresenceService
 * and the SessionEventListener. The class must compile so Plans 02-01 and 02-02
 * can share the same test harness without renaming.
 *
 * Imports are present so Plan 02-02 can simply remove @Disabled and fill in bodies.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PresenceBroadcastTest {

    // These fields will be wired by Plan 02-02 — declared here so test compilation succeeds
    @SuppressWarnings("unused")
    private final BlockingQueue<String> presenceMessages = new LinkedBlockingQueue<>();

    /**
     * PRES-01: When a user connects (STOMP CONNECT), their status becomes ONLINE
     * and a presence broadcast is sent to /topic/presence.
     *
     * Wave 0 stub — implemented by Plan 02-02-PLAN.md
     */
    @Test
    @Disabled("Wave 0 stub for PRES-01 — implemented by Plan 02-02-PLAN.md")
    void testPresenceBroadcastOnConnect() {
        fail("Wave 0 stub — not yet implemented");
    }

    /**
     * PRES-02: When a user disconnects (session closed), their status becomes OFFLINE
     * and a presence broadcast is sent to /topic/presence.
     *
     * Wave 0 stub — implemented by Plan 02-02-PLAN.md
     */
    @Test
    @Disabled("Wave 0 stub for PRES-02 — implemented by Plan 02-02-PLAN.md")
    void testPresenceBroadcastOnDisconnect() {
        fail("Wave 0 stub — not yet implemented");
    }
}
