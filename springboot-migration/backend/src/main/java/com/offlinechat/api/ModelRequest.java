package com.offlinechat.api;

import jakarta.validation.constraints.NotBlank;

public record ModelRequest(@NotBlank String model) {
}
