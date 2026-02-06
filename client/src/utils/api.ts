import type { ChatResponse, Message } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Chat API (stateless; conversations and files stored in IndexedDB on client)
export async function sendChatMessage(
  messages: Message[],
  conversationId: string | null,
): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        conversation_id: conversationId,
      }),
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error("File too large");
      }

      // Try to extract error message from response
      let errorMessage = "Failed to get response";
      try {
        const errorData = (await response.json()) as { error?: string };
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If JSON parsing fails, try text
        try {
          const textError = await response.text();
          if (textError) errorMessage = textError;
        } catch {
          // Use default message
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError) {
      throw new Error('Network error: Check your connection');
    }
    // Re-throw other errors
    throw error;
  }
}
