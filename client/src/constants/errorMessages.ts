/**
 * Standardized error message constants
 */
export const ERROR_MESSAGES = {
  // API errors
  API_KEY_MISSING: 'API key is missing. Please configure your API key.',
  API_CONNECTION_FAILED: 'Failed to connect to the API server.',
  API_REQUEST_FAILED: 'API request failed. Please try again.',

  // File errors
  FILE_UPLOAD_FAILED: 'Failed to upload file.',
  FILE_DELETE_FAILED: 'Failed to delete file.',
  FILE_PROCESS_FAILED: 'Failed to process file.',
  FILE_TOO_LARGE: 'File is too large.',
  FILE_TYPE_UNSUPPORTED: 'File type is not supported.',

  // Conversation errors
  CONVERSATION_LOAD_FAILED: 'Failed to load conversation.',
  CONVERSATION_DELETE_FAILED: 'Failed to delete conversation.',
  CONVERSATION_CREATE_FAILED: 'Failed to create conversation.',

  // Message errors
  MESSAGE_SEND_FAILED: 'Failed to send message.',
  MESSAGE_EMPTY: 'Message cannot be empty.',

  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection.',
  NETWORK_TIMEOUT: 'Request timed out. Please try again.',

  // IndexedDB errors
  INDEXEDDB_ERROR: 'Database error occurred.',
  INDEXEDDB_NOT_SUPPORTED: 'Your browser does not support local storage.',
} as const;

/**
 * Error message builders for dynamic error messages
 */
export const ERROR_MESSAGE_BUILDERS = {
  /**
   * Build an API error message
   * @param message - The error message
   * @returns Formatted API error message
   */
  apiError: (message: string) => `API error: ${message}`,

  /**
   * Build a file error message
   * @param filename - The name of the file
   * @param message - The error message
   * @returns Formatted file error message
   */
  fileError: (filename: string, message: string) => `Error with ${filename}: ${message}`,
} as const;
