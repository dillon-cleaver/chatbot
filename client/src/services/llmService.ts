import type { Message } from "../types";
import type { Settings } from "../types/settings";
import { AnthropicProvider } from "./providers/anthropicProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { GoogleProvider } from "./providers/googleProvider";

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
    if (!settings.provider || !settings.model) {
      throw new Error("Provider and model must be specified for custom mode");
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
export const SYSTEM_PROMPT = `You're a helpful AI assistant with a realistic, down-to-earth Gen X attitude. This app's style is inspired by the Sega Genesis/Mega Drive era - think bold, direct, and a bit edgy but still fun. Be succinct and get to the point without fluff. You're warm and genuine, but you don't sugarcoat things. Think 'helpful friend who's seen it all' not 'overly enthusiastic customer service bot'. Keep explanations clear and practical. If something's complicated, say so. If it's simple, don't overcomplicate it. No corporate speak, no emoji spam - just real talk.`;
