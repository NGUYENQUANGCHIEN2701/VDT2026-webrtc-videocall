package com.vdt.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vdt.user.UserRepository;
import com.vdt.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    // AUTH-01: happy path — POST /api/auth/register with valid creds returns 201 + JWT
    @Test
    void testRegisterSuccess() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "alice", "password", "secret123"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();

        // Verify token is non-empty
        String body = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(body).get("token").asText();
        assertThat(token).isNotBlank();

        // Verify user persisted with OFFLINE status and displayName=username (D-11)
        var user = userRepository.findByUsername("alice");
        assertThat(user).isPresent();
        assertThat(user.get().getStatus()).isEqualTo(UserStatus.OFFLINE);
        assertThat(user.get().getDisplayName()).isEqualTo("alice");
    }

    // AUTH-01: duplicate username returns 409 with error=USERNAME_TAKEN
    @Test
    void testRegisterDuplicateUsername() throws Exception {
        // Pre-create user "alice"
        registerUser("alice", "secret123");

        // Re-register same username
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "alice", "password", "secret123"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("USERNAME_TAKEN"));
    }

    // AUTH-01: invalid username (too short) returns 400 with error=VALIDATION_ERROR
    @Test
    void testRegisterInvalidUsername() throws Exception {
        // username "ab" has only 2 chars — fails @Size(min=3)
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "ab", "password", "secret123"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    // AUTH-02: happy path — login returns 200 with valid JWT; DB status flips to ONLINE
    @Test
    void testLoginSuccess() throws Exception {
        registerUser("alice", "secret123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "alice", "password", "secret123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();

        // Verify token has three dot-separated segments (JWT format)
        String body = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(body).get("token").asText();
        assertThat(token.split("\\.")).hasSize(3);

        // Verify status flipped to ONLINE (AUTH-03 login flip)
        assertThat(userRepository.findByUsername("alice").get().getStatus()).isEqualTo(UserStatus.ONLINE);
    }

    // AUTH-02: wrong password returns 401 with error=INVALID_CREDENTIALS
    @Test
    void testLoginWrongPassword() throws Exception {
        registerUser("alice", "secret123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "alice", "password", "wrongpass"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
    }

    // AUTH-03: logout flips status to OFFLINE in DB
    @Test
    void testLogoutSetsOffline() throws Exception {
        String token = registerUser("alice", "secret123");
        // Login to flip to ONLINE first
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "alice", "password", "secret123"))))
                .andExpect(status().isOk())
                .andReturn();
        String loginToken = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();

        // Logout with valid Bearer token
        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk());

        // Verify status flipped back to OFFLINE
        assertThat(userRepository.findByUsername("alice").get().getStatus()).isEqualTo(UserStatus.OFFLINE);
    }

    // AUTH-04: protected endpoint with valid JWT returns 200 with user data
    @Test
    void testProtectedEndpointWithJwt() throws Exception {
        registerUser("alice", "secret123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "alice", "password", "secret123"))))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.displayName").value("alice"))
                .andExpect(jsonPath("$.status").exists());
    }

    // AUTH-04: protected endpoint without token returns 401
    @Test
    void testProtectedEndpointNoToken() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    // Helper: register a user and return the JWT token
    private String registerUser(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", username, "password", password))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }
}
