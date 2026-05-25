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
 * Wave 0 stub tests for CALL-05 signal relay behavior.
 * These will be driven to GREEN by Plan 02-03 which implements SignalController.
 * The class must compile so Plans 02-01 and 02-03 can share the test harness
 * without renaming methods.
 *
 * Key security property (T-2-02 mitigation) verified by testSignalFromOverwritten:
 * the server overwrites the client-supplied `from` field with the JWT principal,
 * preventing signal spoofing.
 *
 * Imports are present so Plan 02-03 can simply remove @Disabled and fill in bodies.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SignalRelayTest {

    // These fields will be wired by Plan 02-03 — declared here so test compilation succeeds
    @SuppressWarnings("unused")
    private final BlockingQueue<String> signalMessages = new LinkedBlockingQueue<>();

    /**
     * CALL-05: A signal message sent to /app/signal is relayed to the target user
     * via /user/{target}/queue/signal.
     *
     * Wave 0 stub — implemented by Plan 02-03-PLAN.md
     */
    @Test
    @Disabled("Wave 0 stub for CALL-05 — implemented by Plan 02-03-PLAN.md")
    void testSignalMessageDelivered() {
        fail("Wave 0 stub — not yet implemented");
    }

    /**
     * CALL-05 / T-2-02 (spoof prevention): The `from` field in a relayed signal
     * is always the JWT principal, never the client-supplied value.
     *
     * Wave 0 stub — implemented by Plan 02-03-PLAN.md
     */
    @Test
    @Disabled("Wave 0 stub for CALL-05 — implemented by Plan 02-03-PLAN.md")
    void testSignalFromOverwritten() {
        fail("Wave 0 stub — not yet implemented");
    }
}
