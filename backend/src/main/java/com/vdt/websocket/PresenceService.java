package com.vdt.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory registry of active STOMP sessions.
 * Maps sessionId → username so that multiple concurrent sessions
 * for the same user (multiple browser tabs) are tracked independently.
 *
 * ConcurrentHashMap guarantees thread-safe reads/writes without
 * external synchronization, which is sufficient for the LAN MVP scope.
 */
@Service
@Slf4j
public class PresenceService {

    private final ConcurrentHashMap<String, String> sessions = new ConcurrentHashMap<>();

    /**
     * Register a new STOMP session for the given username.
     * Called on SessionConnectedEvent.
     */
    public void addSession(String sessionId, String username) {
        sessions.put(sessionId, username);
        log.debug("Session added: sessionId={}, username={}, totalSessions={}", sessionId, username, sessions.size());
    }

    /**
     * Remove a STOMP session. Idempotent — calling with an already-removed
     * sessionId is a no-op (ConcurrentHashMap.remove returns null when absent).
     * Called on SessionDisconnectEvent.
     */
    public void removeSession(String sessionId) {
        String removed = sessions.remove(sessionId);
        log.debug("Session removed: sessionId={}, wasTracked={}, totalSessions={}", sessionId, removed != null, sessions.size());
    }

    /**
     * Returns true if the given username has at least one tracked session.
     * Used to guard OFFLINE DB writes when a user disconnects but still
     * has other sessions open (multiple tabs scenario / Pitfall 3).
     */
    public boolean isUserOnline(String username) {
        return sessions.containsValue(username);
    }

    /**
     * Returns a deterministically ordered, distinct list of all online usernames.
     * Sorted alphabetically so test assertions on the list are stable.
     */
    public List<String> getOnlineUsers() {
        List<String> users = sessions.values().stream()
                .distinct()
                .sorted()
                .collect(java.util.stream.Collectors.toList());
        log.debug("Online users: {}", users);
        return users;
    }
}
