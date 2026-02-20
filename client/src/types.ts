export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } };

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  files?: UploadedFile[];
}

export interface UploadedFile {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  content: string;
  conversation_id: string;
}

export interface ErrorResponse {
  error: string;
}

// SSE event types for tool calling
export interface ToolUseEvent {
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolResultEvent {
  tool: string;
  success: boolean;
  error?: string;
}

export interface ChatDoneEvent {
  content: string;
  conversation_id: string;
}

export interface ChatErrorEvent {
  error: string;
}
