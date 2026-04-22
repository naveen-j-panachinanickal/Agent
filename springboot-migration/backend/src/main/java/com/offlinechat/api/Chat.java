package com.offlinechat.api;

import java.util.List;

public record Chat(
    String id,
    String title,
    String created_at,
    String updated_at,
    List<Message> messages
) {
    public Chat withUpdatedTimestamp(String now) {
        return new Chat(id, title, created_at, now, messages);
    }
    
    public Chat withTitle(String newTitle, String now) {
        return new Chat(id, newTitle, created_at, now, messages);
    }

    public Chat withMessages(List<Message> newMessages, String now) {
        return new Chat(id, title, created_at, now, newMessages);
    }
}
