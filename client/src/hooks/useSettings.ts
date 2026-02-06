import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Settings } from "../types/settings";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from "../types/settings";

export interface UseSettingsReturn {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetToDefault: () => Promise<void>;
  isCustomMode: boolean;
  isLoading: boolean;
}

const SettingsContext = createContext<UseSettingsReturn | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch((error) => {
        console.error("Failed to load settings:", error);
        setSettings(DEFAULT_SETTINGS);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>): Promise<void> => {
    setSettings((prev) => {
      const newSettings: Settings = {
        ...prev,
        ...updates,
      };

      if (newSettings.mode === "default") {
        newSettings.provider = undefined;
        newSettings.model = undefined;
        newSettings.apiKey = undefined;
      }

      // Validate BEFORE saving
      if (newSettings.mode === "custom") {
        if (!newSettings.provider || !newSettings.model || !newSettings.apiKey) {
          console.warn('Incomplete custom settings - not saved');
          return prev; // Reject update
        }
      }

      // Save asynchronously (don't block UI)
      saveSettings(newSettings).catch((error) => {
        console.error("Failed to save settings:", error);
      });
      return newSettings;
    });
  }, []);

  const resetToDefault = useCallback(async (): Promise<void> => {
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS).catch((error) => {
      console.error("Failed to save default settings:", error);
    });
  }, []);

  const value: UseSettingsReturn = {
    settings,
    updateSettings,
    resetToDefault,
    isCustomMode: settings.mode === "custom",
    isLoading,
  };

  return React.createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings(): UseSettingsReturn {
  const context = useContext(SettingsContext);
  if (context === null) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
