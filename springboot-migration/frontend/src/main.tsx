import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Chat, ChatMessage, OllamaModel } from "./types";
import { Sidebar } from "./components/Sidebar";
import { ChatPane } from "./components/ChatPane";

const API_BASE = "http://localhost:8080/api";
const DEFAULT_MODEL = "gemma4:e2b";

function parseOllamaChunk(chunk: string) {
  const data = chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("");

  return data || chunk.trim();
}

function App() {
  // State from original - Models & Theme
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [model, setModel] = useState(localStorage.getItem("offlinechat.model") || DEFAULT_MODEL);
  const [customModel, setCustomModel] = useState("");
  const [status, setStatus] = useState("checking");
  const [pullName, setPullName] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("offlinechat.theme") || "light");

  // New State - Multi-Chat
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId) || null, [chats, activeChatId]);

  // Syncing basic settings
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("offlinechat.theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("offlinechat.model", model);
  }, [model]);

  // Initial Load
  useEffect(() => {
    // Initial data load
    loadChatStore();
    refreshModels();
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch(`${API_BASE}/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.theme) setTheme(data.theme);
        if (data.model) setModel(data.model);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }

  async function updateSetting(key: string, value: string) {
    try {
      await fetch(`${API_BASE}/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      });
    } catch (e) {
      console.error("Failed to update setting", e);
    }
  }

  function handleSetTheme(t: string) {
    setTheme(t);
    updateSetting("theme", t);
  }

  function handleSetModel(m: string) {
    setModel(m);
    updateSetting("model", m);
  }

  async function loadChatStore() {
    try {
      const response = await fetch(`${API_BASE}/chat-sessions`);
      if (!response.ok) throw new Error("Failed to load chats");
      const data = await response.json();
      setChats(data.chats || []);
      setActiveChatId(data.active_chat_id || "");
    } catch (error) {
      console.error("Failed to load chats", error);
    }
  }

  async function refreshModels() {
    try {
      const response = await fetch(`${API_BASE}/ollama/models`);
      if (!response.ok) throw new Error("Offline");
      const data = await response.json();
      setModels(data.models || []);
      setStatus("running");
    } catch {
      setStatus("offline");
    }
  }

  async function pullModel(event: FormEvent) {
    event.preventDefault();
    const name = pullName.trim();
    if (!name) return;

    try {
      await fetch(`${API_BASE}/ollama/models/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: name }),
      });
      setModel(name);
      setPullName("");
      refreshModels();
    } catch (e) {
      console.error("Pull failed", e);
    }
  }

  async function deleteModel(name: string) {
    try {
      await fetch(`${API_BASE}/ollama/models?model=${encodeURIComponent(name)}`, { method: "DELETE" });
      if (model === name) setModel(DEFAULT_MODEL);
      refreshModels();
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  // Multi-chat operations
  async function createNewChat() {
    try {
      const response = await fetch(`${API_BASE}/chat-sessions`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to create chat");
      const newChat = await response.json();
      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);
    } catch (e) {
      console.error("Create chat failed", e);
    }
  }

  async function deleteChat(id: string) {
    try {
      await fetch(`${API_BASE}/chat-sessions/${id}`, { method: "DELETE" });
      loadChatStore();
    } catch (e) {
      console.error("Delete chat failed", e);
    }
  }

  async function clearChat() {
    if (!activeChatId) return;
    try {
        await fetch(`${API_BASE}/chat-sessions/${activeChatId}/clear`, { method: "POST" });
        loadChatStore();
    } catch (e) {
        console.error("Clear chat failed", e);
    }
  }

  async function selectChat(id: string) {
    try {
      setActiveChatId(id);
      await fetch(`${API_BASE}/chat-sessions/${id}/active`, { method: "PUT" });
    } catch (e) {
      console.error("Select chat failed", e);
    }
  }

  async function sendMessage(event: FormEvent, pendingFiles: FileResult[] = []) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content && pendingFiles.length === 0) return;
    if (isStreaming || !activeChatId) return;

    const currentChat = activeChat!;

    // Build the rendered content for UI (showing filenames)
    let displayContent = content;
    if (pendingFiles.length > 0) {
      const filenames = pendingFiles.map(f => `- \`${f.name}\``).join("\n");
      displayContent = `${content}\n\nAttached files:\n${filenames}`;
    }

    // Build the actual context for the model
    let modelContent = content;
    const textFiles = pendingFiles.filter(f => !f.base64);
    if (textFiles.length > 0) {
        const fileContext = textFiles.map(f => `File: ${f.name}\n\`\`\`text\n${f.content}\n\`\`\``).join("\n\n");
        modelContent = `Use the uploaded file context below when answering.\n\n${fileContext}\n\nUser message:\n${content}`;
    }

    const images = pendingFiles.filter(f => f.base64).map(f => f.base64!);

    const nextMessages: ChatMessage[] = [...currentChat.messages, { 
        role: "user", 
        content: modelContent,
        images: images.length > 0 ? images : undefined
    }];
    
    // For UI display, we use the displayContent but we want the next stream to be linked to this history
    const updatedChat = { ...currentChat, messages: [...nextMessages, { role: "assistant", content: "" }] };
    setChats(chats.map(c => c.id === activeChatId ? updatedChat : c));
    setPrompt("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_BASE}/ollama/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          model, 
          chatId: activeChatId,
          messages: nextMessages 
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        assistantText += parseOllamaChunk(text);
        
        // Update local UI with stream
        setChats(prevChats => prevChats.map(c => 
          c.id === activeChatId 
            ? { ...c, messages: [...nextMessages, { role: "assistant", content: assistantText }] }
            : c
        ));
      }
    } catch (error) {
      const errorMsg = `Could not stream from Ollama. ${error instanceof Error ? error.message : ""}`;
      setChats(prevChats => prevChats.map(c => 
        c.id === activeChatId 
          ? { ...c, messages: [...nextMessages, { role: "assistant", content: errorMsg }] }
          : c
      ));
    } finally {
      setIsStreaming(false);
      loadChatStore();
    }
  }

  async function renameChat(id: string, title: string) {
    try {
      await fetch(`${API_BASE}/chat-sessions/${id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      loadChatStore();
    } catch (e) {
      console.error("Rename chat failed", e);
    }
  }

  async function startOllama() {
    try {
      await fetch(`${API_BASE}/ollama/start`, { method: "POST" });
      setTimeout(refreshModels, 2000);
    } catch (e) {
      console.error("Start Ollama failed", e);
    }
  }

  async function unloadModel() {
    try {
      await fetch(`${API_BASE}/ollama/unload?model=${model}`, { method: "POST" });
      setTimeout(refreshModels, 1000);
    } catch (e) {
      console.error("Unload model failed", e);
    }
  }

  return (
    <main className="app-shell">
      <Sidebar
        theme={theme}
        setTheme={handleSetTheme}
        status={status}
        refreshModels={refreshModels}
        models={models}
        model={model}
        setModel={handleSetModel}
        customModel={customModel}
        setCustomModel={setCustomModel}
        pullName={pullName}
        setPullName={setPullName}
        pullModel={pullModel}
        deleteModel={deleteModel}
        chats={chats}
        activeChatId={activeChatId}
        setActiveChat={selectChat}
        createNewChat={createNewChat}
        deleteChat={deleteChat}
        renameChat={renameChat}
        startOllama={startOllama}
        unloadModel={unloadModel}
      />
      <ChatPane
        activeChat={activeChat}
        model={model}
        theme={theme}
        prompt={prompt}
        setPrompt={setPrompt}
        sendMessage={sendMessage}
        clearChat={clearChat}
        isStreaming={isStreaming}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
