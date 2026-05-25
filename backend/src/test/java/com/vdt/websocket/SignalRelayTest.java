package com.vdt.websocket;

import com.vdt.auth.JwtService;
import com.vdt.user.User;
import com.vdt.user.UserRepository;
import com.vdt.user.UserStatus;
import com.vdt.websocket.dto.SignalMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for CALL-05 signal relay behavior via STOMP.
 *
 * Tests verify:
 * - CALL-05: /app/signal is relayed to the recipient's /user/queue/signal
 * - T-2-02 (spoof prevention): server overwrites client-supplied from with JWT principal
 *
 * Runs against the H2 test profile (application-test.yml) — no DB writes for signaling.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SignalRelayTest {

    @LocalServerPort
    int port;

    @Autowired
    JwtService jwtService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        // Seed alice
        userRepository.save(User.builder()
                .username("alice")
                .passwordHash(passwordEncoder.encode("password"))
                .displayName("alice")
                .status(UserStatus.OFFLINE)
                .build());

        // Seed bob
        userRepository.save(User.builder()
                .username("bob")
                .passwordHash(passwordEncoder.encode("password"))
                .displayName("bob")
                .status(UserStatus.OFFLINE)
                .build());
    }

    /**
     * CALL-05: A signal message sent to /app/signal is relayed to the target user
     * via /user/{target}/queue/signal within 3 seconds.
     */
    @Test
    void testSignalMessageDelivered() throws Exception {
        WebSocketStompClient stompClient = buildStompClient();
        BlockingQueue<SignalMessage> inbox = new LinkedBlockingQueue<>();

        // Connect bob first and subscribe to his signal queue
        StompSession bobSession = connect(stompClient, "bob");
        bobSession.subscribe("/user/queue/signal", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return SignalMessage.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                inbox.offer((SignalMessage) payload);
            }
        });

        // Small sleep to ensure subscription is registered before alice sends
        Thread.sleep(100);

        // Connect alice and send a signal to bob
        StompSession aliceSession = connect(stompClient, "alice");

        // from=null — server will set it from JWT principal
        SignalMessage msg = new SignalMessage("bob", "offer", "fake-sdp-offer", null);
        aliceSession.send("/app/signal", msg);

        try {
            SignalMessage received = inbox.poll(3, TimeUnit.SECONDS);
            assertThat(received).isNotNull();
            assertThat(received.getType()).isEqualTo("offer");
            assertThat(received.getPayload()).isEqualTo("fake-sdp-offer");
            assertThat(received.getTo()).isEqualTo("bob");
        } finally {
            aliceSession.disconnect();
            bobSession.disconnect();
        }
    }

    /**
     * CALL-05 / T-2-02 (spoof prevention): The {@code from} field in a relayed signal
     * is always the JWT principal ("alice"), never the client-supplied value ("admin").
     *
     * Even if an attacker manually sets from="admin" in the JSON body, the server
     * unconditionally overwrites it with principal.getName() before relay.
     */
    @Test
    void testSignalFromOverwritten() throws Exception {
        WebSocketStompClient stompClient = buildStompClient();
        BlockingQueue<SignalMessage> inbox = new LinkedBlockingQueue<>();

        // Connect bob first and subscribe to his signal queue
        StompSession bobSession = connect(stompClient, "bob");
        bobSession.subscribe("/user/queue/signal", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return SignalMessage.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                inbox.offer((SignalMessage) payload);
            }
        });

        // Small sleep to ensure subscription is registered before alice sends
        Thread.sleep(100);

        // Connect alice and send with spoofed from="admin"
        StompSession aliceSession = connect(stompClient, "alice");

        // from="admin" — client attempts spoofing; server must overwrite with "alice"
        SignalMessage msg = new SignalMessage("bob", "offer", "fake-sdp", "admin");
        aliceSession.send("/app/signal", msg);

        try {
            SignalMessage received = inbox.poll(3, TimeUnit.SECONDS);
            assertThat(received).isNotNull();
            // Primary assertion: server replaced client-supplied "admin" with "alice"
            assertThat(received.getFrom()).isEqualTo("alice");
            // Redundant but documents intent: the spoofed value must NOT be present
            assertThat(received.getFrom()).isNotEqualTo("admin");
        } finally {
            aliceSession.disconnect();
            bobSession.disconnect();
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private WebSocketStompClient buildStompClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }

    private StompSession connect(WebSocketStompClient stompClient, String username) throws Exception {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + jwtService.generateToken(username));
        return stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                headers,
                new StompSessionHandlerAdapter() {}
        ).get(3, TimeUnit.SECONDS);
    }
}
