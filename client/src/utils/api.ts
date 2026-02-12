import type { ChatResponse, Message } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function sendChatMessage(
  messages: Message[],
  conversationId: string | null,
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        conversation_id: conversationId,
      }),
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error('File too large. Please reduce the file size and try again.');
      }
      let errorMessage = 'Failed to get response';
      try {
        const errorData = (await response.json()) as { error?: string };
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error: Check your connection and try again.');
    }
    throw error;
  }
}
