import type { Message } from "../../types";
import type { LLMProvider, FileAttachment } from "../llmService";

interface GoogleResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

const MESSAGE_TIMEOUT_MS = 30_000;
const TEST_CONNECTION_TIMEOUT_MS = 10_000;

// Map deprecated Gemini model IDs to current API model IDs (fixes 404)
const GEMINI_MODEL_ALIASES: Record<string, string> = {
  "gemini-pro": "gemini-2.5-pro",
  "gemini-flash-1.5": "gemini-2.5-flash",
};

export class GoogleProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = GEMINI_MODEL_ALIASES[model] ?? model;
  }

  async sendMessage(
    messages: Message[],
    systemPrompt: string,
    fileAttachments?: FileAttachment[]
  ): Promise<string> {
    try {
      // Google Gemini API format
      // Note: Gemini doesn't support system prompts in the same way, so we prepend it to the first user message
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // Add system prompt to first user message
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (firstUserMessage) {
        parts.push({ text: `${systemPrompt}\n\n${firstUserMessage.content}` });
      }

      // Add file attachments if present
      if (fileAttachments && fileAttachments.length > 0) {
        for (const file of fileAttachments) {
          if (file.type === "image" && file.mimeType) {
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: file.data,
              },
            });
          } else if (file.type === "text") {
            // Text includes extracted PDF content
            parts.push({ text: file.data });
          }
          // Note: 'document' type no longer used - PDFs are now extracted to text
        }
      }

      // Build conversation history
      const conversationHistory: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
      }> = [];

      // Process remaining messages
      let isFirstUser = true;
      for (const msg of messages) {
        if (msg.role === "user") {
          if (isFirstUser) {
            isFirstUser = false;
            continue; // Already handled above
          }
          conversationHistory.push({
            role: "user",
            parts: [{ text: msg.content }],
          });
        } else {
          conversationHistory.push({
            role: "model",
            parts: [{ text: msg.content }],
          });
        }
      }

      const requestBody: {
        contents: Array<{
          role: "user" | "model";
          parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
        }>;
      } = {
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      };

      // Add conversation history if present
      if (conversationHistory.length > 0) {
        requestBody.contents = [...conversationHistory, ...requestBody.contents];
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MESSAGE_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,  // Header-based auth (no key in URL)
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Google API error: ${response.statusText}`);
        }

        const data = (await response.json()) as GoogleResponse;

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("No response from Google");
        }

        const textPart = data.candidates[0].content.parts.find((p) => p.text);
        if (!textPart || !textPart.text) {
          throw new Error("No text content in response");
        }

        return textPart.text;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google API error: ${error.message}`);
      }
      throw new Error("Unknown error calling Google API");
    }
  }

  async testConnection(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_CONNECTION_TIMEOUT_MS);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,  // Header-based auth (no key in URL)
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "" }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: "test" }],
            },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Google connection test failed:", error);
      return false;
    }
  }
}
