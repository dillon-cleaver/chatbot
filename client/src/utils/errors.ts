/**
 * Centralized Error Handling Utilities
 *
 * Provides custom error types and utilities for consistent error handling
 * across the application.
 */

import type { Message } from "../types";

/**
 * Custom error for validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate messages array before sending to API
 * @throws {ValidationError} if validation fails
 */
export function validateMessages(messages: Message[]): void {
  if (!Array.isArray(messages)) {
    throw new ValidationError('Messages must be an array');
  }

  if (messages.length === 0) {
    throw new ValidationError('Messages array cannot be empty');
  }

  for (const [index, message] of messages.entries()) {
    if (!message.role || !['user', 'assistant'].includes(message.role)) {
      throw new ValidationError(`Message at index ${index} has invalid role: ${message.role}`);
    }

    if (!message.content || typeof message.content !== 'string') {
      throw new ValidationError(`Message at index ${index} has invalid content`);
    }

    if (message.content.trim().length === 0) {
      throw new ValidationError(`Message at index ${index} has empty content`);
    }
  }
}

/**
 * Convert technical error messages to user-friendly messages
 * @param error - Unknown error object
 * @returns User-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Strip technical prefixes
    let message = error.message;

    // Remove common technical prefixes
    message = message.replace(/^(Error|TypeError|ReferenceError|SyntaxError):\s*/i, '');
    message = message.replace(/^(Network error|Fetch error):\s*/i, 'Connection error: ');
    message = message.replace(/^(API error|Server error):\s*/i, '');

    // Handle common error patterns
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return 'Connection error: Check your network and try again';
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request timed out. Please try again';
    }

    if (message.includes('401') || message.includes('Unauthorized')) {
      return 'Authentication failed. Check your API key';
    }

    if (message.includes('403') || message.includes('Forbidden')) {
      return 'Access denied. Check your API key permissions';
    }

    if (message.includes('404') || message.includes('Not Found')) {
      return 'Resource not found. Check your configuration';
    }

    if (message.includes('429') || message.includes('Too Many Requests')) {
      return 'Rate limit exceeded. Please wait and try again';
    }

    if (message.includes('500') || message.includes('Internal Server Error')) {
      return 'Server error. Please try again later';
    }

    if (message.includes('503') || message.includes('Service Unavailable')) {
      return 'Service temporarily unavailable. Please try again later';
    }

    return message;
  }

  return 'An unexpected error occurred';
}
