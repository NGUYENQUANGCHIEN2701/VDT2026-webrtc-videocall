package com.vdt.websocket;

import com.vdt.websocket.dto.PresenceDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

/**
 * Handles client-initiated presence sync requests.
 * Called by new subscribers immediately after they subscribe to /topic/presence
 * to avoid the race condition where the initial SessionConnectedEvent broadcast
 * is sent before the client's SUBSCRIBE frame is processed.
 */
@Controller
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/presence/sync")
    public void sync() {
        List<String> users = presenceService.getOnlineUsers();
        messagingTemplate.convertAndSend("/topic/presence", new PresenceDTO(users));
    }
}
