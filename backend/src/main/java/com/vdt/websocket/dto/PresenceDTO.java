package com.vdt.websocket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Broadcast payload sent to /topic/presence on every STOMP connect/disconnect.
 * Serialized by Jackson as {"onlineUsers":["alice","bob"]}.
 *
 * Uses @Data/@NoArgsConstructor/@AllArgsConstructor (not Java record) for
 * Jackson round-trip compatibility with the React frontend — matches the
 * project's DTO style established in Phase 1 (commit d79cb49).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PresenceDTO {

    private List<String> onlineUsers;
}
