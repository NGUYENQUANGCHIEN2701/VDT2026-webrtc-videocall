# Technology Stack

**Du an:** VDT-WebRTC — WebRTC Video Call App (Spring Boot + React)
**Nghien cuu:** 2026-05-24
**Do tin cay:** HIGH (tat ca khuyen nghi duoc trich tu docs chinh thong cua Spring, MDN, va framework)

---

## Stack de xuat

### Backend — Spring Boot (Java)

| Cong nghe | Phien ban | Muc dich | Ly do |
|------------|---------|---------|-----|
| Spring Boot | 3.3.x (LTS) | Application framework | Dong LTS on dinh; it rui ro hon 4.0.x cho du an co deadline |
| Spring Web MVC | (quan ly boi Boot) | REST API endpoints | Da bao gom trong spring-boot-starter-web |
| Spring WebSocket + STOMP | (quan ly boi Boot) | Tang signaling | spring-boot-starter-websocket; STOMP user-destinations xu ly routing theo nguoi dung |
| Spring Security | (quan ly boi Boot) | Auth filter chain | Bao ve REST endpoints va WebSocket connections |
| Spring Data JPA + Hibernate | (quan ly boi Boot) | ORM / database access | HikariCP connection pool mac dinh |
| PostgreSQL JDBC Driver | 42.7.x (quan ly boi Boot) | PostgreSQL connectivity | Quan ly boi Spring Boot BOM |
| JJWT (io.jsonwebtoken) | 0.12.6 | JWT create/parse/validate | KHONG duoc quan ly boi Spring Boot BOM — can khai bao version ro rang |
| Lombok | (quan ly boi Boot) | Giam boilerplate | @Data, @Builder, @RequiredArgsConstructor |
| Flyway | (quan ly boi Boot) | Database migrations | SQL theo version = deliverable bat buoc |

**Cac dependency chinh (pom.xml):**
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

<!-- JWT — version KHONG duoc Boot BOM quan ly, khai bao ro -->
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

| Cong nghe | Phien ban | Muc dich | Ly do |
|------------|---------|---------|-----|
| React | 18.x | UI framework | Hooks phu hop voi vong doi WebRTC |
| Vite | 5.x | Build tool / dev server | CRA da bi deprecate; Vite la chuan hien tai |
| @stomp/stompjs | 7.x | STOMP WebSocket client | Ket noi truc tiep qua WebSocket native — khong can SockJS |
| Axios | 1.x | HTTP REST client | Interceptor de gan JWT Authorization header |
| React Context API | (built-in) | Quan ly state call/auth | useContext + useReducer du cho scope nay; khong can Redux |

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

| Cong nghe | Phien ban | Muc dich |
|------------|---------|---------|
| PostgreSQL | 16 | Users, sessions; mo hinh quan he phu hop auth data |
| HikariCP | (quan ly boi Boot) | Connection pooling — mac dinh cua Spring Boot |
| Flyway | (quan ly boi Boot) | Schema migrations — tao deliverable database script |

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

## WebSocket Signaling — Quyet dinh STOMP

**Quyet dinh: STOMP tren WebSocket. Khong dung SockJS.**

| Khia canh | STOMP tren WebSocket | Raw WebSocket |
|--------|---------------------|---------------|
| Message theo nguoi dung | Co san: `convertAndSendToUser()` | Phai tu build session registry |
| Routing trong Spring controller | `@MessageMapping`, `@SubscribeMapping` | Tu phan tich frame |
| JWT auth tich hop | `ChannelInterceptor` tren CONNECT frame | Phai parse tung message raw |
| Can SockJS? | Khong — WebSocket native la du | N/A |

**Spring WebSocketConfig:**
```java
@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // KHONG .withSockJS() — khong can tren LAN/localhost
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
    brokerURL: 'ws://localhost:8080/ws',  // WebSocket native, khong SockJS
    connectHeaders: { Authorization: `Bearer ${token}` },
    onConnect: () => { /* subscribe to /user/queue/signal */ }
});
client.activate();
```

---

## Authentication — JWT Pattern

1. `POST /api/auth/login` → tra JWT (HS256, 24h)
2. React luu JWT trong memory hoac sessionStorage
3. Axios interceptor gan `Authorization: Bearer <token>` cho REST calls
4. Spring `OncePerRequestFilter` validate JWT cho moi REST request
5. WebSocket CONNECT: token trong STOMP header `Authorization: Bearer <token>`
6. `ChannelInterceptor.preSend()` validate JWT tren CONNECT, goi `accessor.setUser(user)`

**JJWT 0.12.x API (thay doi so voi 0.11.x):**
```java
// Generate
String token = Jwts.builder()
    .subject(username)
    .issuedAt(new Date())
    .expiration(new Date(System.currentTimeMillis() + 86_400_000L))
    .signWith(secretKey)           // SecretKey tu Keys.hmacShaKeyFor(bytes)
    .compact();

// Validate — dung verifyWith(), KHONG dung setSigningKey()
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

Google public STUN la du. Tren LAN, host candidates da thanh cong. TURN ngoai scope.

---

## Screen Sharing (Browser Native)

```javascript
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
const videoTrack = screenStream.getVideoTracks()[0];
const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
await sender.replaceTrack(videoTrack);  // khong can renegotiation
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
recorder.start(1000);  // 1s timeslice de giam memory
```

---

## Group Call — Mesh (Khong can thu vien them)

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
    .csrf(csrf -> csrf.disable());  // JWT la stateless; CSRF khong ap dung
```

---

## Alternatives Considered

| Danh muc | De xuat | Vi sao khong chon phuong an khac |
|----------|-------------|-------------------|
| WebSocket protocol | STOMP | Raw WS can tu build session registry va routing |
| SockJS | Khong dung | Legacy; tat ca 2025 browsers ho tro WebSocket native |
| JWT library | JJWT 0.12.x | OAuth2 resource server can IdP ben ngoai — overkill |
| State management | Context + useReducer | Redux/Zustand khong can cho scope nay |
| Build tool | Vite 5.x | CRA da bi deprecate boi React team |
| Recording | MediaRecorder (native) | RecordRTC tang bundle weight khong can thiet |
| Schema management | Flyway | `ddl-auto=update` khong tao migration files cho deliverable |

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
