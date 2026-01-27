export interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: UploadedFile[];
}

export interface UploadedFile {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
  path: string;
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

export interface ChatRequest {
  message: string;
  conversationId?: string;
  fileIds?: string[];
}

export interface ErrorResponse {
  error: string;
}

export interface UpdateConversationTitleRequest {
  title: string;
}
