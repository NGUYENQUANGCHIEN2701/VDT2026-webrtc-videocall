# Technology Stack

**Project:** VDT-WebRTC — WebRTC Video Call App (Spring Boot + React)
**Researched:** 2026-05-24
**Confidence:** HIGH (all recommendations sourced from official Spring, MDN, and framework documentation)

---

## Recommended Stack

### Backend — Spring Boot (Java)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Spring Boot | 3.3.x (LTS) | Application framework | Stable LTS line; lower risk than 4.0.x for a deadline project |
| Spring Web MVC | (managed by Boot) | REST API endpoints | Included in spring-boot-starter-web |
| Spring WebSocket + STOMP | (managed by Boot) | Signaling layer | spring-boot-starter-websocket; STOMP user-destinations handle per-user routing |
| Spring Security | (managed by Boot) | Auth filter chain | Secures REST endpoints and WebSocket connections |
| Spring Data JPA + Hibernate | (managed by Boot) | ORM / database access | HikariCP connection pool included by default |
| PostgreSQL JDBC Driver | 42.7.x (managed by Boot) | PostgreSQL connectivity | Managed by Spring Boot BOM |
| JJWT (io.jsonwebtoken) | 0.12.6 | JWT create/parse/validate | NOT managed by Spring Boot BOM — declare version explicitly |
| Lombok | (managed by Boot) | Boilerplate reduction | @Data, @Builder, @RequiredArgsConstructor |
| Flyway | (managed by Boot) | Database migrations | Versioned SQL = required deliverable database script |

**Key backend dependencies (pom.xml):**
```xml
<!-- Web + REST -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- WebSocket + STOMP signaling -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>

<!-- Security + JWT filter -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JPA + Hibernate + HikariCP -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- PostgreSQL driver -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- JWT — version NOT managed by Boot BOM, declare explicitly -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>

<!-- Flyway migrations -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>

<!-- Lombok -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

---

### Frontend — React

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x | UI framework | Hooks map perfectly to WebRTC lifecycle management |
| Vite | 5.x | Build tool / dev server | CRA is officially deprecated; Vite is the current standard |
| @stomp/stompjs | 7.x | STOMP WebSocket client | Connects directly over native WebSocket — no SockJS needed |
| Axios | 1.x | HTTP REST client | Interceptors for attaching JWT Authorization header |
| React Context API | (built-in) | Call/auth state management | useContext + useReducer covers all state needs; Redux unnecessary |

**Frontend dependencies (package.json):**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@stomp/stompjs": "^7.0.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

---

### Database — PostgreSQL

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 16 | Users, sessions; relational model fits auth data |
| HikariCP | (managed by Boot) | Connection pooling — Spring Boot default |
| Flyway | (managed by Boot) | Schema migrations — produces the deliverable database script |

**application.yml:**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/vdt_webrtc
    username: ${DB_USER:vdt}
    password: ${DB_PASS:vdt}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
    show-sql: false
  flyway:
    enabled: true
    locations: classpath:db/migration
```

---

## WebSocket Signaling — STOMP Decision

**Decision: STOMP over WebSocket. No SockJS.**

| Aspect | STOMP over WebSocket | Raw WebSocket |
|--------|---------------------|---------------|
| User-targeted messages | Built-in: `convertAndSendToUser()` | Must build session registry manually |
| Spring controller routing | `@MessageMapping`, `@SubscribeMapping` | Manual frame parsing |
| JWT auth integration | `ChannelInterceptor` on CONNECT frame | Must parse every raw message |
| SockJS needed? | No — native WebSocket is universal | N/A |

**Spring WebSocketConfig:**
```java
@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // NO .withSockJS() — not needed on LAN/localhost
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.setApplicationDestinationPrefixes("/app");
        config.enableSimpleBroker("/topic", "/queue");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new JwtChannelInterceptor());
    }
}
```

**React STOMP client:**
```javascript
import { Client } from '@stomp/stompjs';

const client = new Client({
    brokerURL: 'ws://localhost:8080/ws',  // native WebSocket, no SockJS
    connectHeaders: { Authorization: `Bearer ${token}` },
    onConnect: () => { /* subscribe to /user/queue/signal */ }
});
client.activate();
```

---

## Authentication — JWT Pattern

1. `POST /api/auth/login` → returns signed JWT (HS256, 24h expiry)
2. React stores JWT in memory or sessionStorage
3. Axios interceptor adds `Authorization: Bearer <token>` to all REST calls
4. Spring `OncePerRequestFilter` validates JWT on every REST request
5. WebSocket CONNECT: token in STOMP header `Authorization: Bearer <token>`
6. `ChannelInterceptor.preSend()` validates JWT on CONNECT, calls `accessor.setUser(user)`

**JJWT 0.12.x API (breaking change from 0.11.x):**
```java
// Generate
String token = Jwts.builder()
    .subject(username)
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + 86_400_000L))
    .signWith(secretKey)           // SecretKey from Keys.hmacShaKeyFor(bytes)
    .compact();

// Validate — use verifyWith(), NOT deprecated setSigningKey()
Claims claims = Jwts.parser()
    .verifyWith(secretKey)
    .build()
    .parseSignedClaims(token)
    .getPayload();
```

---

## ICE / STUN Configuration

```javascript
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }  // backup
    ]
};
const pc = new RTCPeerConnection(ICE_SERVERS);
```

Google public STUN is free and sufficient. On LAN, host candidates succeed without STUN. TURN is out of scope.

---

## Screen Sharing (Browser Native)

```javascript
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
const videoTrack = screenStream.getVideoTracks()[0];
const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
await sender.replaceTrack(videoTrack);  // no renegotiation needed
videoTrack.addEventListener('ended', () => sender.replaceTrack(cameraTrack));
```

---

## Recording (Browser Native MediaRecorder)

```javascript
const chunks = [];
const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus' : 'video/webm';
const recorder = new MediaRecorder(localStream, { mimeType });

recorder.ondataavailable = e => chunks.push(e.data);
recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `call-${Date.now()}.webm`
    });
    a.click();
};
recorder.start(1000);  // 1s timeslice prevents large memory accumulation
```

---

## Group Call — Mesh (No Additional Library)

```javascript
const peerConnections = new Map();  // peerId -> RTCPeerConnection

async function createPeerConnection(peerId, isInitiator) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.set(peerId, pc);
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    pc.ontrack = e => renderRemoteStream(peerId, e.streams[0]);
    pc.onicecandidate = e => e.candidate && sendSignal(peerId, { type: 'ice', candidate: e.candidate });
    if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(peerId, { type: 'offer', sdp: offer });
    }
    return pc;
}
```

---

## Infrastructure — Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vdt_webrtc
      POSTGRES_USER: vdt
      POSTGRES_PASSWORD: vdt
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/vdt_webrtc
      SPRING_DATASOURCE_USERNAME: vdt
      SPRING_DATASOURCE_PASSWORD: vdt
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## CORS Configuration

**REST API:**
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:3000", "http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

**Spring Security:**
```java
http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
    .csrf(csrf -> csrf.disable());  // JWT is stateless; CSRF not applicable
```

---

## Alternatives Considered

| Category | Recommended | Why Not Alternative |
|----------|-------------|-------------------|
| WebSocket protocol | STOMP | Raw WS requires DIY session registry and routing |
| SockJS | Not used | Legacy; all 2025 browsers support native WebSocket |
| JWT library | JJWT 0.12.x | OAuth2 resource server expects external IdP — overkill |
| State management | Context + useReducer | Redux/Zustand unnecessary for this scope |
| Build tool | Vite 5.x | CRA is officially deprecated by React team |
| Recording | MediaRecorder (native) | RecordRTC adds bundle weight unnecessarily |
| Schema management | Flyway | `ddl-auto=update` produces no migration files for deliverable |

---

## Sources

- Spring STOMP documentation (HIGH): Spring Framework Reference
- Spring token-based WebSocket auth (HIGH): Spring Framework Reference
- Spring Boot dependency BOM (HIGH): Spring Boot Appendix
- MDN WebRTC API (HIGH)
- MDN Screen Capture API (HIGH)
- MDN MediaRecorder API (HIGH)
- JJWT 0.12.x: verify latest at https://github.com/jwtk/jjwt/releases
- @stomp/stompjs: verify latest at https://www.npmjs.com/package/@stomp/stompjs
