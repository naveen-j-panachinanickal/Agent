package com.offlinechat.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ChatService {
    private static final String CHAT_STORE_FILE = "chats-migrated.json";
    private final ObjectMapper objectMapper;
    private ChatStore chatStore;
    private final DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public ChatService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.chatStore = loadChatStore();
    }

    private synchronized ChatStore loadChatStore() {
        File migratedFile = new File(CHAT_STORE_FILE);
        if (migratedFile.exists()) {
            try {
                return objectMapper.readValue(migratedFile, ChatStore.class);
            } catch (IOException e) {
                System.err.println("Could not load migrated chat store: " + e.getMessage());
            }
        }
        
        // Try to import from relative parent (Streamlit version)
        File legacyFile = new File("../chats.json");
        if (legacyFile.exists()) {
            try {
                ChatStore imported = objectMapper.readValue(legacyFile, ChatStore.class);
                saveChatStore(imported);
                return imported;
            } catch (IOException e) {
                System.err.println("Could not import legacy chat store: " + e.getMessage());
            }
        }
        
        // Final fallback: Initial store
        Chat firstChat = createNewChat("First chat");
        ChatStore store = new ChatStore(firstChat.id(), List.of(firstChat));
        saveChatStore(store);
        return store;
    }

    private synchronized void saveChatStore(ChatStore store) {
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(CHAT_STORE_FILE), store);
            this.chatStore = store;
        } catch (IOException e) {
            System.err.println("Could not save chat store: " + e.getMessage());
        }
    }

    public synchronized List<Chat> getAllChats() {
        return chatStore.chats();
    }

    public synchronized Optional<Chat> getChat(String id) {
        return chatStore.chats().stream().filter(c -> c.id().equals(id)).findFirst();
    }

    public synchronized String getActiveChatId() {
        return chatStore.active_chat_id();
    }

    public synchronized void setActiveChatId(String id) {
        saveChatStore(new ChatStore(id, chatStore.chats()));
    }

    public synchronized Chat createChat(String title) {
        Chat newChat = createNewChat(title);
        List<Chat> chats = new ArrayList<>(chatStore.chats());
        chats.add(0, newChat);
        saveChatStore(new ChatStore(newChat.id(), chats));
        return newChat;
    }

    public synchronized void deleteChat(String id) {
        List<Chat> chats = new ArrayList<>(chatStore.chats());
        chats.removeIf(c -> c.id().equals(id));
        
        String newActiveId = chatStore.active_chat_id();
        if (id.equals(newActiveId)) {
            if (chats.isEmpty()) {
                Chat replacement = createNewChat("New chat");
                chats.add(replacement);
                newActiveId = replacement.id();
            } else {
                newActiveId = chats.get(0).id();
            }
        }
        
        saveChatStore(new ChatStore(newActiveId, chats));
    }

    public synchronized void updateChat(Chat chat) {
        // Auto-titling if it's currently a "New chat"
        Chat updatedChat = chat;
        if ("New chat".equals(chat.title()) && !chat.messages().isEmpty()) {
            String firstMsg = chat.messages().get(0).content();
            String autoTitle = firstMsg.substring(0, Math.min(firstMsg.length(), 40)).trim();
            if (autoTitle.isEmpty()) autoTitle = "New chat";
            updatedChat = chat.withTitle(autoTitle, java.time.LocalDateTime.now().toString());
        }

        List<Chat> chats = new ArrayList<>(chatStore.chats());
        for (int i = 0; i < chats.size(); i++) {
            if (chats.get(i).id().equals(updatedChat.id())) {
                chats.set(i, updatedChat);
                break;
            }
        }
        saveChatStore(new ChatStore(chatStore.active_chat_id(), chats));
    }

    private Chat createNewChat(String title) {
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        return new Chat(
            UUID.randomUUID().toString(),
            title == null || title.isBlank() ? "New chat" : title,
            now,
            now,
            new ArrayList<>()
        );
    }
}
