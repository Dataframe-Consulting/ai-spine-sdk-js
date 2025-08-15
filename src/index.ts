/**
 * AI Spine JavaScript SDK
 * 
 * The official JavaScript SDK for AI Spine - The Stripe for AI Agent Orchestration
 * 
 * @example
 * ```typescript
 * import { AISpine } from '@ai-spine/sdk';
 * 
 * const spine = new AISpine('sk_test_your_api_key_here');
 * 
 * // Execute a flow
 * const result = await spine.executeFlow('customer-support', {
 *   message: 'I need help with my order'
 * });
 * 
 * // Wait for completion
 * const execution = await spine.waitForExecution(result.execution_id);
 * console.log('Result:', execution.output_data);
 * ```
 */

// Main SDK class
export { AISpine } from './spine';

// Type exports
export type {
  // Configuration
  AISpineConfig,
  RequestOptions,
  
  // User management
  UserInfo,
  APIKeyInfo,
  ApiKeyStatus, // Deprecated
  ApiKeyGenerateResponse, // Deprecated
  ApiKeyRevokeResponse, // Deprecated
  
  // Secure user account types (NEW in v2.4.0)
  UserProfile,
  UserApiKeyStatus,
  UserApiKeyGenerateResponse,
  
  // Core entities
  Agent,
  AgentConfig,
  Flow,
  FlowNode,
  FlowExecutionRequest,
  ExecutionContext,
  ExecutionResponse,
  NodeExecutionResult,
  AgentMessage,
  Metrics,
  HealthCheck,
  
  // Environment variables (NEW in v2.1.0)
  AgentEnvironmentField,
  AgentEnvironmentSchema,
  AgentExecutionRequest,
  AgentExecutionResponse,
  ValidationResult,
  
  // Batch processing
  BatchRequest,
  BatchResponse,
  BatchOptions,
  
  // Streaming (future)
  StreamOptions,
  StreamProgress,
  
  // Templates (future)
  Template,
  
  // Webhooks
  WebhookConfig,
  WebhookEvent,
  WebhookEventType,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookEventData,
  WebhookSignatureOptions,
  WebhookVerificationResult,
  
  // Validation
  ValidationError as ValidationErrorType,
  APIError,
  
  // SDK responses
  SDKResponse,
} from './types';

// Error exports
export {
  AISpineError,
  AuthenticationError,
  AuthorizationError,
  InsufficientCreditsError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ServerError,
  ExecutionError,
  AgentError,
  FlowError,
  createErrorFromResponse,
  isAISpineError,
  isErrorOfType,
} from './errors';

// Utility exports
export {
  validateApiKey,
  validateFlowId,
  validateExecutionId,
  validateAgentId,
  validateUrl,
  validateFlowInput,
  validateAgentConfig,
  throwIfValidationErrors,
  sanitizeInput,
  delay,
  formatDuration,
  formatTimestamp,
  isExecutionComplete,
  isExecutionRunning,
  deepClone,
  deepMerge,
} from './utils';

// Webhook utilities
export {
  WebhookSignature,
  WebhookEventHandler,
  WebhookEventFactory,
  WebhookRetry,
  createWebhookMiddleware,
} from './webhooks';

// Version
export const VERSION = '2.4.1';

// Default export for convenience
import { AISpine as DefaultExport } from './spine';
export default DefaultExport;