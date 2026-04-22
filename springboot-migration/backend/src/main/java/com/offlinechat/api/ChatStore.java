package com.offlinechat.api;

import java.util.List;

public record ChatStore(String active_chat_id, List<Chat> chats) {
}
