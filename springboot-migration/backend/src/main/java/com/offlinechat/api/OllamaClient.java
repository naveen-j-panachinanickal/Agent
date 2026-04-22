package com.offlinechat.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@Service
public class OllamaClient {
    private final WebClient webClient;

    public OllamaClient(OllamaProperties properties) {
        this.webClient = WebClient.builder()
                .baseUrl(properties.ollamaBaseUrl())
                .build();
    }

    public Mono<JsonNode> listModels() {
        return webClient.get()
                .uri("/api/tags")
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    public Mono<JsonNode> pullModel(String model) {
        return webClient.post()
                .uri("/api/pull")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("model", model, "stream", false))
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    public Mono<Void> deleteModel(String model) {
        return webClient.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/api/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("model", model))
                .retrieve()
                .bodyToMono(Void.class);
    }

    public Flux<String> chat(ChatRequest request) {
        return webClient.post()
                .uri("/api/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "model", request.model(),
                        "messages", request.messages(),
                        "stream", true
                ))
                .retrieve()
                .bodyToFlux(JsonNode.class)
                .map(node -> node.path("message").path("content").asText(""))
                .filter(content -> !content.isBlank());
    }

    public void unloadModel(String model) {
        webClient.post()
                .uri("/api/generate")
                .bodyValue(Map.of("model", model, "keep_alive", 0))
                .retrieve()
                .bodyToMono(Void.class)
                .subscribe();
    }

    public void startServer() {
        try {
            // Check common locations for the Ollama binary on macOS
            String ollamaPath = "/opt/homebrew/bin/ollama";
            if (!new java.io.File(ollamaPath).exists()) {
                ollamaPath = "/usr/local/bin/ollama";
            }
            if (!new java.io.File(ollamaPath).exists()) {
                ollamaPath = "ollama"; // Fallback to PATH
            }

            new ProcessBuilder(ollamaPath, "serve")
                .inheritIO()
                .start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
