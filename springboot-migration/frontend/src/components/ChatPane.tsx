import React, { FormEvent, useRef, useState } from "react";
import { Send, Paperclip, X, FileText, Image as ImageIcon, RefreshCcw } from "lucide-react";
import { Chat, ChatMessage, FileResult } from "../types";
import { MessageItem } from "./MessageItem";

const API_BASE = "http://localhost:8080/api";

type ChatPaneProps = {
  activeChat: Chat | null;
  model: string;
  theme: string;
  prompt: string;
  setPrompt: (val: string) => void;
  sendMessage: (e: FormEvent, files: FileResult[]) => void;
  clearChat: () => void;
  isStreaming: boolean;
};

export function ChatPane({
  activeChat,
  model,
  theme,
  prompt,
  setPrompt,
  sendMessage,
  clearChat,
  isStreaming,
}: ChatPaneProps) {
  const [pendingFiles, setPendingFiles] = useState<FileResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeChat) {
    return (
      <section className="chat-pane empty">
        <div className="empty-state">
          <h2>Select or create a chat to begin</h2>
        </div>
      </section>
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
    }

    try {
        const response = await fetch(`${API_BASE}/files/upload`, {
            method: "POST",
            body: formData,
        });
        const results = await response.json();
        setPendingFiles([...pendingFiles, ...results]);
    } catch (error) {
        console.error("Upload failed", error);
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  }

  const handleSend = (e: FormEvent) => {
    sendMessage(e, pendingFiles);
    setPendingFiles([]);
  };

  return (
    <section className="chat-pane">
      <header>
        <div className="chat-header-info">
            <h2>{activeChat ? activeChat.title : "New Chat"}</h2>
            <p>{model}</p>
        </div>
        <button className="secondary-button-sm" onClick={clearChat} title="Clear all messages">
            Clear History
        </button>
      </header>

      <div className="messages">
        {activeChat && activeChat.messages.length > 0 ? (
          activeChat.messages.map((message, index) => (
            <MessageItem key={index} message={message} theme={theme} />
          ))
        ) : (
          <div className="welcome-container">
            <div className="welcome-card">
              <h1>Welcome to OfflineChat</h1>
              <p>Your private, local-first AI assistant powered by Ollama.</p>
              <div className="features-grid">
                <div className="feature">
                  <strong>🔒 Private</strong>
                  <span>Local-first processing</span>
                </div>
                <div className="feature">
                  <strong>📁 Files</strong>
                  <span>PDF, Excel, & Text support</span>
                </div>
                <div className="feature">
                   <strong>🎨 Vision</strong>
                   <span>Analyze images locally</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        <form className="chat-input-container" onSubmit={handleSend}>
          {pendingFiles.length > 0 && (
            <div className="file-previews">
              {pendingFiles.map((file, i) => (
                <div key={i} className="file-preview-card">
                  {file.base64 ? <ImageIcon size={14} /> : <FileText size={14} />}
                  <span>{file.name}</span>
                  <button type="button" className="icon-btn-sm" onClick={() => removeFile(i)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="input-row">
            <button 
              type="button" 
              className="icon-button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach File"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <textarea
              autoFocus
              value={prompt}
              placeholder={isUploading ? "Uploading files..." : "Message your local AI..."}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isUploading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button className="primary-button" disabled={isStreaming || isUploading || (!prompt.trim() && pendingFiles.length === 0)} title="Send message">
              {isStreaming ? <RefreshCcw className="spinning" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
