# Phase 2: WebSocket Infrastructure - Research

**Researched:** 2026-05-25
**Domain:** Spring WebSocket + STOMP signaling, JWT authentication on WebSocket connections, presence service, user-targeted messaging
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRES-01 | User can see a realtime list of online users (auto-updates on join/leave without page reload) | `@EventListener(SessionConnectedEvent)` triggers presence broadcast to `/topic/presence`; all connected clients receive the update |
| PRES-02 | User's online/offline status is automatically updated when they log in, log out, or disconnect | `SessionConnectedEvent` / `SessionDisconnectEvent` drive status transitions; `User.status` updated in DB; WS disconnect detected server-side without any client action |
| CALL-05 | Signaling via WebSocket (STOMP) exchanging SDP offer/answer and ICE candidates | `@MessageMapping("/signal")` routes to `convertAndSendToUser()` using JWT principal as sender identity |
| CALL-06 | Google public STUN server used for ICE candidate resolution | STUN config is frontend-only (`RTCConfiguration`); backend only relays candidates as opaque payloads — no backend change needed |

</phase_requirements>

---

## Summary

Phase 2 adds a STOMP WebSocket layer on top of the Spring Boot 3.3.x backend produced in Phase 1. The core work is: (1) configure Spring's STOMP message broker, (2) authenticate STOMP CONNECT frames by extracting and validating the JWT already issued in Phase 1, (3) implement a presence service that tracks connected principals and broadcasts the online user list to `/topic/presence` on connect and disconnect, and (4) implement a signaling relay controller that routes SDP/ICE messages from one authenticated client to another via `convertAndSendToUser()`.

The single most critical decision is how JWT authentication enters the STOMP pipeline. The HTTP WebSocket upgrade endpoint must be permitted without auth (because the JWT lives in the STOMP CONNECT frame, not in the HTTP upgrade request). The actual authentication happens in a `ChannelInterceptor` registered on `configureClientInboundChannel`, which extracts the `Authorization` header from the STOMP CONNECT frame, validates the JWT using the existing `JwtService`, and calls `accessor.setUser()`. This interceptor MUST be declared in a separate `@Configuration` class annotated `@Order(Ordered.HIGHEST_PRECEDENCE + 99)` to ensure it runs before Spring Security's own channel interceptors.

CALL-06 (Google STUN) requires no backend implementation — the STUN configuration is a frontend-only `RTCPeerConnection` option (`{ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }`). The signaling relay is opaque on the server: the backend does not interpret ICE candidates or SDP, it only routes the JSON payload from sender to recipient.

**Primary recommendation:** Add `spring-boot-starter-websocket` to pom.xml, create two new `@Configuration` classes (`WebSocketConfig` + `WebSocketAuthInterceptorConfig`), one `@Service` (`PresenceService`), one `@Component` presence event listener, and one `@Controller` (`SignalController`). Reuse `JwtService` from Phase 1 — no changes to the JWT layer needed.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| STOMP endpoint configuration | API / Backend | — | `WebSocketMessageBrokerConfigurer` sets `/ws` endpoint, broker prefixes, user destination prefix |
| JWT auth on STOMP CONNECT | API / Backend (channel layer) | — | `ChannelInterceptor.preSend()` validates JWT and sets `accessor.setUser()` before message routing |
| Presence tracking (in-memory) | API / Backend | Database / Storage | `ConcurrentHashMap<String, String>` (sessionId → username); DB status update is secondary side-effect |
| Presence broadcast | API / Backend | — | `SimpMessagingTemplate.convertAndSend("/topic/presence", presenceDTO)` on every connect/disconnect |
| Signaling relay | API / Backend | — | `@MessageMapping("/signal")` → `convertAndSendToUser(recipientUsername, "/queue/signal", payload)` |
| ICE STUN configuration | Browser / Client | — | `RTCPeerConnection` config — no backend involvement |
| HTTP Security permit `/ws/**` | API / Backend (filter) | — | Already in Phase 1 `SecurityConfig`; just needs verification |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| spring-boot-starter-websocket | (BOM managed, ~3.3.x) | STOMP message broker + WebSocket transport | Managed by Spring Boot BOM; includes `spring-websocket` and `spring-messaging` [CITED: docs.spring.io/spring-boot/reference/messaging/websockets.html] |
| spring-messaging | (BOM managed, transitive) | `SimpMessagingTemplate`, `ChannelInterceptor`, `StompHeaderAccessor` | Pulled in transitively by `spring-boot-starter-websocket` [CITED: docs.spring.io/spring-framework/reference/web/websocket/stomp/enable.html] |
| JwtService (Phase 1) | already in project | JWT validation reused for STOMP CONNECT auth | No new dependency — same `JwtService.extractUsername()` and `isTokenExpired()` |

### No New External Dependencies

Phase 2 requires zero new Maven dependencies beyond `spring-boot-starter-websocket`. All other classes (`JwtService`, `UserRepository`, `UserDetailsService`) are reused from Phase 1. No version pinning needed — the websocket starter is fully managed by the Spring Boot BOM.

**pom.xml addition:**
```xml
<!-- Spring WebSocket + STOMP — version managed by Spring Boot BOM -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

**Version verification:**
```bash
# In the backend directory
./mvnw dependency:tree -Dincludes=org.springframework:spring-websocket
```

---

## Package Legitimacy Audit

> Only one new Maven artifact is added in this phase.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| org.springframework.boot:spring-boot-starter-websocket | Maven Central | ~12 years | Hundreds of millions | [github.com/spring-projects/spring-boot](https://github.com/spring-projects/spring-boot) | N/A (official Spring Boot artifact) | Approved [CITED: docs.spring.io/spring-boot/reference/messaging/websockets.html] |

**Packages removed due to slopcheck verdict:** none
**Packages flagged as suspicious:** none

*slopcheck not applicable — this is an official Spring Boot project artifact on Maven Central, part of the Spring Boot BOM, with multi-year history and hundreds of millions of downloads.*

---

## Architecture Patterns

### System Architecture Diagram

```
                      HTTP WebSocket Upgrade
WebSocket Client ─────────────────────────────► /ws  (permitAll — Spring Security HTTP filter)
                                                  │
                                                  ▼
                                       STOMP CONNECT frame
                                                  │
                             ┌────────────────────▼───────────────────────┐
                             │     clientInboundChannel                   │
                             │                                            │
                             │  [1] JwtChannelInterceptor.preSend()       │
                             │      Extract Authorization header          │
                             │      Validate JWT → JwtService             │
                             │      accessor.setUser(authToken)           │
                             │      REJECT → throw AccessDeniedException  │
                             └─────────────────────┬──────────────────────┘
                                                   │ STOMP CONNECT (authenticated)
                    ┌──────────────────────────────▼──────────────────────────────┐
                    │             Spring STOMP Message Broker (in-memory)         │
                    │                                                             │
                    │  /topic/**  ──────────────► broadcast to all subscribers   │
                    │  /queue/**  ──────────────► point-to-point per user        │
                    │  /app/**    ──────────────► @MessageMapping controllers    │
                    └──────────┬──────────────────────────────────────────────────┘
                               │
             ┌─────────────────┼─────────────────────────┐
             │                 │                         │
             ▼                 ▼                         ▼
   SessionConnectedEvent  SessionDisconnectEvent    SEND to /app/signal
             │                 │                         │
   ┌─────────▼─────────┐       │              ┌──────────▼──────────┐
   │  PresenceListener  │◄──────┘              │  SignalController   │
   │  onConnect():      │                      │  @MessageMapping    │
   │   add to map       │                      │  ("/signal")        │
   │   update DB ONLINE │                      │  extract recipient  │
   │   broadcast list   │                      │  from payload       │
   │                    │                      │  convertAndSend     │
   │  onDisconnect():   │                      │  ToUser(recipient,  │
   │   remove from map  │                      │  "/queue/signal",   │
   │   update DB OFFLINE│                      │  payload)           │
   │   broadcast list   │                      └─────────────────────┘
   └────────────────────┘
             │
             ▼  SimpMessagingTemplate.convertAndSend("/topic/presence", presenceDTO)
   All connected clients receive updated online user list
```

### Recommended Project Structure (additions to Phase 1)

```
backend/src/main/java/com/vdt/
├── websocket/
│   ├── WebSocketConfig.java             # @EnableWebSocketMessageBroker, broker config
│   ├── WebSocketAuthInterceptorConfig.java  # @Order(HIGHEST_PRECEDENCE+99) JWT interceptor
│   ├── JwtChannelInterceptor.java       # ChannelInterceptor: validates JWT on CONNECT
│   ├── PresenceService.java             # ConcurrentHashMap session registry
│   ├── PresenceEventListener.java       # @EventListener for connect/disconnect events
│   ├── SignalController.java            # @MessageMapping("/signal") relay
│   └── dto/
│       ├── PresenceDTO.java             # { List<String> onlineUsers }
│       └── SignalMessage.java           # { String to, String type, String payload }
```

### Pattern 1: WebSocketConfig — STOMP Broker Configuration

**What:** Configures the STOMP message broker, WebSocket endpoint, and destination prefixes.
**When to use:** One per application; the single `@EnableWebSocketMessageBroker` class.

```java
// Source: docs.spring.io/spring-framework/reference/web/websocket/stomp/enable.html
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket endpoint — NO SockJS (CLAUDE.md decision)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");  // permit all origins for LAN dev
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Messages to /app/... are routed to @MessageMapping controllers
        config.setApplicationDestinationPrefixes("/app");
        // Simple in-memory broker for /topic (broadcast) and /queue (point-to-point)
        config.enableSimpleBroker("/topic", "/queue");
        // User-targeted messages: /user/{username}/queue/signal
        config.setUserDestinationPrefix("/user");
    }
}
```

### Pattern 2: WebSocketAuthInterceptorConfig — JWT Auth on CONNECT Frame

**What:** Validates the JWT from the STOMP CONNECT `Authorization` header and sets the authenticated principal.
**Critical:** Must be in a SEPARATE `@Configuration` class from `WebSocketConfig`, annotated `@Order(Ordered.HIGHEST_PRECEDENCE + 99)` to run before Spring Security's channel interceptors.

```java
// Source: docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html
// Source: blog.softbinator.com/overcome-websocket-authentication-issues-stomp/
@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE + 99)  // MUST run before Spring Security interceptors
public class WebSocketAuthInterceptorConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    public WebSocketAuthInterceptorConfig(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
    }
}
```

### Pattern 3: JwtChannelInterceptor — JWT Extraction and Validation

**What:** Intercepts every STOMP message on `clientInboundChannel`; for CONNECT frames only, extracts and validates JWT.

```java
// Source: docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html
@Component
@RequiredArgsConstructor
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
                accessor.setUser(authToken);  // Sets principal for all subsequent STOMP messages
            } catch (Exception e) {
                // Any JWT parse error → reject connection
                throw new IllegalArgumentException("JWT validation failed: " + e.getMessage());
            }
        }
        return message;
    }
}
```

**Key point:** After `accessor.setUser(authToken)`, every subsequent STOMP frame in this session has `accessor.getUser()` available. The `@MessageMapping` methods can then receive `Principal principal` and call `principal.getName()` to get the authenticated username.

### Pattern 4: PresenceService — In-Memory Session Registry

**What:** Thread-safe registry of currently connected sessions. Uses `ConcurrentHashMap` because connect/disconnect events fire from different threads.

```java
// Source: spring.io WebSocket architecture patterns + java.util.concurrent
@Service
public class PresenceService {

    // Maps sessionId → username (one entry per STOMP session)
    private final ConcurrentHashMap<String, String> sessions = new ConcurrentHashMap<>();

    public void addSession(String sessionId, String username) {
        sessions.put(sessionId, username);
    }

    public void removeSession(String sessionId) {
        sessions.remove(sessionId);
    }

    /** Returns distinct online usernames (a user might have multiple sessions). */
    public List<String> getOnlineUsers() {
        return sessions.values().stream()
            .distinct()
            .sorted()
            .collect(java.util.stream.Collectors.toList());
    }
}
```

### Pattern 5: PresenceEventListener — Connect/Disconnect Broadcasts

**What:** Listens to `SessionConnectedEvent` and `SessionDisconnectEvent` to update presence state and broadcast the online user list.

```java
// Source: docs.spring.io/spring-framework/reference/web/websocket/stomp/application-context-events.html
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        if (user == null) return;

        String username = user.getName();
        String sessionId = accessor.getSessionId();

        presenceService.addSession(sessionId, username);
        // Update DB status to ONLINE
        userRepository.findByUsername(username)
            .ifPresent(u -> {
                u.setStatus(UserStatus.ONLINE);
                userRepository.save(u);
            });
        broadcastPresence();
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        // NOTE: event.getUser() may be null — prefer StompHeaderAccessor
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        String sessionId = event.getSessionId();

        presenceService.removeSession(sessionId);

        // Only update DB and broadcast if we had a principal
        if (user != null) {
            String username = user.getName();
            // Check if user has no remaining sessions before marking OFFLINE
            if (!presenceService.getOnlineUsers().contains(username)) {
                userRepository.findByUsername(username)
                    .ifPresent(u -> {
                        u.setStatus(UserStatus.OFFLINE);
                        userRepository.save(u);
                    });
            }
        }
        broadcastPresence();
    }

    private void broadcastPresence() {
        List<String> onlineUsers = presenceService.getOnlineUsers();
        messagingTemplate.convertAndSend("/topic/presence",
            new PresenceDTO(onlineUsers));
    }
}
```

**Critical note:** `SessionDisconnectEvent` may fire more than once for a single session. `PresenceService.removeSession()` must be idempotent (ConcurrentHashMap.remove() is already idempotent). [CITED: docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/socket/messaging/SessionDisconnectEvent.html]

### Pattern 6: SignalController — Signaling Message Relay

**What:** Routes signaling messages (SDP offer/answer, ICE candidates) from the sender to the recipient's private queue.

```java
// Source: docs.spring.io/spring-framework/reference/web/websocket/stomp/user-destination.html
@Controller
@RequiredArgsConstructor
public class SignalController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/signal")
    public void handleSignal(@Payload SignalMessage message, Principal principal) {
        // message.to() = recipient username (from payload)
        // principal.getName() = authenticated sender username
        // The server relays without interpreting content — opaque SDP/ICE payload
        messagingTemplate.convertAndSendToUser(
            message.getTo(),        // recipient username
            "/queue/signal",        // destination — client subscribes to /user/queue/signal
            message                 // relayed as-is (type + sdp/candidate payload)
        );
    }
}
```

**Client-side subscription pattern (for reference / Phase 3+4):**
```javascript
// Recipient subscribes at:
stompClient.subscribe('/user/queue/signal', (frame) => {
    const msg = JSON.parse(frame.body);
    // handle SDP offer/answer or ICE candidate
});
```

### Pattern 7: PresenceDTO and SignalMessage DTOs

```java
// PresenceDTO — broadcast payload for /topic/presence
public record PresenceDTO(List<String> onlineUsers) {}

// SignalMessage — signaling relay payload for /app/signal
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignalMessage {
    private String to;      // recipient username
    private String type;    // "offer" | "answer" | "ice-candidate" | "call-request" | "call-decline" | "call-end"
    private String payload; // JSON-encoded SDP or ICE candidate (opaque to server)
    private String from;    // sender username — server MUST overwrite with principal.getName() in controller
}
```

**Security note:** The `from` field in `SignalMessage` must be ignored by the controller. The sender identity comes from `principal.getName()` (the JWT-authenticated principal), not from the client-supplied payload field. This prevents spoofing.

### Pattern 8: SecurityConfig Changes for WebSocket

The Phase 1 `SecurityConfig` already has `.requestMatchers("/ws/**").permitAll()`. **No additional SecurityConfig changes are required for Phase 2.**

The HTTP Security filter chain permits the WebSocket upgrade URL, and all authentication happens inside the STOMP `ChannelInterceptor` after the upgrade. CSRF is already disabled for the REST API (stateless JWT); the WebSocket connection inherits this.

**Verification check — confirm Phase 1 SecurityConfig has the permitAll for /ws:**
The existing `SecurityConfig.filterChain()` includes:
```java
.requestMatchers("/ws/**").permitAll()  // confirmed present in Phase 1 code
```
This is the only SecurityConfig change needed.

### Anti-Patterns to Avoid

- **Putting `@EnableWebSocketMessageBroker` and the JWT interceptor in the same class:** The ordering of Spring Security's interceptor vs. the JWT interceptor becomes unpredictable. Always use two separate `@Configuration` classes. [CITED: docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html]
- **Registering JWT interceptor in `WebSocketConfig.configureClientInboundChannel()` without `@Order`:** Spring Security's `SecurityContextChannelInterceptor` runs first and may find no `SecurityContext` because the JWT principal hasn't been set yet.
- **Using SockJS fallback:** CLAUDE.md decision is native WebSocket only. Do NOT add `.withSockJS()` to the endpoint registration.
- **Reading `event.getUser()` directly from `SessionDisconnectEvent` without null check:** The `@Nullable` annotation on `getUser()` means it can return null if the session was not authenticated. Always null-check.
- **Trusting the `from` field in `SignalMessage`:** Attacker can set `from = "admin"`. Always use `principal.getName()` for sender identity.
- **Trying to authenticate via HTTP `Authorization` header on the WebSocket upgrade:** Browsers do not send custom HTTP headers during WebSocket upgrade. The JWT MUST come in the STOMP CONNECT frame header, not the HTTP upgrade request.
- **Using `@EnableWebSocketSecurity` (Spring Security 5.8+ annotation):** This adds `AuthorizationChannelInterceptor` which by default denies all messages. For this project's simple JWT-based auth, avoid `@EnableWebSocketSecurity` — just use the custom `ChannelInterceptor`. If `@EnableWebSocketSecurity` is added accidentally, it requires a separate `AuthorizationManager<Message<?>>` bean that permits everything from authenticated users.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket session tracking per user | Custom session map with manual cleanup | `SimpMessagingTemplate.convertAndSendToUser()` + principal from `ChannelInterceptor` | Spring's `DefaultUserDestinationResolver` already maps username → session(s); `convertAndSendToUser()` handles multi-session users automatically |
| Message routing to specific user | Custom routing table | `convertAndSendToUser(username, "/queue/signal", payload)` | Handles routing, serialization, and all active sessions for the user in one call |
| Presence broadcast timing | Polling `/api/users/online` every N seconds | `@EventListener(SessionConnectedEvent/SessionDisconnectEvent)` + `/topic/presence` | Server-push via WebSocket; no polling, no HTTP overhead, sub-second latency |
| STOMP frame parsing | Manual byte-buffer parsing | `StompHeaderAccessor.wrap(message)` + `accessor.getFirstNativeHeader()` | Framework-managed parsing with full STOMP spec compliance |
| Thread-safe session registry | `synchronized` blocks on session map | `ConcurrentHashMap` | Lock-free concurrent reads/writes; simpler and faster than synchronized blocks |
| JWT parsing in interceptor | Duplicate JWT logic | Inject and reuse `JwtService` from Phase 1 | Single source of truth; all validation logic already tested in Phase 1 |

---

## Common Pitfalls

### Pitfall 1: Two WebSocketMessageBrokerConfigurer Beans — @Order Must Differ

**What goes wrong:** If `WebSocketConfig` and `WebSocketAuthInterceptorConfig` both implement `WebSocketMessageBrokerConfigurer` but neither has `@Order`, Spring processes them in undefined order. The JWT interceptor may run after Spring Security's interceptor, which already rejected the unauthenticated CONNECT.
**Why it happens:** Spring applies `WebSocketMessageBrokerConfigurer` beans in order; Spring Security registers its own `WebSocketMessageBrokerConfigurer` without a public ordering guarantee.
**How to avoid:** Annotate `WebSocketAuthInterceptorConfig` with `@Order(Ordered.HIGHEST_PRECEDENCE + 99)`. Leave `WebSocketConfig` without `@Order` (defaults to `LOWEST_PRECEDENCE`).
**Warning signs:** CONNECT frames with valid JWTs are rejected with `403` or connection-closed; removing the security dependency fixes it.

### Pitfall 2: `/ws/**` Not Permitted in SecurityConfig

**What goes wrong:** The WebSocket upgrade HTTP request returns `401 Unauthorized` before STOMP is even reached — no CONNECT frame is ever processed.
**Why it happens:** Spring Security's HTTP filter chain intercepts the HTTP upgrade request. If the path is not explicitly permitted, it applies the default `authenticated()` rule. There is no `Authorization: Bearer` header in the HTTP upgrade (browsers don't send custom headers on WebSocket handshake).
**How to avoid:** Phase 1's `SecurityConfig` already has `.requestMatchers("/ws/**").permitAll()`. Confirm this is present before starting Phase 2 work. [VERIFIED from actual Phase 1 SecurityConfig.java]
**Warning signs:** WebSocket client receives HTTP 401 on the initial `ws://` connection attempt, never gets to STOMP CONNECT.

### Pitfall 3: `SessionDisconnectEvent` Fires Multiple Times

**What goes wrong:** Presence service marks a user OFFLINE and broadcasts the update, then fires again for the same session, causing redundant DB writes and double-broadcast events.
**Why it happens:** Spring explicitly documents: "this event may be raised more than once per session." [CITED: docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/socket/messaging/SessionDisconnectEvent.html]
**How to avoid:** `ConcurrentHashMap.remove()` is idempotent — the second removal is a no-op. The broadcast is also harmless (same user list). However, the DB update should check `presenceService.getOnlineUsers().contains(username)` before setting OFFLINE, to avoid redundant saves.
**Warning signs:** Duplicate "user X disconnected" log entries; flapping ONLINE/OFFLINE in the DB.

### Pitfall 4: STOMP `accessor.getUser()` Returns null in `SessionConnectedEvent`

**What goes wrong:** `accessor.getUser()` returns null in `onConnect()`, presence service adds a null/anonymous entry.
**Why it happens:** `SessionConnectedEvent` wraps the CONNECTED response frame, not the CONNECT frame. If the `ChannelInterceptor` runs after `SessionConnectedEvent` is fired (ordering issue), the principal is not yet set.
**How to avoid:** Ensure `WebSocketAuthInterceptorConfig` has `@Order(Ordered.HIGHEST_PRECEDENCE + 99)`. Always null-check `user` in the event listener and skip processing if null.
**Warning signs:** NPE in presence listener, or presence list shows `null` or empty username entries.

### Pitfall 5: SimpMessagingTemplate Not Available at Startup

**What goes wrong:** `SimpMessagingTemplate` injected into `PresenceEventListener` is null or throws `NoSuchBeanDefinitionException` on startup.
**Why it happens:** `SimpMessagingTemplate` is registered as a bean named `brokerMessagingTemplate` by Spring's WebSocket infrastructure. If `@EnableWebSocketMessageBroker` is not processed before the event listener, the bean doesn't exist.
**How to avoid:** `SimpMessagingTemplate` injection via `@Autowired` or constructor injection works correctly as long as `@EnableWebSocketMessageBroker` is on a `@Configuration` class in the same application context.
**Warning signs:** `NoSuchBeanDefinitionException: No qualifying bean of type SimpMessagingTemplate` at startup.

### Pitfall 6: `@SendToUser` vs `convertAndSendToUser` Destination Format

**What goes wrong:** Developer uses `/user/queue/signal` as the destination in `convertAndSendToUser()`, causing a double-prefix: the user destination prefix is applied again, resulting in undeliverable messages.
**Why it happens:** `convertAndSendToUser(username, "/queue/signal", payload)` automatically prepends the user destination prefix (`/user/{username}/queue/signal`). If you pass `/user/queue/signal`, the result is `/user/{username}/user/queue/signal`.
**How to avoid:** Always pass the RELATIVE destination (starting with `/queue/` not `/user/queue/`) to `convertAndSendToUser()`. The user prefix is added automatically.
**Warning signs:** Client subscribed to `/user/queue/signal` receives no messages; Wireshark/WebSocket inspector shows messages to wrong destination.

### Pitfall 7: `UserDetailsService` Circular Dependency in Interceptor

**What goes wrong:** Spring reports a circular bean dependency involving `JwtChannelInterceptor` → `UserDetailsService` → `JwtChannelInterceptor` (or a similar chain).
**Why it happens:** `CustomUserDetailsService` injects `UserRepository`; `JwtChannelInterceptor` injects both `JwtService` and `UserDetailsService`; `WebSocketAuthInterceptorConfig` injects `JwtChannelInterceptor`. If `SecurityConfig` also creates beans that depend on `JwtChannelInterceptor`, a cycle is possible.
**How to avoid:** Keep `JwtChannelInterceptor` as a `@Component` injected by Spring. Do NOT create it manually in `SecurityConfig`. The Phase 1 `SecurityConfig` does not reference any WebSocket classes — no cycle exists.
**Warning signs:** `BeanCurrentlyInCreationException` at startup mentioning the interceptor.

---

## Code Examples

### Signaling message relay — complete controller

```java
// Source: docs.spring.io/spring-framework/reference/web/websocket/stomp/user-destination.html
@Controller
@RequiredArgsConstructor
@Slf4j
public class SignalController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/signal")
    public void handleSignal(@Payload SignalMessage message, Principal principal) {
        if (principal == null) {
            log.warn("Signal received without authenticated principal — dropping");
            return;
        }
        // Override client-supplied 'from' with authenticated username (prevent spoofing)
        message.setFrom(principal.getName());

        log.debug("Signal from {} to {}: type={}", message.getFrom(), message.getTo(), message.getType());

        // Routes to /user/{to}/queue/signal on the broker
        messagingTemplate.convertAndSendToUser(
            message.getTo(),
            "/queue/signal",
            message
        );
    }
}
```

### PresenceService — complete implementation

```java
// Source: java.util.concurrent.ConcurrentHashMap + Spring patterns
@Service
@Slf4j
public class PresenceService {

    private final ConcurrentHashMap<String, String> sessions = new ConcurrentHashMap<>();

    public void addSession(String sessionId, String username) {
        sessions.put(sessionId, username);
        log.debug("Session added: {} -> {}", sessionId, username);
    }

    public void removeSession(String sessionId) {
        String username = sessions.remove(sessionId);
        log.debug("Session removed: {} (was: {})", sessionId, username);
    }

    public boolean isUserOnline(String username) {
        return sessions.containsValue(username);
    }

    public List<String> getOnlineUsers() {
        return sessions.values().stream()
            .distinct()
            .sorted()
            .collect(java.util.stream.Collectors.toList());
    }
}
```

### Integration test — STOMP connection with JWT

```java
// Source: docs.spring.io/spring-framework/reference/web/websocket/stomp/testing.html
// Source: medium.com/@MelvinBlokhuijzen/spring-websocket-endpoints-integration-testing-180357b4f24c
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private JwtService jwtService;

    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        stompClient = new WebSocketStompClient(
            new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
    }

    @Test
    void testConnectWithValidJwt() throws Exception {
        String token = jwtService.generateToken("testuser");
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);

        StompSession session = stompClient.connectAsync(
            "ws://localhost:" + port + "/ws",
            new WebSocketHttpHeaders(),
            connectHeaders,
            new StompSessionHandlerAdapter() {}
        ).get(3, TimeUnit.SECONDS);

        assertThat(session.isConnected()).isTrue();
        session.disconnect();
    }

    @Test
    void testConnectWithInvalidJwt() {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer invalid-token");

        assertThrows(ExecutionException.class, () ->
            stompClient.connectAsync(
                "ws://localhost:" + port + "/ws",
                new WebSocketHttpHeaders(),
                connectHeaders,
                new StompSessionHandlerAdapter() {}
            ).get(3, TimeUnit.SECONDS)
        );
    }
}
```

**Note:** `StandardWebSocketClient` (not `SockJsClient`) is used because the project uses native WebSocket, not SockJS. `stompClient.connectAsync()` accepts `StompHeaders` as the third parameter for STOMP-level headers (separate from the HTTP `WebSocketHttpHeaders`).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@EnableWebSocketSecurity` with `MessageMatcherDelegatingAuthorizationManager` | Custom `ChannelInterceptor` with `@Order(HIGHEST_PRECEDENCE+99)` for JWT | Spring Security 5.8+ introduced `@EnableWebSocketSecurity` | For token-based auth (no HTTP session), the custom interceptor is simpler and avoids the `AuthorizationChannelInterceptor` bean requirement |
| SockJS fallback on WebSocket endpoint | Native WebSocket only (`registry.addEndpoint("/ws")` without `.withSockJS()`) | All modern browsers (2018+) support native WebSocket; SockJS was needed for IE9 | No `.withSockJS()` — project decision per CLAUDE.md |
| `ApplicationListener<SessionDisconnectEvent>` interface | `@EventListener` annotation | Spring 4.2+ | `@EventListener` is more concise; both work in Spring Boot 3.x |
| `@SendToUser("/queue/reply")` on controller method | `SimpMessagingTemplate.convertAndSendToUser()` from service | Both are valid | `@SendToUser` only works as a return value from `@MessageMapping`; `convertAndSendToUser()` can be called from anywhere (PresenceService, SignalController, etc.) — preferred for this phase |

**Deprecated/outdated:**
- `AbstractSecurityWebSocketMessageBrokerConfigurer`: Removed in Spring Security 6.x. Use `@EnableWebSocketSecurity` or custom `ChannelInterceptor` instead. [ASSUMED — verify if project encounters this class reference in tutorials]
- `WebSocketMessageBrokerStats` bean: Still valid, useful for debugging (tracks connected clients count).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5 (Jupiter) + Spring Boot Test (managed by Spring Boot BOM) — same as Phase 1 |
| Config file | `backend/src/test/resources/application-test.yml` — already exists from Phase 1 |
| Quick run command | `./mvnw test -pl backend -Dtest=WebSocketIntegrationTest -q` |
| Full suite command | `./mvnw test -pl backend` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRES-01 | STOMP CONNECT with valid JWT → accepted; session appears in presence | Integration | `./mvnw test -Dtest=WebSocketIntegrationTest#testConnectWithValidJwt` | Wave 0 |
| PRES-01 | STOMP CONNECT with invalid JWT → rejected (connection refused) | Integration | `./mvnw test -Dtest=WebSocketIntegrationTest#testConnectWithInvalidJwt` | Wave 0 |
| PRES-01 | After connect, `/topic/presence` broadcast received by other connected client | Integration | `./mvnw test -Dtest=PresenceBroadcastTest#testPresenceBroadcastOnConnect` | Wave 0 |
| PRES-02 | After disconnect, `/topic/presence` broadcast received within 3s | Integration | `./mvnw test -Dtest=PresenceBroadcastTest#testPresenceBroadcastOnDisconnect` | Wave 0 |
| CALL-05 | Signal message sent to `/app/signal` → received at `/user/queue/signal` by recipient | Integration | `./mvnw test -Dtest=SignalRelayTest#testSignalMessageDelivered` | Wave 0 |
| CALL-05 | Signal `from` field overwritten with sender's JWT principal (spoof prevention) | Integration | `./mvnw test -Dtest=SignalRelayTest#testSignalFromOverwritten` | Wave 0 |
| CALL-06 | N/A — STUN config is frontend-only; no backend test needed | Manual | `—` | N/A |

### Sampling Rate

- **Per task commit:** `./mvnw test -pl backend -q`
- **Per wave merge:** `./mvnw test -pl backend`
- **Phase gate:** Full suite green (includes Phase 1 11 tests + Phase 2 6+ tests)

### Wave 0 Gaps

- [ ] `backend/src/test/java/com/vdt/websocket/WebSocketIntegrationTest.java` — covers PRES-01 auth
- [ ] `backend/src/test/java/com/vdt/websocket/PresenceBroadcastTest.java` — covers PRES-01, PRES-02
- [ ] `backend/src/test/java/com/vdt/websocket/SignalRelayTest.java` — covers CALL-05

**H2 compatibility note:** The WebSocket tests use `@SpringBootTest(RANDOM_PORT)` and `StandardWebSocketClient`. They use the existing H2 test profile (`application-test.yml`). WebSocket connections to an H2-backed Spring Boot app work identically to PostgreSQL — the message broker is fully in-memory. **No H2 migration changes needed for WebSocket tests.**

**STOMP test client dependency:** `WebSocketStompClient` and `StandardWebSocketClient` are part of `spring-websocket` (transitive dependency of `spring-boot-starter-websocket`) and are on the test classpath automatically once the starter is added.

---

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | YES | JWT validation in `ChannelInterceptor`; invalid JWT rejects STOMP CONNECT |
| V3 Session Management | YES | STOMP sessions tracked by `PresenceService`; no server-side HTTP session |
| V4 Access Control | YES | Unauthenticated STOMP frames rejected at interceptor level; `principal.getName()` overrides client-supplied sender |
| V5 Input Validation | YES | `SignalMessage.to` field should be validated (non-null, user exists); `type` field should be an enum |
| V6 Cryptography | Inherited from Phase 1 | JWT HS256 validation unchanged |

### Known Threat Patterns for STOMP + JWT

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated STOMP CONNECT | Spoofing | `JwtChannelInterceptor` rejects CONNECT without valid JWT; connection dropped |
| Sender identity spoofing (fake `from` field) | Spoofing | Server overwrites `from` with `principal.getName()` from JWT; client-supplied value ignored |
| Signal relay to non-existent user | Denial of Service | `convertAndSendToUser()` to an offline user is silently dropped by simple broker — no exception |
| Presence flood (rapid connect/disconnect) | Denial of Service | Simple broker with in-memory state; no per-connection rate limiting in MVP — acceptable for LAN demo |
| Cross-user message interception | Information Disclosure | `/user/queue/signal` routing via `UserDestinationMessageHandler` uses session-unique suffixes; subscribers only receive messages for their own sessions |
| HTTP WebSocket upgrade CSRF | Tampering | CSRF disabled (stateless JWT); the WebSocket upgrade endpoint is permitted without a CSRF token; STOMP CONNECT carries the JWT instead |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java (JDK) | Spring Boot compilation | YES | 25.0.1 | — |
| Maven Wrapper (`./mvnw`) | Build tool | YES | from Phase 1 | — |
| Docker (for PostgreSQL) | Integration tests with real DB | YES | 29.4.0 | H2 in-memory (already configured) |
| `spring-boot-starter-websocket` | STOMP broker | Not yet in pom.xml | — | n/a — must add |

**Missing dependencies:** Only `spring-boot-starter-websocket` needs to be added to pom.xml. Everything else (JwtService, UserRepository, application-test.yml) is inherited from Phase 1.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@Order(Ordered.HIGHEST_PRECEDENCE + 99)` on the auth interceptor config is sufficient to ensure JWT validation runs before Spring Security's channel interceptors | Pattern 2 / Pitfall 1 | If Spring Security registers its interceptor at a higher precedence (lower order value), CONNECT frames might be intercepted before the JWT principal is set. Mitigation: verify that removing `@EnableWebSocketSecurity` (which we don't use) and using the custom interceptor pattern avoids the conflict entirely. |
| A2 | `SessionConnectedEvent.getMessage()` → `StompHeaderAccessor.wrap().getUser()` returns a non-null principal when the `ChannelInterceptor` successfully called `accessor.setUser()` | Pattern 5 | If Spring does not propagate the user from CONNECT to SessionConnectedEvent, presence tracking fails. Workaround: fall back to a `ConcurrentHashMap<String, String>` keyed on sessionId populated directly in the interceptor's preSend. |
| A3 | No `@EnableWebSocketSecurity` annotation is needed; the custom ChannelInterceptor pattern is sufficient for this project's security model | Architecture | If Spring Security auto-detects STOMP and adds `AuthorizationChannelInterceptor` even without `@EnableWebSocketSecurity`, all messages are denied by default. Mitigation: test with a valid JWT and check for `403` on message send — if seen, must add a permissive `AuthorizationManager<Message<?>>` bean. |
| A4 | `StandardWebSocketClient` (not `SockJsClient`) can be used for integration tests because the endpoint does not use `.withSockJS()` | Validation Architecture | No fallback needed — both clients work; `SockJsClient` wraps `StandardWebSocketClient` anyway. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Should PresenceService also broadcast on explicit REST logout (`POST /api/auth/logout`)?**
   - What we know: Phase 1 logout sets `status=OFFLINE` in DB but fires no WebSocket event (D-05 decision). When the user also has a live STOMP session, `SessionDisconnectEvent` will fire when their WebSocket connection closes. If they log out via REST while keeping the WebSocket open, the presence update is delayed until the WebSocket disconnects.
   - What's unclear: Whether we should call `SimpMessagingTemplate.convertAndSend("/topic/presence", ...)` from `AuthService.logout()`.
   - Recommendation: For MVP, accept the delay — the STOMP disconnect (which always follows logout on client side) will trigger the broadcast. No change to `AuthService` needed. If needed in Phase 4, we can inject `SimpMessagingTemplate` into `AuthService`.

2. **Should `SignalMessage.to` be validated against online users?**
   - What we know: `convertAndSendToUser()` to an offline user is silently dropped by the simple broker.
   - What's unclear: Whether sending a signal to an offline user should return an error to the sender.
   - Recommendation: Accept silent drop for MVP — Phase 4 will add call state management (ringing/timeout) that handles this case at the application level.

---

## Sources

### Primary (HIGH confidence)
- [Spring Framework WebSocket STOMP Overview](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/overview.html) — STOMP protocol, broker architecture
- [Spring Framework STOMP Enable](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/enable.html) — `@EnableWebSocketMessageBroker`, `WebSocketMessageBrokerConfigurer`, `configureMessageBroker`, `registerStompEndpoints`
- [Spring Framework STOMP Token Authentication](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html) — `ChannelInterceptor`, `StompHeaderAccessor`, `accessor.setUser()`, `@Order(HIGHEST_PRECEDENCE+99)` pattern
- [Spring Framework STOMP User Destinations](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/user-destination.html) — `convertAndSendToUser()`, `/user/queue/` routing, `SimpMessagingTemplate`
- [Spring Framework STOMP Application Context Events](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/application-context-events.html) — `SessionConnectedEvent`, `SessionDisconnectEvent`, `@EventListener` pattern
- [Spring Framework STOMP Annotated Controllers](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/handle-annotations.html) — `@MessageMapping`, `Principal` parameter, `@Payload`
- [Spring Framework STOMP Message Flow](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/message-flow.html) — `clientInboundChannel`, `brokerChannel`, `clientOutboundChannel`
- [Spring Security WebSocket Integration](https://docs.spring.io/spring-security/reference/servlet/integrations/websocket.html) — CSRF for WebSocket, HTTP security changes, `SecurityContextChannelInterceptor`
- [Spring Boot WebSockets](https://docs.spring.io/spring-boot/reference/messaging/websockets.html) — `spring-boot-starter-websocket` BOM management
- [SessionDisconnectEvent Javadoc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/socket/messaging/SessionDisconnectEvent.html) — `@Nullable Principal user`, idempotency requirement
- [Spring Framework STOMP Testing](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/testing.html) — `WebSocketStompClient`, `StompSession`, `StompHeaders` for auth

### Secondary (MEDIUM confidence)
- [Spring Boot 3 JWT WebSocket Authentication (POOJITHA IROSHA, Medium)](https://medium.com/@poojithairosha/spring-boot-3-authenticate-websocket-connections-with-jwt-tokens-2b4ff60532b6) — Practical `@Order(HIGHEST_PRECEDENCE+99)` pattern, verified against official docs
- [Overcome WebSocket Authentication Issues (Softbinator Technologies)](https://blog.softbinator.com/overcome-websocket-authentication-issues-stomp/) — `accessor.setUser()` pattern for JWT, confirmed by official docs
- [Spring WebSocket Testing (Melvin Blokhuijzen, Medium)](https://medium.com/@MelvinBlokhuijzen/spring-websocket-endpoints-integration-testing-180357b4f24c) — Integration test pattern with `StompClient`

### Tertiary (LOW confidence / not used)
- Phase 1 `SecurityConfig.java` (actual code) — [VERIFIED from codebase]: confirms `/ws/**` is already permitted

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — `spring-boot-starter-websocket` is official Spring Boot artifact, confirmed via docs.spring.io
- Architecture: HIGH — `ChannelInterceptor` + `@Order` pattern verified against official Spring token auth docs
- Presence service patterns: HIGH — `@EventListener(SessionConnectedEvent)` verified against official docs; `ConcurrentHashMap` pattern is standard Java concurrent practice
- Test patterns: MEDIUM — `WebSocketStompClient` test pattern verified against official testing docs; JWT header injection in test is based on secondary sources

**Research date:** 2026-05-25
**Valid until:** 2026-08-25 (Spring Boot 3.3.x is EOL but stable; STOMP API is stable and unlikely to change)
