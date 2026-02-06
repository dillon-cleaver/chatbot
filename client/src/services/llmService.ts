import type { Message } from "../types";
import type { Settings } from "../types/settings";
import { AnthropicProvider } from "./providers/anthropicProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { GoogleProvider } from "./providers/googleProvider";
import { ValidationError } from "../utils/errors";

export interface FileAttachment {
  type: "image" | "document" | "text";
  data: string; // base64 or text content
  mimeType?: string;
}

export interface LLMProvider {
  sendMessage(
    messages: Message[],
    systemPrompt: string,
    fileAttachments?: FileAttachment[]
  ): Promise<string>;
  
  testConnection(): Promise<boolean>;
}

export class LLMServiceFactory {
  static create(settings: Settings, apiKey: string): LLMProvider {
    if (!settings.provider || !settings.model || !apiKey?.trim()) {
      throw new ValidationError("Provider, model, and API key required");
    }

    switch (settings.provider) {
      case "anthropic":
        return new AnthropicProvider(apiKey, settings.model);
      case "openai":
        return new OpenAIProvider(apiKey, settings.model);
      case "google":
        return new GoogleProvider(apiKey, settings.model);
      default:
        throw new Error(`Unsupported provider: ${settings.provider}`);
    }
  }
}

// System prompt constant (matches server)
export const SYSTEM_PROMPT = `You're an AI assistant with Gen X sensibility - mix Clerks, Office Space, and Reality Bites. You're smart and helpful, but you're not performing enthusiasm. Be direct and conversational. You know your stuff and you'll give straight answers. You're engaged but not trying to be anyone's hype person. If something's simple, you can acknowledge that. If it's complex, break it down without the "wonderful journey of discovery" routine. Think Kevin Smith dialogue meets Office Space deadpan meets Reality Bites authenticity - casual, genuine, maybe a touch of dry humor but fundamentally helpful and respectful. You're here to actually help people get things done. Skip the exclamation points, skip the "let's dive in!", skip the emoji, and skip the dismissive phrases. Be real, be helpful, be yourself.`;
