/**
 * Standardized error messages for consistent user-facing errors
 */
export const ERROR_MESSAGES = {
  // Encryption errors
  ENCRYPTION_FAILED: "Failed to encrypt API key",
  DECRYPTION_FAILED: "Failed to decrypt API key",

  // Settings errors
  SETTINGS_LOAD_FAILED: "Failed to load settings",
  SETTINGS_SAVE_FAILED: "Failed to save settings",
  INVALID_SETTINGS: "Invalid settings configuration",

  // API errors
  API_KEY_MISSING: "API key is required",
  API_CONNECTION_FAILED: "Connection test failed. Please check your API key",
  API_REQUEST_FAILED: "API request failed",

  // File errors
  FILE_UPLOAD_FAILED: "Failed to upload file",
  FILE_DELETE_FAILED: "Failed to delete file",
  FILE_PROCESS_FAILED: "Failed to process file",
  FILE_TOO_LARGE: "File is too large",
  FILE_TYPE_UNSUPPORTED: "File type is not supported",

  // Conversation errors
  CONVERSATION_LOAD_FAILED: "Failed to load conversation",
  CONVERSATION_DELETE_FAILED: "Failed to delete conversation",
  CONVERSATION_CREATE_FAILED: "Failed to create conversation",

  // Message errors
  MESSAGE_SEND_FAILED: "Failed to send message",
  MESSAGE_EMPTY: "Message cannot be empty",

  // Network errors
  NETWORK_ERROR: "Network error. Please check your connection",
  NETWORK_TIMEOUT: "Request timed out. Please try again",

  // Provider errors
  PROVIDER_NOT_CONFIGURED: "Provider not configured correctly",
  PROVIDER_INVALID: "Invalid provider selected",
  MODEL_NOT_SELECTED: "Please select a model",

  // IndexedDB errors
  INDEXEDDB_ERROR: "Database error occurred",
  INDEXEDDB_NOT_SUPPORTED: "Your browser does not support local storage",
} as const;

/**
 * Error message builder for dynamic messages
 */
export const ERROR_MESSAGE_BUILDERS = {
  apiError: (message: string) => `API error: ${message}`,
  providerError: (provider: string, message: string) =>
    `${provider} error: ${message}`,
  fileError: (filename: string, message: string) =>
    `Error with ${filename}: ${message}`,
} as const;
