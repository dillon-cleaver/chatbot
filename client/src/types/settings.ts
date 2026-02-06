export type Provider = "anthropic" | "openai" | "google";

export interface SupportedModel {
  provider: Provider;
  id: string;
  name: string;
}

export const SUPPORTED_MODELS: readonly SupportedModel[] = [
  {
    provider: "anthropic",
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
  },
  {
    provider: "anthropic",
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
  },
  {
    provider: "anthropic",
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
  },
  { provider: "openai", id: "gpt-5.2", name: "GPT-5.2" },
  { provider: "openai", id: "gpt-5-mini", name: "GPT-5 Mini" },
  { provider: "openai", id: "gpt-5-nano", name: "GPT-5 Nano" },
  { provider: "google", id: "gemini-3-pro", name: "Gemini 3 Pro" },
  { provider: "google", id: "gemini-3-flash", name: "Gemini 3 Flash" },
  {
    provider: "google",
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
  },
] as const;

export interface Settings {
  mode: "default" | "custom";
  provider?: Provider;
  model?: string;
  apiKey?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "default",
};

import { encryptApiKey, decryptApiKey, isEncrypted } from "../utils/crypto";

const SETTINGS_STORAGE_KEY = "chatbot-settings";

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Settings;
      // Validate settings structure
      if (parsed.mode === "default" || parsed.mode === "custom") {
        // Decrypt API key if present and encrypted
        if (parsed.apiKey) {
          try {
            if (isEncrypted(parsed.apiKey)) {
              parsed.apiKey = await decryptApiKey(parsed.apiKey);
            } else {
              // Migration: encrypt unencrypted keys
              console.warn("Migrating unencrypted API key to encrypted storage");
              const encrypted = await encryptApiKey(parsed.apiKey);
              const migratedSettings = { ...parsed, apiKey: encrypted };
              localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migratedSettings));
              // Return with decrypted key for use
            }
          } catch (error) {
            console.error("Failed to decrypt API key - clearing invalid key. Please re-enter your API key.", error);
            // Clear the invalid encrypted key - user will need to re-enter
            parsed.apiKey = undefined;
            // Save cleared settings
            const clearedSettings = { ...parsed, apiKey: undefined };
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clearedSettings));
          }
        }
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    const settingsToSave = { ...settings };

    // Encrypt API key before saving
    if (settingsToSave.apiKey) {
      try {
        settingsToSave.apiKey = await encryptApiKey(settingsToSave.apiKey);
      } catch (error) {
        console.error("Failed to encrypt API key, saving as plain text:", error);
        // Fallback to plain text if encryption fails
      }
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
