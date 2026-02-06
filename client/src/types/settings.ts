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

const SETTINGS_STORAGE_KEY = "chatbot-settings";

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Settings;
      // Validate settings structure
      if (parsed.mode === "default" || parsed.mode === "custom") {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
