/**
 * Tests for the main AISpine class
 */

import { AISpine } from '../spine';
import { ValidationError } from '../errors';

describe('AISpine', () => {
  const validApiKey = 'sk_test_1234567890abcdef1234567890abcdef';

  describe('constructor', () => {
    it('should create instance with valid API key', () => {
      const spine = new AISpine(validApiKey);
      expect(spine).toBeInstanceOf(AISpine);
    });

    it('should create instance with config object', () => {
      const spine = new AISpine({
        apiKey: validApiKey,
        baseURL: 'https://custom.api.com/v1',
        timeout: 60000,
      });
      expect(spine).toBeInstanceOf(AISpine);
    });

    it('should throw ValidationError for invalid API key', () => {
      expect(() => {
        new AISpine('invalid-key');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing API key', () => {
      expect(() => {
        new AISpine('');
      }).toThrow(ValidationError);
    });
  });

  describe('configuration', () => {
    let spine: AISpine;

    beforeEach(() => {
      spine = new AISpine(validApiKey);
    });

    it('should get current configuration', () => {
      const config = spine.getConfig();
      expect(config.apiKey).toBe(validApiKey);
      expect(config.baseURL).toBe('http://localhost:8000/api/v1');
      expect(config.timeout).toBe(30000);
      expect(config.retries).toBe(3);
      expect(config.debug).toBe(false);
    });

    it('should update configuration', () => {
      spine.updateConfig({
        baseURL: 'https://new.api.com/v1',
        timeout: 60000,
        debug: true,
      });

      const config = spine.getConfig();
      expect(config.baseURL).toBe('https://new.api.com/v1');
      expect(config.timeout).toBe(60000);
      expect(config.debug).toBe(true);
    });
  });
});