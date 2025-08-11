/**
 * AI Spine SDK Error Classes
 * 
 * Custom error classes for different types of failures
 */

import { APIError, ValidationError as ValidationErrorType } from './types';

export class AISpineError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, status?: number, details?: Record<string, any>) {
    super(message);
    this.name = 'AISpineError';
    this.code = code;
    this.status = status;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AISpineError);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
    };
  }
}

export class AuthenticationError extends AISpineError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AISpineError {
  constructor(message: string = 'Authorization failed', details?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends AISpineError {
  public readonly validationErrors: ValidationErrorType[];

  constructor(message: string, validationErrors: ValidationErrorType[] = [], details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

export class NotFoundError extends AISpineError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AISpineError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, details?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends AISpineError {
  constructor(message: string = 'Network error occurred', details?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends AISpineError {
  constructor(timeout: number, details?: Record<string, any>) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT_ERROR', 408, details);
    this.name = 'TimeoutError';
  }
}

export class ServerError extends AISpineError {
  constructor(message: string = 'Internal server error', status: number = 500, details?: Record<string, any>) {
    super(message, 'SERVER_ERROR', status, details);
    this.name = 'ServerError';
  }
}

export class ExecutionError extends AISpineError {
  public readonly executionId?: string;

  constructor(message: string, executionId?: string, details?: Record<string, any>) {
    super(message, 'EXECUTION_ERROR', undefined, details);
    this.name = 'ExecutionError';
    this.executionId = executionId;
  }
}

export class AgentError extends AISpineError {
  public readonly agentId?: string;

  constructor(message: string, agentId?: string, details?: Record<string, any>) {
    super(message, 'AGENT_ERROR', undefined, details);
    this.name = 'AgentError';
    this.agentId = agentId;
  }
}

export class FlowError extends AISpineError {
  public readonly flowId?: string;

  constructor(message: string, flowId?: string, details?: Record<string, any>) {
    super(message, 'FLOW_ERROR', undefined, details);
    this.name = 'FlowError';
    this.flowId = flowId;
  }
}

/**
 * Maps HTTP status codes to appropriate error classes
 */
export function createErrorFromResponse(
  status: number,
  data: any,
  message?: string
): AISpineError {
  const errorMessage = message || data?.message || data?.error || 'An error occurred';
  const details = data?.details;

  switch (status) {
    case 400:
      return new ValidationError(errorMessage, data?.validation_errors, details);
    case 401:
      return new AuthenticationError(errorMessage, details);
    case 403:
      return new AuthorizationError(errorMessage, details);
    case 404:
      return new NotFoundError(errorMessage);
    case 408:
      return new TimeoutError(data?.timeout || 30000, details);
    case 429:
      return new RateLimitError(errorMessage, data?.retry_after, details);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(errorMessage, status, details);
    default:
      return new AISpineError(errorMessage, 'UNKNOWN_ERROR', status, details);
  }
}

/**
 * Type guard to check if an error is an AISpineError
 */
export function isAISpineError(error: any): error is AISpineError {
  return error instanceof AISpineError;
}

/**
 * Type guard to check if an error is a specific AISpineError subclass
 */
export function isErrorOfType<T extends AISpineError>(
  error: any,
  ErrorClass: new (...args: any[]) => T
): error is T {
  return error instanceof ErrorClass;
}