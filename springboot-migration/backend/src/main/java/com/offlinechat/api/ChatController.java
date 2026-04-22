package com.offlinechat.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat-sessions")
public class ChatController {
    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public Map<String, Object> getChatStore() {
        return Map.of(
            "active_chat_id", chatService.getActiveChatId(),
            "chats", chatService.getAllChats()
        );
    }

    @PostMapping
    public Chat createChat(@RequestBody(required = false) Map<String, String> payload) {
        String title = payload != null ? payload.get("title") : null;
        return chatService.createChat(title);
    }

    @GetMapping("/{id}")
    public Chat getChat(@PathVariable String id) {
        return chatService.getChat(id).orElseThrow(() -> new RuntimeException("Chat not found"));
    }

    @PutMapping("/{id}/active")
    public void setActive(@PathVariable String id) {
        chatService.setActiveChatId(id);
    }

    @DeleteMapping("/{id}")
    public void deleteChat(@PathVariable String id) {
        chatService.deleteChat(id);
    }

    @PatchMapping("/{id}/title")
    public void renameChat(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String title = payload.get("title");
        chatService.getChat(id).ifPresent(chat -> {
            chatService.updateChat(chat.withTitle(title, java.time.LocalDateTime.now().toString()));
        });
    }

    @PostMapping("/{id}/clear")
    public void clearChat(@PathVariable String id) {
        chatService.getChat(id).ifPresent(chat -> {
            chatService.updateChat(chat.withMessages(List.of(), java.time.LocalDateTime.now().toString()));
        });
    }
}
