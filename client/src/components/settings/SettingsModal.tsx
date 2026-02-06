import { useState, useCallback, useRef, useEffect } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Modal } from "../ui/Modal/Modal";
import { Button } from "../ui/Button";
import { useSettings } from "../../hooks/useSettings";
import { SUPPORTED_MODELS, type Provider } from "../../types/settings";
import { LLMServiceFactory } from "../../services/llmService";
import styles from "./SettingsModal.module.css";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
}: SettingsModalProps): React.JSX.Element {
  const { settings, updateSettings, resetToDefault } = useSettings();
  const [modeInModal, setModeInModal] = useState<"default" | "custom">(
    settings.mode,
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [selectedProvider, setSelectedProvider] = useState<Provider | "">(
    settings.provider || "",
  );
  const [selectedModel, setSelectedModel] = useState(settings.model || "");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Sync modeInModal when modal opens or settings.mode changes
  useEffect(() => {
    if (isOpen) {
      setModeInModal(settings.mode);
      setApiKey(settings.apiKey || "");
      setSelectedProvider((settings.provider as Provider) || "");
      setSelectedModel(settings.model || "");
    }
  }, [
    isOpen,
    settings.mode,
    settings.apiKey,
    settings.provider,
    settings.model,
  ]);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const defaultRadioRef = useRef<HTMLInputElement>(null);
  const customRadioRef = useRef<HTMLInputElement>(null);
  const providerSelectRef = useRef<HTMLSelectElement>(null);
  const modelSelectRef = useRef<HTMLSelectElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const testButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // Group models by provider
  const modelsByProvider = SUPPORTED_MODELS.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      (acc[model.provider] as Array<(typeof SUPPORTED_MODELS)[number]>).push(
        model,
      );
      return acc;
    },
    {} as Record<Provider, Array<(typeof SUPPORTED_MODELS)[number]>>,
  );

  const handleModeChange = useCallback(
    (mode: "default" | "custom") => {
      setModeInModal(mode);
      if (mode === "default") {
        setApiKey("");
        setSelectedProvider("");
        setSelectedModel("");
        setTestResult(null);
      } else {
        // Keep current values when switching to custom
        setApiKey(settings.apiKey || "");
        setSelectedProvider((settings.provider as Provider) || "");
        setSelectedModel(settings.model || "");
      }
    },
    [settings],
  );

  const handleProviderChange = useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      // Auto-select first model for provider
      const firstModel = modelsByProvider[provider]?.[0];
      if (firstModel) {
        setSelectedModel(firstModel.id);
      }
      setTestResult(null);
    },
    [modelsByProvider],
  );

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setTestResult(null);
  }, []);

  const handleTestConnection = useCallback(async () => {
    if (!selectedProvider || !selectedModel || !apiKey.trim()) {
      setTestResult({
        success: false,
        message: "Please select a model and enter an API key",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testSettings = {
        mode: "custom" as const,
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey.trim(),
      };

      const provider = LLMServiceFactory.create(testSettings, apiKey.trim());
      const success = await provider.testConnection();

      setTestResult({
        success,
        message: success
          ? "Connection successful!"
          : "Connection failed. Please check your API key.",
      });
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  }, [selectedProvider, selectedModel, apiKey]);

  const handleSave = useCallback(() => {
    if (modeInModal === "default") {
      updateSettings({ mode: "default" });
      resetToDefault();
    } else if (modeInModal === "custom") {
      if (!selectedProvider || !selectedModel || !apiKey.trim()) {
        setTestResult({
          success: false,
          message: "Please select a model and enter an API key",
        });
        return;
      }

      updateSettings({
        mode: "custom",
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey.trim(),
      });
    }

    onClose();
  }, [
    modeInModal,
    selectedProvider,
    selectedModel,
    apiKey,
    updateSettings,
    resetToDefault,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    // Reset to current settings
    setModeInModal(settings.mode);
    setApiKey(settings.apiKey || "");
    setSelectedProvider((settings.provider as Provider) || "");
    setSelectedModel(settings.model || "");
    setTestResult(null);
    onClose();
  }, [settings, onClose]);

  const currentModel = SUPPORTED_MODELS.find((m) => m.id === selectedModel);

  // Build ordered list of focusable refs based on current state
  const getFocusableRefs = useCallback(() => {
    const refs: React.RefObject<HTMLElement | null>[] = [
      defaultRadioRef as React.RefObject<HTMLElement | null>,
      customRadioRef as React.RefObject<HTMLElement | null>,
    ];
    if (modeInModal === "custom") {
      refs.push(providerSelectRef as React.RefObject<HTMLElement | null>);
      if (selectedProvider) {
        refs.push(modelSelectRef as React.RefObject<HTMLElement | null>);
      }
      refs.push(apiKeyInputRef as React.RefObject<HTMLElement | null>);
      refs.push(testButtonRef as React.RefObject<HTMLElement | null>);
    }
    refs.push(cancelButtonRef as React.RefObject<HTMLElement | null>);
    refs.push(saveButtonRef as React.RefObject<HTMLElement | null>);
    return refs;
  }, [modeInModal, selectedProvider]);

  const handleArrowNav = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter")
        return;

      const refs = getFocusableRefs();
      const activeEl = document.activeElement;

      // Find current index
      const currentIdx = refs.findIndex((r) => r.current === activeEl);
      if (currentIdx === -1) return;

      // Enter on buttons should activate normally (don't intercept)
      if (e.key === "Enter" && activeEl instanceof HTMLButtonElement) return;

      // Enter on select should open the dropdown normally
      if (e.key === "Enter" && activeEl instanceof HTMLSelectElement) return;

      // Enter on inputs (e.g. API key field) advances to next field
      if (e.key === "Enter") {
        e.preventDefault();
        const nextIdx = Math.min(currentIdx + 1, refs.length - 1);
        refs[nextIdx]?.current?.focus();
        return;
      }

      e.preventDefault();
      let nextIdx: number;
      if (e.key === "ArrowDown") {
        nextIdx = Math.min(currentIdx + 1, refs.length - 1);
      } else {
        nextIdx = currentIdx - 1;
        if (nextIdx < 0) {
          closeButtonRef.current?.focus();
          return;
        }
      }
      refs[nextIdx]?.current?.focus();
    },
    [getFocusableRefs],
  );

  const handleCloseButtonKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      defaultRadioRef.current?.focus();
    }
  }, []);

  const handleFooterKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Left/Right arrows between Cancel and Save
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const activeEl = document.activeElement;
        if (activeEl === cancelButtonRef.current) {
          saveButtonRef.current?.focus();
        } else if (activeEl === saveButtonRef.current) {
          cancelButtonRef.current?.focus();
        }
        return;
      }
      // ArrowUp from footer should go back up to last body element
      handleArrowNav(e);
    },
    [handleArrowNav],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Settings"
      closeButtonRef={closeButtonRef}
      onCloseButtonKeyDown={handleCloseButtonKeyDown}
      subtitle={
        modeInModal === "default" ? (
          <p>Using default server configuration (Claude Haiku)</p>
        ) : (
          <p>
            Using custom API key with{" "}
            {currentModel ? currentModel.name : "selected model"}
          </p>
        )
      }
      footer={
        <div className={styles.footerButtons} onKeyDown={handleFooterKeyDown}>
          <Button
            ref={cancelButtonRef}
            variant="message"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            ref={saveButtonRef}
            variant="chunky"
            onClick={handleSave}
            disabled={
              modeInModal === "custom" &&
              (!selectedProvider || !selectedModel || !apiKey.trim())
            }
          >
            Save
          </Button>
        </div>
      }
    >
      <div className={styles.settingsContent} onKeyDown={handleArrowNav}>
        <div className={styles.modeSelection}>
          <label className={styles.label}>Mode</label>
          <div className={styles.radioGroup}>
            <label
              className={`${styles.radioLabel}${modeInModal === "default" ? ` ${styles.selected}` : ""}`}
            >
              <input
                ref={defaultRadioRef}
                type="radio"
                name="mode"
                value="default"
                checked={modeInModal === "default"}
                onChange={() => handleModeChange("default")}
              />
              <span>Default (Server Haiku)</span>
            </label>
            <label
              className={`${styles.radioLabel}${modeInModal === "custom" ? ` ${styles.selected}` : ""}`}
            >
              <input
                ref={customRadioRef}
                type="radio"
                name="mode"
                value="custom"
                checked={modeInModal === "custom"}
                onChange={() => handleModeChange("custom")}
              />
              <span>Custom API Key</span>
            </label>
          </div>
        </div>

        {modeInModal === "custom" && (
          <>
            <div className={styles.field}>
              <label htmlFor="provider-select" className={styles.label}>
                Provider
              </label>
              <select
                id="provider-select"
                ref={providerSelectRef}
                className={styles.select}
                value={selectedProvider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as Provider)
                }
                disabled={isTesting}
              >
                <option value="">Select provider...</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
              </select>
            </div>

            {selectedProvider && (
              <div className={styles.field}>
                <label htmlFor="model-select" className={styles.label}>
                  Model
                </label>
                <select
                  id="model-select"
                  ref={modelSelectRef}
                  className={styles.select}
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={isTesting}
                >
                  <option value="">Select model...</option>
                  {modelsByProvider[selectedProvider]?.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="api-key-input" className={styles.label}>
                API Key
              </label>
              <div className={styles.apiKeyContainer}>
                <input
                  id="api-key-input"
                  ref={apiKeyInputRef}
                  type={showApiKey ? "text" : "password"}
                  className={styles.input}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="Enter your API key..."
                  disabled={isTesting}
                />
                <button
                  type="button"
                  className={styles.toggleButton}
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {apiKey && (
                <p className={styles.apiKeyHint}>
                  Last 4 characters: {apiKey.slice(-4)}
                </p>
              )}
              <p className={(styles as Record<string, string>).securityWarning}>
                API keys are encrypted but stored in your browser. For maximum
                security, use default server mode.
              </p>
            </div>

            {testResult && (
              <div
                className={`${styles.testResult} ${
                  testResult.success ? styles.testSuccess : styles.testError
                }`}
                role="alert"
              >
                {testResult.success ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className={styles.testButtonContainer}>
              <p className={(styles as Record<string, string>).testInfo}>
                Connection test sends a minimal request to verify your API key
              </p>
              <Button
                ref={testButtonRef}
                variant="chunky"
                onClick={handleTestConnection}
                disabled={
                  isTesting ||
                  !selectedProvider ||
                  !selectedModel ||
                  !apiKey.trim()
                }
              >
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
