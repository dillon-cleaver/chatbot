import { Message } from '../types';

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
    // Must have valid role
    if (!message.role || (message.role !== 'user' && message.role !== 'assistant')) {
      throw new ValidationError(
        `Message at index ${index} must have a valid role ("user" or "assistant")`
      );
    }

    // Must have non-empty string content
    if (typeof message.content !== 'string') {
      throw new ValidationError(
        `Message at index ${index} must have string content`
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
    return 'An unexpected error occurred';
  }

  // Strip technical prefixes
  errorMessage = errorMessage
    .replace(/^Error:\s*/i, '')
    .replace(/^TypeError:\s*/i, '')
    .replace(/^ReferenceError:\s*/i, '')
    .replace(/^SyntaxError:\s*/i, '');

  // Convert to lowercase for pattern matching
  const lowerMessage = errorMessage.toLowerCase();

  // Pattern matching for common errors
  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('networkerror')) {
    return 'Connection error: Check your network and try again';
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'Request timed out. Please try again';
  }

  if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
    return 'Authentication failed. Check your API key';
  }

  if (lowerMessage.includes('403') || lowerMessage.includes('forbidden')) {
    return 'Access denied. Check your API key permissions';
  }

  if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return 'Resource not found. Check your configuration';
  }

  if (lowerMessage.includes('429') || lowerMessage.includes('too many requests')) {
    return 'Rate limit exceeded. Please wait and try again';
  }

  if (lowerMessage.includes('500') || lowerMessage.includes('internal server error')) {
    return 'Server error. Please try again later';
  }

  if (lowerMessage.includes('503') || lowerMessage.includes('service unavailable')) {
    return 'Service temporarily unavailable. Please try again later';
  }

  // Fallback
  return 'An unexpected error occurred';
}
