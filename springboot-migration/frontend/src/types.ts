export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
};

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
};

export type OllamaModel = {
  name?: string;
  model?: string;
  size?: number;
  modified_at?: string;
};

export type FileResult = {
  name: string;
  content: string;
  base64?: string;
};
