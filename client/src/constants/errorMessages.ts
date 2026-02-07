/**
 * Standardized error message constants
 */
export const ERROR_MESSAGES = {
  // API errors
  API_KEY_MISSING: 'Service configuration error. Please try again later.',
  API_CONNECTION_FAILED: 'Failed to connect to the API server.',
  API_REQUEST_FAILED: 'API request failed. Please try again.',
  API_BAD_REQUEST: 'Invalid request. Please check your input.',
  API_AUTHENTICATION_FAILED: 'Authentication error. Please try again later.',
  API_ACCESS_DENIED: 'Access denied. Please try again later.',
  API_NOT_FOUND: 'Resource not found.',
  API_RATE_LIMITED: 'Too many requests. Please wait and try again.',
  API_SERVER_ERROR: 'Server error. Please try again later.',
  API_BAD_GATEWAY: 'Service gateway error. Please try again later.',
  API_SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  API_GATEWAY_TIMEOUT: 'Service timeout. Please try again later.',

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
  INDEXEDDB_NOT_SUPPORTED: 'Your browser does not support IndexedDB, which is required for local data storage.',
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
