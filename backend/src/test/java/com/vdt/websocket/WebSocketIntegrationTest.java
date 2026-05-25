package com.vdt.websocket;

import com.vdt.auth.JwtService;
import com.vdt.user.User;
import com.vdt.user.UserRepository;
import com.vdt.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration tests for STOMP WebSocket JWT authentication.
 * Covers PRES-01/AUTH-04: valid JWT connects, invalid JWT is rejected.
 *
 * These tests are REAL (not stubs) and must pass GREEN after Plan 02-01.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WebSocketIntegrationTest {

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
        // Seed a test user so JWT-generated token maps to a real DB user
        User user = User.builder()
                .username("testuser")
                .passwordHash(passwordEncoder.encode("password"))
                .displayName("testuser")
                .status(UserStatus.OFFLINE)
                .build();
        userRepository.save(user);
    }

    /**
     * PRES-01 / AUTH-04: STOMP CONNECT with a valid JWT in Authorization header is accepted.
     * Session principal must be set to the JWT username.
     */
    @Test
    void testConnectWithValidJwt() throws Exception {
        WebSocketStompClient stompClient = buildStompClient();

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + jwtService.generateToken("testuser"));

        StompSession session = stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                connectHeaders,
                new StompSessionHandlerAdapter() {}
        ).get(5, TimeUnit.SECONDS);

        assertThat(session.isConnected()).isTrue();
        session.disconnect();
    }

    /**
     * PRES-01 / AUTH-04: STOMP CONNECT with an invalid JWT is rejected.
     * ExecutionException wraps the connection error.
     */
    @Test
    void testConnectWithInvalidJwt() {
        WebSocketStompClient stompClient = buildStompClient();

        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer invalid-token");

        assertThrows(ExecutionException.class, () ->
                stompClient.connectAsync(
                        "ws://localhost:" + port + "/ws",
                        new WebSocketHttpHeaders(),
                        connectHeaders,
                        new StompSessionHandlerAdapter() {}
                ).get(5, TimeUnit.SECONDS)
        );
    }

    private WebSocketStompClient buildStompClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }
}
