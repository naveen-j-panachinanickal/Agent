package com.offlinechat.api;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "offlinechat")
public record OllamaProperties(String ollamaBaseUrl) {
}
