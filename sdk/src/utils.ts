/**
 * AI Spine SDK Utilities
 * 
 * Helper functions and utilities for the SDK
 */

import { ValidationError as ValidationErrorType } from './types';
import { ValidationError } from './errors';

/**
 * Validates an API key format
 */
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // API keys should start with 'sk_' and be at least 20 characters
  return apiKey.startsWith('sk_') && apiKey.length >= 20;
}

/**
 * Validates a flow ID format
 */
export function validateFlowId(flowId: string): boolean {
  if (!flowId || typeof flowId !== 'string') {
    return false;
  }
  
  // Flow IDs should be alphanumeric with underscores/hyphens, 1-100 chars
  return /^[a-zA-Z0-9_-]{1,100}$/.test(flowId);
}

/**
 * Validates an execution ID format
 */
export function validateExecutionId(executionId: string): boolean {
  if (!executionId || typeof executionId !== 'string') {
    return false;
  }
  
  // Execution IDs can be UUIDs or custom format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const customRegex = /^[a-zA-Z0-9_-]+$/;
  
  return uuidRegex.test(executionId) || customRegex.test(executionId);
}

/**
 * Validates an agent ID format
 */
export function validateAgentId(agentId: string): boolean {
  if (!agentId || typeof agentId !== 'string') {
    return false;
  }
  
  // Agent IDs should be alphanumeric with underscores/hyphens, 1-100 chars
  return /^[a-zA-Z0-9_-]{1,100}$/.test(agentId);
}

/**
 * Validates a URL format
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates input data for flow execution
 */
export function validateFlowInput(input: any): ValidationErrorType[] {
  const errors: ValidationErrorType[] = [];
  
  if (!input) {
    errors.push({
      field: 'input',
      message: 'Input data is required',
      value: input,
    });
    return errors;
  }
  
  if (typeof input !== 'object' || Array.isArray(input)) {
    errors.push({
      field: 'input',
      message: 'Input must be an object',
      value: input,
    });
  }
  
  return errors;
}

/**
 * Validates agent configuration
 */
export function validateAgentConfig(config: any): ValidationErrorType[] {
  const errors: ValidationErrorType[] = [];
  
  if (!config) {
    errors.push({
      field: 'config',
      message: 'Agent configuration is required',
      value: config,
    });
    return errors;
  }
  
  // Required fields
  const requiredFields = ['agent_id', 'name', 'description', 'endpoint', 'capabilities'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      errors.push({
        field,
        message: `${field} is required`,
        value: config[field],
      });
    }
  }
  
  // Validate specific fields
  if (config.agent_id && !validateAgentId(config.agent_id)) {
    errors.push({
      field: 'agent_id',
      message: 'Invalid agent ID format',
      value: config.agent_id,
    });
  }
  
  if (config.endpoint && !validateUrl(config.endpoint)) {
    errors.push({
      field: 'endpoint',
      message: 'Invalid endpoint URL',
      value: config.endpoint,
    });
  }
  
  if (config.capabilities && !Array.isArray(config.capabilities)) {
    errors.push({
      field: 'capabilities',
      message: 'Capabilities must be an array',
      value: config.capabilities,
    });
  }
  
  return errors;
}

/**
 * Throws a ValidationError if there are validation errors
 */
export function throwIfValidationErrors(errors: ValidationErrorType[], message: string = 'Validation failed'): void {
  if (errors.length > 0) {
    throw new ValidationError(message, errors);
  }
}

/**
 * Sanitizes input data by removing undefined values and functions
 */
export function sanitizeInput(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }
  
  if (typeof input === 'function') {
    return undefined;
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput).filter(item => item !== undefined);
  }
  
  if (typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedValue = sanitizeInput(value);
      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Creates a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formats execution duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Formats timestamp in ISO string or human-readable format
 */
export function formatTimestamp(timestamp: string | Date, humanReadable: boolean = false): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (humanReadable) {
    return date.toLocaleString();
  }
  
  return date.toISOString();
}

/**
 * Checks if an execution is in a final state
 */
export function isExecutionComplete(status: string): boolean {
  return status === 'completed' || status === 'failed';
}

/**
 * Checks if an execution is in a running state
 */
export function isExecutionRunning(status: string): boolean {
  return status === 'running' || status === 'pending';
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  
  return result;
}