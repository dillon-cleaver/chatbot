import type {
  Message,
  ToolUseEvent,
  ToolResultEvent,
  ChatDoneEvent,
  ChatErrorEvent,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface StreamCallbacks {
  onToolUse: (event: ToolUseEvent) => void;
  onToolResult: (event: ToolResultEvent) => void;
  onDone: (event: ChatDoneEvent) => void;
  onError: (event: ChatErrorEvent) => void;
}

export async function sendChatMessageStream(
  messages: Message[],
  conversationId: string | null,
  callbacks: StreamCallbacks,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        conversation_id: conversationId,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error: Check your connection and try again.');
    }
    throw error;
  }

  // Non-SSE error responses (validation errors return JSON before stream starts)
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('File too large. Please reduce the file size and try again.');
    }
    let errorMessage = 'Failed to get response';
    const text = await response.text();
    try {
      const errorData = JSON.parse(text) as { error?: string };
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Read SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let receivedTerminalEvent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages (separated by double newlines)
      const parts = buffer.split('\n\n');
      // Keep the last part as it may be incomplete
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = '';
        let data = '';

        for (const line of part.split('\n')) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            data = line.slice(6);
          }
        }

        if (!eventType || !data) continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          callbacks.onError({
            error: 'Received malformed data from server.',
          } as ChatErrorEvent);
          receivedTerminalEvent = true;
          continue;
        }

        switch (eventType) {
          case 'tool_use':
            callbacks.onToolUse(parsed as ToolUseEvent);
            break;
          case 'tool_result':
            callbacks.onToolResult(parsed as ToolResultEvent);
            break;
          case 'done':
            callbacks.onDone(parsed as ChatDoneEvent);
            receivedTerminalEvent = true;
            break;
          case 'error':
            callbacks.onError(parsed as ChatErrorEvent);
            receivedTerminalEvent = true;
            break;
        }
      }
    }

    // Stream ended without a done/error event — server likely crashed or connection dropped
    if (!receivedTerminalEvent) {
      callbacks.onError({
        error: 'Connection lost. Please try again.',
      } as ChatErrorEvent);
    }
  } finally {
    reader.releaseLock();
  }
}
