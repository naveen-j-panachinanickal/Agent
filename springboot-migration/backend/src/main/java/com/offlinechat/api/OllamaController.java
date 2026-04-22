package com.offlinechat.api;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@RestController
@RequestMapping("/api/ollama")
public class OllamaController {
    private final OllamaClient ollamaClient;
    private final ChatService chatService;
    private final SystemStatsService statsService;

    public OllamaController(OllamaClient ollamaClient, ChatService chatService, SystemStatsService statsService) {
        this.ollamaClient = ollamaClient;
        this.chatService = chatService;
        this.statsService = statsService;
    }

    @GetMapping("/health")
    public Mono<Map<String, Object>> health() {
        return ollamaClient.listModels()
                .map(response -> Map.of("status", "running", "stats", statsService.getStats()))
                .onErrorReturn(Map.of("status", "offline"));
    }

    @GetMapping("/stats")
    public SystemStatsService.SystemStats getStats() {
        return statsService.getStats();
    }

    @GetMapping("/models")
    public Mono<JsonNode> models() {
        return ollamaClient.listModels();
    }

    @PostMapping("/models/pull")
    public Mono<JsonNode> pull(@Valid @RequestBody ModelRequest request) {
        return ollamaClient.pullModel(request.model());
    }

    @DeleteMapping("/models")
    public Mono<Void> delete(@RequestParam String model) {
        return ollamaClient.deleteModel(model);
    }

    @PostMapping("/start")
    public void start() {
        ollamaClient.startServer();
    }

    @PostMapping("/unload")
    public void unload(@RequestParam String model) {
        ollamaClient.unloadModel(model);
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chat(@Valid @RequestBody ChatRequest request) {
        AtomicReference<String> fullResponse = new AtomicReference<>("");
        
        return ollamaClient.chat(request)
                .doOnNext(content -> fullResponse.updateAndGet(current -> current + content))
                .doOnComplete(() -> {
                    if (request.chatId() != null) {
                        chatService.getChat(request.chatId()).ifPresent(chat -> {
                            List<Message> messages = new ArrayList<>(request.messages());
                            messages.add(new Message("assistant", fullResponse.get()));
                            chatService.updateChat(chat.withMessages(messages, LocalDateTime.now().toString()));
                        });
                    }
                });
    }
}
