import React, { FormEvent } from "react";
import { Moon, RefreshCcw, Sun, Trash2, Plus, MessageSquare, FileText, Download } from "lucide-react";
import { Chat, OllamaModel } from "../types";
import { StatsDashboard } from "./StatsDashboard";

type SidebarProps = {
  theme: string;
  setTheme: (theme: string) => void;
  status: string;
  refreshModels: () => void;
  models: OllamaModel[];
  model: string;
  setModel: (model: string) => void;
  customModel: string;
  setCustomModel: (val: string) => void;
  pullName: string;
  setPullName: (val: string) => void;
  pullModel: (e: FormEvent) => void;
  deleteModel: (name: string) => void;
  chats: Chat[];
  activeChatId: string;
  setActiveChat: (id: string) => void;
  createNewChat: () => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  startOllama: () => void;
  unloadModel: () => void;
};

export function Sidebar({
  theme,
  setTheme,
  status,
  refreshModels,
  models,
  model,
  setModel,
  customModel,
  setCustomModel,
  pullName,
  setPullName,
  pullModel,
  deleteModel,
  chats,
  activeChatId,
  setActiveChat,
  createNewChat,
  deleteChat,
  renameChat,
  startOllama,
  unloadModel,
}: SidebarProps) {
  const [editingChatId, setEditingChatId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");

  const modelName = (m: OllamaModel) => m.name || m.model || "";
  const installedModelNames = models.map(modelName).filter(Boolean);

  const formatSize = (size?: number) => {
    if (!size) return "Unknown";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    for (const unit of units) {
      if (value < 1024 || unit === units[units.length - 1]) {
        return unit === "B" ? `${value} B` : `${value.toFixed(1)} ${unit}`;
      }
      value /= 1024;
    }
    return "Unknown";
  };

  const startRename = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleRename = (id: string) => {
    if (editTitle.trim()) {
        renameChat(id, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const downloadChat = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    const blob = new Blob([JSON.stringify(chat, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    const mdContent = chat.messages
      .map(m => `### ${m.role.toUpperCase()}\n\n${m.content}\n\n---\n`)
      .join("\n");
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chat.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <h1>OfflineChat</h1>
        <button
          className="icon-button"
          title="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <button className="primary-button full-width" onClick={createNewChat}>
        <Plus size={18} /> New Chat
      </button>

      <section className="chat-history">
        <label>History</label>
        <div className="chat-list">
          {chats.map((c) => (
            <div
              key={c.id}
              className={`chat-item ${c.id === activeChatId ? "active" : ""}`}
              onClick={() => setActiveChat(c.id)}
            >
              <MessageSquare size={16} />
              {editingChatId === c.id ? (
                <input
                    autoFocus
                    className="rename-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(c.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(c.id); }}
                    onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="chat-title" onDoubleClick={(e) => startRename(e, c)}>{c.title}</span>
              )}
              
              <div className="chat-item-actions">
                <button className="icon-btn-sm" onClick={(e) => downloadChat(e, c)} title="Download JSON">
                  <Download size={14} />
                </button>
                <button className="icon-btn-sm" onClick={(e) => downloadMarkdown(e, c)} title="Download Markdown (.md)">
                  <FileText size={14} />
                </button>
                <button 
                  className="icon-btn-sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                  title="Delete Chat"
                >
                    <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="sidebar-footer">
        <section>
          <label className="section-label">Model</label>
          <div className="model-selector-row">
            <select value={model} onChange={(e) => setModel(e.target.value)}>
                {!installedModelNames.includes(model) && <option value={model}>{model}</option>}
                {models.map((m) => (
                <option key={modelName(m)} value={modelName(m)}>
                    {modelName(m)} ({formatSize(m.size)})
                </option>
                ))}
            </select>
            <button className="icon-btn-sm" onClick={unloadModel} title="Unload model from memory">
                <Trash2 size={16} />
            </button>
          </div>
          <div className="model-selector-row" style={{ marginTop: "0.5rem" }}>
            <input
              value={customModel}
              placeholder="Custom model..."
              onChange={(e) => setCustomModel(e.target.value)}
              onBlur={() => customModel.trim() && setModel(customModel.trim())}
            />
          </div>
        </section>

        <section>
          <label className="section-label">Pull New Model</label>
          <div className="model-selector-row">
            <input
              value={pullName}
              placeholder="e.g. llama3"
              onChange={(e) => setPullName(e.target.value)}
            />
            <button className="secondary-button-sm" onClick={() => pullModel(pullName)}>
              Pull
            </button>
          </div>
        </section>

        <section className="status-area">
          <div className={`status ${status}`}>
            {status === "running" ? "Ollama Online" : "Ollama Offline"}
          </div>
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
            <button className="secondary-button-sm" style={{ flex: 1 }} onClick={refreshModels}>
               Refresh
            </button>
            {status !== "running" && (
                <button className="primary-button" style={{ flex: 2, fontSize: "0.75rem", padding: "0.4rem" }} onClick={startOllama}>
                    Start Ollama
                </button>
            )}
          </div>
        </section>

        <StatsDashboard status={status} refreshModels={refreshModels} />
      </div>
    </aside>
  );
}
