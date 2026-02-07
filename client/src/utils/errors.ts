import type { Message } from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates messages array before API call
 * @param messages - Array of messages to validate
 * @throws {ValidationError} If validation fails
 */
export function validateMessages(messages: Message[]): void {
  // Must be a non-empty array
  if (!Array.isArray(messages)) {
    throw new ValidationError('Messages must be an array');
  }

  if (messages.length === 0) {
    throw new ValidationError('Messages array cannot be empty');
  }

  // Validate each message
  messages.forEach((message, index) => {
    // Must be a non-null object
    if (message === null || message === undefined) {
      throw new ValidationError(
        `Message at index ${index} is ${message === null ? 'null' : 'undefined'}`
      );
    }

    if (typeof message !== 'object') {
      throw new ValidationError(
        `Message at index ${index} must be an object (received: ${typeof message})`
      );
    }

    // Must have valid role
    if (!message.role) {
      throw new ValidationError(
        `Message at index ${index} is missing required 'role' property`
      );
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new ValidationError(
        `Message at index ${index} has invalid role (expected "user" or "assistant", received: "${message.role}")`
      );
    }

    // Must have non-empty string content
    if (message.content === undefined || message.content === null) {
      throw new ValidationError(
        `Message at index ${index} is missing required 'content' property`
      );
    }

    if (typeof message.content !== 'string') {
      throw new ValidationError(
        `Message at index ${index} must have string content (received: ${typeof message.content})`
      );
    }

    if (message.content.trim().length === 0) {
      throw new ValidationError(
        `Message at index ${index} cannot have empty content`
      );
    }
  });
}

/**
 * Converts technical errors to user-friendly messages
 * @param error - Error object or unknown error
 * @returns User-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  // Check for structured error with status property first (Copilot #3)
  if (error && typeof error === 'object' && 'status' in error) {
    const statusError = error as { status: number; message?: string };
    const status = statusError.status;

    switch (status) {
      case 401:
        return ERROR_MESSAGES.API_AUTHENTICATION_FAILED;
      case 403:
        return ERROR_MESSAGES.API_ACCESS_DENIED;
      case 404:
        return ERROR_MESSAGES.API_NOT_FOUND;
      case 429:
        return ERROR_MESSAGES.API_RATE_LIMITED;
      case 500:
        return ERROR_MESSAGES.API_SERVER_ERROR;
      case 503:
        return ERROR_MESSAGES.API_SERVICE_UNAVAILABLE;
      default:
        // Fall through to message-based matching
        break;
    }
  }

  // If it's a ValidationError, return the message as-is
  if (error instanceof ValidationError) {
    return error.message;
  }

  // Convert error to string
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    return ERROR_MESSAGES.API_REQUEST_FAILED; // Use constant (Copilot #4)
  }

  // Strip technical prefixes
  errorMessage = errorMessage
    .replace(/^Error:\s*/i, '')
    .replace(/^TypeError:\s*/i, '')
    .replace(/^ReferenceError:\s*/i, '')
    .replace(/^SyntaxError:\s*/i, '');

  // Convert to lowercase for pattern matching
  const lowerMessage = errorMessage.toLowerCase();

  // Pattern matching for common errors (using constants - Copilot #4)
  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('networkerror')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  }

  // String-based HTTP status matching (fallback if status property not found)
  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
    return ERROR_MESSAGES.API_AUTHENTICATION_FAILED;
  }

  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden')) {
    return ERROR_MESSAGES.API_ACCESS_DENIED;
  }

  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return ERROR_MESSAGES.API_NOT_FOUND;
  }

  if (lowerMessage.includes('429') || lowerMessage.includes('too many requests')) {
    return ERROR_MESSAGES.API_RATE_LIMITED;
  }

  if (lowerMessage.includes('500') || lowerMessage.includes('internal server error')) {
    return ERROR_MESSAGES.API_SERVER_ERROR;
  }

  if (lowerMessage.includes('503') || lowerMessage.includes('service unavailable')) {
    return ERROR_MESSAGES.API_SERVICE_UNAVAILABLE;
  }

  // Fallback (using constant - Copilot #4)
  return ERROR_MESSAGES.API_REQUEST_FAILED;
}
