import { describe, it, expect } from 'vitest';
import { YuqueError, handleYuqueError } from '../../src/utils/error.js';

describe('error utilities', () => {
  describe('YuqueError', () => {
    it('should create error with message', () => {
      const error = new YuqueError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('YuqueError');
      expect(error.statusCode).toBeUndefined();
    });

    it('should create error with status code', () => {
      const error = new YuqueError('Test error', 404);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
    });

    it('should create error with original error', () => {
      const originalError = new Error('Original');
      const error = new YuqueError('Test error', 500, originalError);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('handleYuqueError', () => {
    it('should rethrow YuqueError', () => {
      const error = new YuqueError('Test error', 404);
      expect(() => handleYuqueError(error)).toThrow(YuqueError);
      expect(() => handleYuqueError(error)).toThrow('Test error');
    });

    it('should handle axios error with response', () => {
      const axiosError = {
        response: {
          status: 401,
          data: {
            message: 'Unauthorized',
          },
        },
      };

      expect(() => handleYuqueError(axiosError)).toThrow(YuqueError);
      expect(() => handleYuqueError(axiosError)).toThrow('Unauthorized');
    });

    it.each([
      [400, 'Bad request'],
      [403, 'Forbidden'],
      [404, 'Not found'],
      [429, 'Rate limited'],
      [500, 'Yuque server error'],
    ])('should include status hint for HTTP %s', (status, hint) => {
      const axiosError = {
        response: {
          status,
          data: {
            message: 'API failed',
          },
        },
      };

      expect(() => handleYuqueError(axiosError)).toThrow(hint);
    });

    it('should handle error with message', () => {
      const error = { message: 'Network error' };
      expect(() => handleYuqueError(error)).toThrow(YuqueError);
      expect(() => handleYuqueError(error)).toThrow('Network error');
    });

    it('should handle unknown error', () => {
      const error = 'string error';
      expect(() => handleYuqueError(error)).toThrow(YuqueError);
      expect(() => handleYuqueError(error)).toThrow('Unknown error occurred');
    });
  });
});
