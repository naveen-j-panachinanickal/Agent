package com.offlinechat.api;

import java.util.List;

public record Message(String role, String content, List<String> images) {
    public Message(String role, String content) {
        this(role, content, null);
    }
}
