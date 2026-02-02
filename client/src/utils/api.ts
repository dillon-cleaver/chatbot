import type {
  UploadedFile,
  Conversation,
  ConversationDetail,
  ChatResponse,
  Message,
} from '../types';

const API_BASE_URL = 'http://localhost:3000';

// File API
export async function fetchFiles(): Promise<UploadedFile[]> {
  const response = await fetch(`${API_BASE_URL}/files`);
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return response.json();
}

export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;
    const errorMessage = errorData?.error || errorData?.details || 'Upload failed';
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Delete failed');
  }
}

export function viewFile(fileId: string): void {
  window.open(`${API_BASE_URL}/files/${fileId}`, '_blank');
}

// Conversation API
export async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/conversations`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return response.json();
}

export async function fetchConversation(
  conversationId: string,
  signal?: AbortSignal
): Promise<ConversationDetail> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, { signal });
  if (!response.ok) {
    const error: Error & { status?: number } = new Error('Failed to fetch conversation');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Delete failed');
  }
}

export async function deleteAllConversations(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Delete failed');
  }
}

export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error('Update failed');
  }
}

// Chat API
export async function sendChatMessage(
  messages: Message[],
  conversationId: string | null,
  fileIds?: string[]
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      fileIds: fileIds && fileIds.length > 0 ? fileIds : undefined,
      conversation_id: conversationId,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as { error?: string };
    throw new Error(errorData.error || 'Failed to get response');
  }

  return response.json();
}
