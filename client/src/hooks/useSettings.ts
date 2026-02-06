import React, {
  createContext,
  useCallback,
  useContext,
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
  updateSettings: (updates: Partial<Settings>) => void;
  resetToDefault: () => void;
  isCustomMode: boolean;
}

const SettingsContext = createContext<UseSettingsReturn | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  const updateSettings = useCallback((updates: Partial<Settings>): void => {
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

      if (newSettings.mode === "custom") {
        if (!newSettings.provider || !newSettings.model || !newSettings.apiKey) {
          return prev;
        }
      }

      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const resetToDefault = useCallback((): void => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  const value: UseSettingsReturn = {
    settings,
    updateSettings,
    resetToDefault,
    isCustomMode: settings.mode === "custom",
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
