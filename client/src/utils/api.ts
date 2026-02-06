import type { ChatResponse, Message } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Chat API (stateless; conversations and files stored in IndexedDB on client)
export async function sendChatMessage(
  messages: Message[],
  conversationId: string | null,
): Promise<ChatResponse> {
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
      throw new Error("File attachment is too large. Try a smaller file.");
    }
    const errorData = (await response.json()) as { error?: string };
    throw new Error(errorData.error || "Failed to get response");
  }

  return response.json();
}
