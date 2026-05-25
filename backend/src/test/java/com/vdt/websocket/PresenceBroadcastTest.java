package com.vdt.websocket;

import com.vdt.auth.JwtService;
import com.vdt.user.User;
import com.vdt.user.UserRepository;
import com.vdt.user.UserStatus;
import com.vdt.websocket.dto.PresenceDTO;
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
 * Integration tests for STOMP presence broadcast (PRES-01, PRES-02).
 * Drives PresenceBroadcastTest from Wave 0 @Disabled stubs to GREEN.
 *
 * Tests verify:
 * - PRES-01: connect broadcasts onlineUsers list including the connector
 * - PRES-02: disconnect broadcasts updated list excluding the departed user
 *
 * Uses H2 test profile (application-test.yml) from Phase 1 — no extra config needed.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PresenceBroadcastTest {

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
     * PRES-01: When alice connects after bob is already subscribed to /topic/presence,
     * bob receives a PresenceDTO whose onlineUsers contains both "alice" and "bob".
     */
    @Test
    void testPresenceBroadcastOnConnect() throws Exception {
        WebSocketStompClient stompClient = buildStompClient();
        BlockingQueue<PresenceDTO> bobInbox = new LinkedBlockingQueue<>();

        // Connect bob first
        StompHeaders bobHeaders = new StompHeaders();
        bobHeaders.add("Authorization", "Bearer " + jwtService.generateToken("bob"));
        StompSession bobSession = stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                bobHeaders,
                new StompSessionHandlerAdapter() {}
        ).get(5, TimeUnit.SECONDS);

        // Subscribe bob to /topic/presence
        bobSession.subscribe("/topic/presence", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return PresenceDTO.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                bobInbox.offer((PresenceDTO) payload);
            }
        });

        // Drain the initial presence frame triggered by bob's own connect
        bobInbox.poll(2, TimeUnit.SECONDS);

        // Connect alice
        StompHeaders aliceHeaders = new StompHeaders();
        aliceHeaders.add("Authorization", "Bearer " + jwtService.generateToken("alice"));
        StompSession aliceSession = stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                aliceHeaders,
                new StompSessionHandlerAdapter() {}
        ).get(5, TimeUnit.SECONDS);

        try {
            // Bob should receive a presence update showing both alice and bob online
            PresenceDTO frame = bobInbox.poll(3, TimeUnit.SECONDS);
            assertThat(frame).isNotNull();
            assertThat(frame.getOnlineUsers()).contains("alice");
            assertThat(frame.getOnlineUsers()).contains("bob");
        } finally {
            aliceSession.disconnect();
            bobSession.disconnect();
        }
    }

    /**
     * PRES-02: When alice disconnects, bob receives a PresenceDTO whose
     * onlineUsers does NOT contain "alice".
     */
    @Test
    void testPresenceBroadcastOnDisconnect() throws Exception {
        WebSocketStompClient stompClient = buildStompClient();
        BlockingQueue<PresenceDTO> bobInbox = new LinkedBlockingQueue<>();

        // Connect bob first
        StompHeaders bobHeaders = new StompHeaders();
        bobHeaders.add("Authorization", "Bearer " + jwtService.generateToken("bob"));
        StompSession bobSession = stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                bobHeaders,
                new StompSessionHandlerAdapter() {}
        ).get(5, TimeUnit.SECONDS);

        // Subscribe bob to /topic/presence
        bobSession.subscribe("/topic/presence", new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return PresenceDTO.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                bobInbox.offer((PresenceDTO) payload);
            }
        });

        // Connect alice
        StompHeaders aliceHeaders = new StompHeaders();
        aliceHeaders.add("Authorization", "Bearer " + jwtService.generateToken("alice"));
        StompSession aliceSession = stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                aliceHeaders,
                new StompSessionHandlerAdapter() {}
        ).get(5, TimeUnit.SECONDS);

        // Drain all presence frames accumulated so far (bob connect, alice connect)
        int guard = 0;
        while (bobInbox.poll(500, TimeUnit.MILLISECONDS) != null && guard++ < 10) {
            // drain
        }

        // Disconnect alice
        aliceSession.disconnect();

        try {
            // Bob should receive a presence update showing alice is gone
            PresenceDTO frame = bobInbox.poll(3, TimeUnit.SECONDS);
            assertThat(frame).isNotNull();
            assertThat(frame.getOnlineUsers()).doesNotContain("alice");
        } finally {
            bobSession.disconnect();
        }
    }

    private WebSocketStompClient buildStompClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }
}
