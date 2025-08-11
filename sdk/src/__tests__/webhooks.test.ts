/**
 * Tests for webhook utilities
 */

import * as crypto from 'crypto';
import {
  WebhookSignature,
  WebhookEventHandler,
  WebhookEventFactory,
  WebhookRetry,
} from '../webhooks';
import { WebhookEvent, WebhookEventType } from '../types';

describe('WebhookSignature', () => {
  const secret = 'whsec_test_secret_key_12345';
  const payload = JSON.stringify({ test: 'data' });
  const timestamp = '1234567890';

  describe('generate', () => {
    it('should generate a valid signature', () => {
      const signature = WebhookSignature.generate({
        secret,
        timestamp,
        payload,
      });

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
      expect(signature).toContain(`t=${timestamp}`);
    });

    it('should generate different signatures for different payloads', () => {
      const signature1 = WebhookSignature.generate({
        secret,
        timestamp,
        payload: JSON.stringify({ test: 'data1' }),
      });

      const signature2 = WebhookSignature.generate({
        secret,
        timestamp,
        payload: JSON.stringify({ test: 'data2' }),
      });

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verify', () => {
    it('should verify a valid signature', () => {
      const signature = WebhookSignature.generate({
        secret,
        timestamp,
        payload,
      });

      const result = WebhookSignature.verify(signature, payload, secret, 300);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject an invalid signature', () => {
      const invalidSignature = 't=1234567890,v1=invalid_signature';
      
      const result = WebhookSignature.verify(invalidSignature, payload, secret);
      expect(result.valid).toBe(false);
    });

    it('should reject signature with missing timestamp', () => {
      const invalidSignature = 'v1=abc123';
      
      const result = WebhookSignature.verify(invalidSignature, payload, secret);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing timestamp');
    });

    it('should reject signatures outside tolerance window', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000 - 400).toString(); // 400 seconds ago
      const signature = WebhookSignature.generate({
        secret,
        timestamp: oldTimestamp,
        payload,
      });

      const result = WebhookSignature.verify(signature, payload, secret, 300); // 300 second tolerance
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timestamp outside tolerance');
    });

    it('should accept signatures within tolerance window', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000 - 100).toString(); // 100 seconds ago
      const signature = WebhookSignature.generate({
        secret,
        timestamp: recentTimestamp,
        payload,
      });

      const result = WebhookSignature.verify(signature, payload, secret, 300); // 300 second tolerance
      expect(result.valid).toBe(true);
    });
  });
});

describe('WebhookEventHandler', () => {
  let handler: WebhookEventHandler;

  beforeEach(() => {
    handler = new WebhookEventHandler();
  });

  it('should register and emit events', async () => {
    const mockHandler = jest.fn();
    const testEvent: WebhookEvent = {
      id: 'evt_test',
      event: 'execution.completed',
      data: { test: 'data' },
      timestamp: new Date().toISOString(),
      webhook_id: 'wh_test',
      attempt: 1,
    };

    handler.on('execution.completed', mockHandler);
    await handler.emit(testEvent);

    expect(mockHandler).toHaveBeenCalledWith(testEvent);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle wildcard events', async () => {
    const wildcardHandler = jest.fn();
    const specificHandler = jest.fn();
    
    const testEvent: WebhookEvent = {
      id: 'evt_test',
      event: 'execution.completed',
      data: { test: 'data' },
      timestamp: new Date().toISOString(),
      webhook_id: 'wh_test',
      attempt: 1,
    };

    handler.on('*', wildcardHandler);
    handler.on('execution.completed', specificHandler);
    
    await handler.emit(testEvent);

    expect(wildcardHandler).toHaveBeenCalledWith(testEvent);
    expect(specificHandler).toHaveBeenCalledWith(testEvent);
  });

  it('should remove event handlers', async () => {
    const mockHandler = jest.fn();
    const testEvent: WebhookEvent = {
      id: 'evt_test',
      event: 'execution.completed',
      data: { test: 'data' },
      timestamp: new Date().toISOString(),
      webhook_id: 'wh_test',
      attempt: 1,
    };

    handler.on('execution.completed', mockHandler);
    handler.off('execution.completed', mockHandler);
    
    await handler.emit(testEvent);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should handle async handlers', async () => {
    const asyncHandler = jest.fn().mockResolvedValue(undefined);
    const testEvent: WebhookEvent = {
      id: 'evt_test',
      event: 'execution.completed',
      data: { test: 'data' },
      timestamp: new Date().toISOString(),
      webhook_id: 'wh_test',
      attempt: 1,
    };

    handler.on('execution.completed', asyncHandler);
    await handler.emit(testEvent);

    expect(asyncHandler).toHaveBeenCalledWith(testEvent);
  });

  it('should handle errors in handlers gracefully', async () => {
    const errorHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
    const successHandler = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const testEvent: WebhookEvent = {
      id: 'evt_test',
      event: 'execution.completed',
      data: { test: 'data' },
      timestamp: new Date().toISOString(),
      webhook_id: 'wh_test',
      attempt: 1,
    };

    handler.on('execution.completed', errorHandler);
    handler.on('execution.completed', successHandler);
    
    await handler.emit(testEvent);

    expect(errorHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error in webhook handler for execution.completed:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should get registered events', () => {
    handler.on('execution.completed', () => {});
    handler.on('execution.failed', () => {});
    handler.on('*', () => {});

    const events = handler.getRegisteredEvents();
    expect(events).toContain('execution.completed');
    expect(events).toContain('execution.failed');
    expect(events).toContain('*');
  });

  it('should remove all handlers', () => {
    handler.on('execution.completed', () => {});
    handler.on('execution.failed', () => {});
    
    handler.removeAllHandlers();
    
    expect(handler.getRegisteredEvents()).toHaveLength(0);
  });
});

describe('WebhookEventFactory', () => {
  const testData = {
    execution: {
      execution_id: 'exec_123',
      status: 'completed' as const,
      input_data: {},
      output_data: { result: 'success' },
      node_results: {},
      started_at: '2023-01-01T00:00:00Z',
      completed_at: '2023-01-01T00:01:00Z',
      created_at: '2023-01-01T00:00:00Z',
    }
  };

  it('should create execution started event', () => {
    const event = WebhookEventFactory.createExecutionStartedEvent('exec_123', testData);
    
    expect(event.event).toBe('execution.started');
    expect(event.data).toBe(testData);
    expect(event.id).toMatch(/^evt_\d+_[a-z0-9]{9}$/);
    expect(event.attempt).toBe(1);
  });

  it('should create execution completed event', () => {
    const event = WebhookEventFactory.createExecutionCompletedEvent('exec_123', testData);
    
    expect(event.event).toBe('execution.completed');
    expect(event.data).toBe(testData);
  });

  it('should create execution failed event', () => {
    const event = WebhookEventFactory.createExecutionFailedEvent('exec_123', testData);
    
    expect(event.event).toBe('execution.failed');
    expect(event.data).toBe(testData);
  });

  it('should create agent registered event', () => {
    const agentData = {
      agent: {
        agent_id: 'agent_123',
        name: 'Test Agent',
        description: 'Test description',
        endpoint: 'https://api.example.com',
        capabilities: ['text-processing'],
        status: 'active' as const,
      }
    };

    const event = WebhookEventFactory.createAgentRegisteredEvent('agent_123', agentData);
    
    expect(event.event).toBe('agent.registered');
    expect(event.data).toBe(agentData);
  });

  it('should create custom events', () => {
    const customEvent = WebhookEventFactory.createCustomEvent(
      'flow.created',
      { flow: { flow_id: 'flow_123' } },
      'wh_123'
    );
    
    expect(customEvent.event).toBe('flow.created');
    expect(customEvent.webhook_id).toBe('wh_123');
    expect(customEvent.data.flow.flow_id).toBe('flow_123');
  });
});

describe('WebhookRetry', () => {
  let retry: WebhookRetry;

  beforeEach(() => {
    retry = new WebhookRetry(3, 1000);
  });

  it('should calculate retry delays with exponential backoff', () => {
    expect(retry.getRetryDelay(1)).toBe(1000);   // Base delay
    expect(retry.getRetryDelay(2)).toBe(2000);   // 2^1 * base
    expect(retry.getRetryDelay(3)).toBe(4000);   // 2^2 * base
    expect(retry.getRetryDelay(4)).toBe(8000);   // 2^3 * base
  });

  it('should cap maximum retry delay', () => {
    const longRetry = new WebhookRetry(10, 10000);
    expect(longRetry.getRetryDelay(5)).toBeLessThanOrEqual(30000);
  });

  it('should determine retry eligibility correctly', () => {
    // Should retry on server errors
    expect(retry.shouldRetry(500, 1)).toBe(true);
    expect(retry.shouldRetry(502, 2)).toBe(true);
    expect(retry.shouldRetry(503, 3)).toBe(false); // Max attempts reached

    // Should retry on specific client errors
    expect(retry.shouldRetry(408, 1)).toBe(true); // Timeout
    expect(retry.shouldRetry(429, 1)).toBe(true); // Rate limit

    // Should not retry on other client errors
    expect(retry.shouldRetry(400, 1)).toBe(false);
    expect(retry.shouldRetry(401, 1)).toBe(false);
    expect(retry.shouldRetry(404, 1)).toBe(false);

    // Should not retry on success
    expect(retry.shouldRetry(200, 1)).toBe(false);
    expect(retry.shouldRetry(204, 1)).toBe(false);
  });

  it('should calculate next retry times', () => {
    const before = Date.now();
    const nextRetry = retry.getNextRetryTime(1);
    const after = Date.now();
    
    const expectedTime = before + 1000;
    const actualTime = nextRetry.getTime();
    
    expect(actualTime).toBeGreaterThanOrEqual(expectedTime);
    expect(actualTime).toBeLessThanOrEqual(after + 1000);
  });
});