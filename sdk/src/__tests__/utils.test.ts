/**
 * Tests for utility functions
 */

import {
  validateApiKey,
  validateFlowId,
  validateExecutionId,
  validateAgentId,
  validateUrl,
  validateFlowInput,
  validateAgentConfig,
  sanitizeInput,
  formatDuration,
  isExecutionComplete,
  isExecutionRunning,
} from '../utils';

describe('Validation utilities', () => {
  describe('validateApiKey', () => {
    it('should validate correct API keys', () => {
      expect(validateApiKey('sk_test_1234567890abcdef1234567890abcdef')).toBe(true);
      expect(validateApiKey('sk_live_abcdef1234567890abcdef1234567890')).toBe(true);
    });

    it('should reject invalid API keys', () => {
      expect(validateApiKey('')).toBe(false);
      expect(validateApiKey('invalid')).toBe(false);
      expect(validateApiKey('sk_short')).toBe(false);
      expect(validateApiKey('wrong_prefix_1234567890abcdef')).toBe(false);
    });
  });

  describe('validateFlowId', () => {
    it('should validate correct flow IDs', () => {
      expect(validateFlowId('customer-support')).toBe(true);
      expect(validateFlowId('text_analysis')).toBe(true);
      expect(validateFlowId('flow123')).toBe(true);
    });

    it('should reject invalid flow IDs', () => {
      expect(validateFlowId('')).toBe(false);
      expect(validateFlowId('flow with spaces')).toBe(false);
      expect(validateFlowId('flow@invalid')).toBe(false);
      expect(validateFlowId('a'.repeat(101))).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:8000')).toBe(true);
      expect(validateUrl('https://api.example.com/webhook')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://invalid')).toBe(false);
    });
  });
});

describe('Input validation', () => {
  describe('validateFlowInput', () => {
    it('should validate correct flow input', () => {
      expect(validateFlowInput({ message: 'hello' })).toEqual([]);
      expect(validateFlowInput({ data: 'test', options: { timeout: 30 } })).toEqual([]);
    });

    it('should reject invalid flow input', () => {
      expect(validateFlowInput(null)).toHaveLength(1);
      expect(validateFlowInput(undefined)).toHaveLength(1);
      expect(validateFlowInput('string')).toHaveLength(1);
      expect(validateFlowInput(['array'])).toHaveLength(1);
    });
  });

  describe('validateAgentConfig', () => {
    const validConfig = {
      agent_id: 'test-agent',
      name: 'Test Agent',
      description: 'A test agent',
      endpoint: 'https://api.example.com',
      capabilities: ['text-processing'],
    };

    it('should validate correct agent config', () => {
      expect(validateAgentConfig(validConfig)).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const errors = validateAgentConfig({});
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'agent_id')).toBe(true);
      expect(errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject invalid field values', () => {
      const invalidConfig = {
        ...validConfig,
        agent_id: 'invalid@id',
        endpoint: 'not-a-url',
        capabilities: 'not-an-array',
      };
      
      const errors = validateAgentConfig(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Utility functions', () => {
  describe('sanitizeInput', () => {
    it('should remove functions', () => {
      const input = {
        data: 'hello',
        fn: () => console.log('test'),
        nested: {
          value: 'world',
          anotherFn: () => {},
        },
      };

      const sanitized = sanitizeInput(input);
      expect(sanitized.fn).toBeUndefined();
      expect(sanitized.nested.anotherFn).toBeUndefined();
      expect(sanitized.data).toBe('hello');
      expect(sanitized.nested.value).toBe('world');
    });

    it('should remove undefined values', () => {
      const input = {
        defined: 'value',
        undefined: undefined,
        null: null,
      };

      const sanitized = sanitizeInput(input);
      expect(sanitized.defined).toBe('value');
      expect('undefined' in sanitized).toBe(false);
      expect(sanitized.null).toBe(null);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1500)).toBe('1s');
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(3600000)).toBe('1h');
      expect(formatDuration(3665000)).toBe('1h 1m');
    });
  });

  describe('execution status helpers', () => {
    it('should identify complete executions', () => {
      expect(isExecutionComplete('completed')).toBe(true);
      expect(isExecutionComplete('failed')).toBe(true);
      expect(isExecutionComplete('running')).toBe(false);
      expect(isExecutionComplete('pending')).toBe(false);
    });

    it('should identify running executions', () => {
      expect(isExecutionRunning('running')).toBe(true);
      expect(isExecutionRunning('pending')).toBe(true);
      expect(isExecutionRunning('completed')).toBe(false);
      expect(isExecutionRunning('failed')).toBe(false);
    });
  });
});