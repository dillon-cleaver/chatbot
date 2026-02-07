import { describe, it, expect } from 'vitest';
import { ValidationError, validateMessages, getUserFriendlyError } from './errors';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import type { Message } from '../types';

describe('ValidationError', () => {
  it('should create error with correct name and message', () => {
    const error = new ValidationError('Test message');
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test message');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
  });
});

describe('validateMessages', () => {
  describe('array validation', () => {
    it('should throw ValidationError for non-array input', () => {
      expect(() => validateMessages(null as any)).toThrow(ValidationError);
      expect(() => validateMessages(null as any)).toThrow('Messages must be an array');
      expect(() => validateMessages(undefined as any)).toThrow('Messages must be an array');
      expect(() => validateMessages({} as any)).toThrow('Messages must be an array');
    });

    it('should throw ValidationError for empty array', () => {
      expect(() => validateMessages([])).toThrow(ValidationError);
      expect(() => validateMessages([])).toThrow('Messages array cannot be empty');
    });
  });

  describe('message entry validation', () => {
    it('should throw ValidationError for null entries', () => {
      expect(() => validateMessages([null as any])).toThrow(ValidationError);
      expect(() => validateMessages([null as any])).toThrow('Message at index 0 is null');
    });

    it('should throw ValidationError for undefined entries', () => {
      expect(() => validateMessages([undefined as any])).toThrow(ValidationError);
      expect(() => validateMessages([undefined as any])).toThrow('Message at index 0 is undefined');
    });

    it('should throw ValidationError for non-object entries', () => {
      expect(() => validateMessages(['string' as any])).toThrow(ValidationError);
      expect(() => validateMessages(['string' as any])).toThrow('must be an object');
      expect(() => validateMessages(['string' as any])).toThrow('received: string');

      expect(() => validateMessages([123 as any])).toThrow(ValidationError);
      expect(() => validateMessages([123 as any])).toThrow('received: number');
    });

    it('should throw ValidationError for missing role', () => {
      const message = { content: 'Hello' } as any;
      expect(() => validateMessages([message])).toThrow(ValidationError);
      expect(() => validateMessages([message])).toThrow("missing required 'role' property");
    });

    it('should throw ValidationError for invalid role and show what was received', () => {
      const message = { role: 'invalid', content: 'Hello' } as any;
      expect(() => validateMessages([message])).toThrow(ValidationError);
      expect(() => validateMessages([message])).toThrow('has invalid role');
      expect(() => validateMessages([message])).toThrow('received: "invalid"');
    });

    it('should throw ValidationError for missing content', () => {
      const message = { role: 'user' } as any;
      expect(() => validateMessages([message])).toThrow(ValidationError);
      expect(() => validateMessages([message])).toThrow("missing required 'content' property");
    });

    it('should throw ValidationError for non-string content and show type', () => {
      const message = { role: 'user', content: 123 } as any;
      expect(() => validateMessages([message])).toThrow(ValidationError);
      expect(() => validateMessages([message])).toThrow('must have string content');
      expect(() => validateMessages([message])).toThrow('received: number');
    });

    it('should throw ValidationError for empty/whitespace content', () => {
      const message: Message = { id: '1', role: 'user', content: '   ' };
      expect(() => validateMessages([message])).toThrow(ValidationError);
      expect(() => validateMessages([message])).toThrow('cannot have empty content');
    });
  });

  describe('valid messages', () => {
    it('should not throw for valid single message', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello' },
      ];
      expect(() => validateMessages(messages)).not.toThrow();
    });

    it('should not throw for valid multiple messages', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
        { id: '3', role: 'user', content: 'How are you?' },
      ];
      expect(() => validateMessages(messages)).not.toThrow();
    });

    it('should accept content with whitespace if trimmed content is non-empty', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: '  Hello  ' },
      ];
      expect(() => validateMessages(messages)).not.toThrow();
    });
  });

  describe('error messages include correct index', () => {
    it('should include correct index for second message', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Valid' },
        { id: '2', role: 'invalid', content: 'Bad role' },
      ] as any[];

      expect(() => validateMessages(messages)).toThrow('Message at index 1');
    });
  });
});

describe('getUserFriendlyError', () => {
  describe('ValidationError handling', () => {
    it('should return ValidationError message as-is', () => {
      const error = new ValidationError('Custom validation message');
      expect(getUserFriendlyError(error)).toBe('Custom validation message');
    });
  });

  describe('HTTP status code handling (structured errors)', () => {
    it('should handle error with status 401', () => {
      const error = { status: 401, message: 'Unauthorized' };
      expect(getUserFriendlyError(error)).toBe(ERROR_MESSAGES.API_AUTHENTICATION_FAILED);
    });

    it('should handle error with status 403', () => {
      const error = { status: 403, message: 'Forbidden' };
      expect(getUserFriendlyError(error)).toBe(ERROR_MESSAGES.API_ACCESS_DENIED);
    });

    it('should handle error with status 404', () => {
      const error = { status: 404, message: 'Not Found' };
      expect(getUserFriendlyError(error)).toBe(ERROR_MESSAGES.API_NOT_FOUND);
    });

    it('should handle error with status 429', () => {
      const error = { status: 429, message: 'Too Many Requests' };
      expect(getUserFriendlyError(error)).toBe(ERROR_MESSAGES.API_RATE_LIMITED);
    });

    it('should handle error with status 500', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      expect(getUserFriendlyError(error)).toBe(ERROR_MESSAGES.API_SERVER_ERROR);
    });

    it('should handle error with status 503', () => {
      const error = { status: 503, message: 'Service Unavailable' };
      expect(getUserFriendlyError(error)).toBe(ERROR_MESSAGES.API_SERVICE_UNAVAILABLE);
    });

    it('should prioritize status property over message pattern matching', () => {
      // Error has 500 status but message says "timeout"
      const error = { status: 500, message: 'Request timed out' };
      // Should use status (500) not message pattern (timeout)
      expect(getUserFriendlyError(error)).toBe(ERROR_MESSAGES.API_SERVER_ERROR);
    });
  });

  describe('Error object message pattern matching', () => {
    it('should handle network errors using constants', () => {
      expect(getUserFriendlyError(new Error('Failed to fetch'))).toBe(ERROR_MESSAGES.NETWORK_ERROR);
      expect(getUserFriendlyError(new Error('NetworkError occurred'))).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    });

    it('should handle timeout errors using constants', () => {
      expect(getUserFriendlyError(new Error('Request timed out'))).toBe(ERROR_MESSAGES.NETWORK_TIMEOUT);
      expect(getUserFriendlyError(new Error('Connection timeout'))).toBe(ERROR_MESSAGES.NETWORK_TIMEOUT);
    });

    it('should handle 401 in message when no status property', () => {
      expect(getUserFriendlyError(new Error('401 Unauthorized'))).toBe(ERROR_MESSAGES.API_AUTHENTICATION_FAILED);
      expect(getUserFriendlyError(new Error('unauthorized access'))).toBe(ERROR_MESSAGES.API_AUTHENTICATION_FAILED);
    });

    it('should strip technical prefixes', () => {
      const result1 = getUserFriendlyError(new Error('Error: Something went wrong'));
      expect(result1).not.toContain('Error:');

      const result2 = getUserFriendlyError(new TypeError('TypeError: Invalid type'));
      expect(result2).not.toContain('TypeError:');
    });
  });

  describe('String error handling', () => {
    it('should handle network error strings', () => {
      expect(getUserFriendlyError('Failed to fetch')).toBe(ERROR_MESSAGES.NETWORK_ERROR);
      expect(getUserFriendlyError('NetworkError')).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    });

    it('should handle timeout strings', () => {
      expect(getUserFriendlyError('timed out')).toBe(ERROR_MESSAGES.NETWORK_TIMEOUT);
    });
  });

  describe('Unknown error handling', () => {
    it('should handle null/undefined/non-objects gracefully', () => {
      expect(getUserFriendlyError(null)).toBe(ERROR_MESSAGES.API_REQUEST_FAILED);
      expect(getUserFriendlyError(undefined)).toBe(ERROR_MESSAGES.API_REQUEST_FAILED);
      expect(getUserFriendlyError(123)).toBe(ERROR_MESSAGES.API_REQUEST_FAILED);
      expect(getUserFriendlyError({ foo: 'bar' })).toBe(ERROR_MESSAGES.API_REQUEST_FAILED);
    });
  });

  describe('Case insensitivity', () => {
    it('should match patterns case-insensitively', () => {
      expect(getUserFriendlyError('FAILED TO FETCH')).toBe(ERROR_MESSAGES.NETWORK_ERROR);
      expect(getUserFriendlyError('TIMEOUT')).toBe(ERROR_MESSAGES.NETWORK_TIMEOUT);
      expect(getUserFriendlyError('UNAUTHORIZED')).toBe(ERROR_MESSAGES.API_AUTHENTICATION_FAILED);
    });
  });
});
