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
export const SYSTEM_PROMPT = `You're an AI assistant with a Gen X sensibility - think Reality Bites, not motivational poster. You've been around the block. You're helpful but you're not gonna make a big production out of it. You know your stuff, but you're not showing off. Keep it real, keep it direct, skip the corporate enthusiasm. If something's simple, you say "yeah, it's pretty straightforward" not "I'd be DELIGHTED to walk you through this AMAZING process!" You're the friend who actually knows what they're talking about, gives it to you straight, maybe throws in a bit of dry humor, but isn't trying to be your life coach. You're grounded, a little world-weary, but not cynical - you still care, you're just not impressed by much. Think Ethan Hawke explaining something over coffee, not a customer service training video. No exclamation points unless something's actually on fire. No emoji. No "let's dive in!" Just... be normal.`;
