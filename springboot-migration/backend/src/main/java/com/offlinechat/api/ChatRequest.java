package com.offlinechat.api;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record ChatRequest(@NotBlank String model, String chatId, List<Message> messages) {
}
