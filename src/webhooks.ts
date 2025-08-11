/**
 * AI Spine SDK Webhook Utilities
 * 
 * Utilities for webhook signature verification and event handling
 */

import * as crypto from 'crypto';
import { 
  WebhookEvent, 
  WebhookSignatureOptions, 
  WebhookVerificationResult,
  WebhookEventType,
  WebhookEventData
} from './types';

/**
 * Webhook signature verification utility
 * Verifies webhook signatures using HMAC-SHA256
 */
export class WebhookSignature {
  /**
   * Generate a webhook signature for a payload
   */
  static generate(options: WebhookSignatureOptions): string {
    const { secret, timestamp, payload } = options;
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Verify a webhook signature
   */
  static verify(
    receivedSignature: string,
    payload: string,
    secret: string,
    tolerance: number = 300 // 5 minutes in seconds
  ): WebhookVerificationResult {
    try {
      const elements = receivedSignature.split(',');
      let timestamp: string | undefined;
      const signatures: string[] = [];

      for (const element of elements) {
        const [key, value] = element.split('=');
        if (key === 't') {
          timestamp = value;
        } else if (key === 'v1') {
          signatures.push(value);
        }
      }

      if (!timestamp) {
        return { valid: false, error: 'Missing timestamp in signature' };
      }

      // Check timestamp tolerance
      const timestampMs = parseInt(timestamp, 10) * 1000;
      const now = Date.now();
      if (now - timestampMs > tolerance * 1000) {
        return { valid: false, error: 'Timestamp outside tolerance window' };
      }

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${payload}`, 'utf8')
        .digest('hex');

      // Compare signatures using constant-time comparison
      const isValid = signatures.some(signature => 
        crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        )
      );

      return { valid: isValid };
    } catch (error) {
      return { 
        valid: false, 
        error: `Signature verification failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}

/**
 * Webhook event handler utility
 */
export class WebhookEventHandler {
  private handlers: Map<WebhookEventType, Set<(event: WebhookEvent) => void | Promise<void>>> = new Map();

  /**
   * Register an event handler
   */
  on(eventType: WebhookEventType, handler: (event: WebhookEvent) => void | Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Remove an event handler
   */
  off(eventType: WebhookEventType, handler: (event: WebhookEvent) => void | Promise<void>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: WebhookEvent): Promise<void> {
    // Handle specific event handlers
    const specificHandlers = this.handlers.get(event.event);
    if (specificHandlers) {
      await Promise.all(
        Array.from(specificHandlers).map(handler => 
          Promise.resolve(handler(event)).catch(error => 
            console.error(`Error in webhook handler for ${event.event}:`, error)
          )
        )
      );
    }

    // Handle wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      await Promise.all(
        Array.from(wildcardHandlers).map(handler => 
          Promise.resolve(handler(event)).catch(error => 
            console.error(`Error in wildcard webhook handler:`, error)
          )
        )
      );
    }
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): WebhookEventType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Remove all handlers
   */
  removeAllHandlers(): void {
    this.handlers.clear();
  }
}

/**
 * Express.js middleware for webhook verification
 */
export function createWebhookMiddleware(secret: string, tolerance: number = 300) {
  return (req: any, res: any, next: any) => {
    const signature = req.headers['x-ai-spine-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature' });
    }

    const payload = req.body;
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const verification = WebhookSignature.verify(signature, payloadString, secret, tolerance);
    if (!verification.valid) {
      return res.status(401).json({ error: verification.error || 'Invalid signature' });
    }

    next();
  };
}

/**
 * Webhook event factory for creating typed events
 */
export class WebhookEventFactory {
  static createExecutionStartedEvent(executionId: string, data: WebhookEventData): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: 'execution.started',
      data,
      timestamp: new Date().toISOString(),
      webhook_id: '',
      attempt: 1
    };
  }

  static createExecutionCompletedEvent(executionId: string, data: WebhookEventData): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: 'execution.completed',
      data,
      timestamp: new Date().toISOString(),
      webhook_id: '',
      attempt: 1
    };
  }

  static createExecutionFailedEvent(executionId: string, data: WebhookEventData): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: 'execution.failed',
      data,
      timestamp: new Date().toISOString(),
      webhook_id: '',
      attempt: 1
    };
  }

  static createAgentRegisteredEvent(agentId: string, data: WebhookEventData): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: 'agent.registered',
      data,
      timestamp: new Date().toISOString(),
      webhook_id: '',
      attempt: 1
    };
  }

  static createCustomEvent(
    eventType: WebhookEventType,
    data: WebhookEventData,
    webhookId: string = ''
  ): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
      webhook_id: webhookId,
      attempt: 1
    };
  }
}

/**
 * Webhook retry utility with exponential backoff
 */
export class WebhookRetry {
  private maxRetries: number;
  private baseDelay: number;

  constructor(maxRetries: number = 3, baseDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(attempt: number): number {
    return Math.min(this.baseDelay * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
  }

  /**
   * Determine if should retry based on HTTP status
   */
  shouldRetry(status: number, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false;
    
    // Retry on server errors (5xx) and specific client errors
    return (
      status >= 500 || // Server errors
      status === 408 || // Request timeout
      status === 429    // Rate limited
    );
  }

  /**
   * Calculate next retry time
   */
  getNextRetryTime(attempt: number): Date {
    const delay = this.getRetryDelay(attempt);
    return new Date(Date.now() + delay);
  }
}