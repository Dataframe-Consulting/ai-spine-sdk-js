/**
 * AI Spine SDK Types
 * 
 * Type definitions for the AI Spine JavaScript SDK
 */

// Configuration Types
export interface AISpineConfig {
  /** API key for authentication (required - get from https://ai-spine.com/dashboard) */
  apiKey: string;
  /** Base URL for the AI Spine API */
  baseURL?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  retries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Callback when credits are low */
  onCreditsLow?: (credits: number) => void;
}

// User Account Types
export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  credits: number;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  created_at: string;
  updated_at: string;
  api_keys?: APIKeyInfo[];
}

export interface APIKeyInfo {
  id: string;
  key: string;
  name?: string;
  created_at: string;
  last_used?: string;
  active: boolean;
}

// Environment Variable Types
export interface AgentEnvironmentField {
  /** Field type for validation and UI rendering */
  type: 'string' | 'number' | 'boolean' | 'password';
  /** Human-readable description of this field */
  description: string;
  /** Whether this field is required for the agent to function */
  required: boolean;
  /** Default value if not provided */
  default_value?: any;
  /** Whether this field contains sensitive data (passwords, API keys) */
  sensitive?: boolean;
}

export interface AgentEnvironmentSchema {
  [fieldName: string]: AgentEnvironmentField;
}

// Core Entity Types
export interface Agent {
  agent_id: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  type?: string;
  status: 'active' | 'inactive' | 'error';
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
  /** Schema defining environment variables this agent requires */
  environment_schema?: AgentEnvironmentSchema;
}

export interface AgentConfig {
  agent_id: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  type?: string;
  /** Schema defining environment variables this agent requires */
  environment_schema?: AgentEnvironmentSchema;
}

export interface FlowNode {
  id: string;
  agent_id?: string;
  type: 'input' | 'processor' | 'output';
  depends_on?: string[];
  config?: Record<string, any> & {
    system_prompt?: string;
    timeout?: number;
    max_turns?: number;
    /** Environment variables specific to this node execution */
    environment?: Record<string, string | number | boolean>;
  };
}

export interface Flow {
  flow_id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  entry_point?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface FlowExecutionRequest {
  flow_id: string;
  input_data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface NodeExecutionResult {
  node_id: string;
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration?: number;
}

export interface ExecutionContext {
  execution_id: string;
  flow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  node_results: Record<string, NodeExecutionResult>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ExecutionResponse {
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

export interface AgentMessage {
  message_id: string;
  execution_id: string;
  from_agent: string;
  to_agent: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface Metrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_execution_time: number;
  total_execution_time: number;
  last_execution?: string;
}

// SDK Response Types
export interface SDKResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// Error Types
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Request Options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Streaming Types
export interface StreamOptions {
  onProgress?: (progress: StreamProgress) => void;
  onData?: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: any) => void;
}

export interface StreamProgress {
  percentage: number;
  message?: string;
  data?: any;
}

// Template Types (for future marketplace feature)
export interface Template {
  template_id: string;
  name: string;
  description: string;
  flow: Flow;
  tags: string[];
  author: string;
  version: string;
  downloads: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

// Batch Processing Types
export interface BatchRequest<T = any> {
  id: string;
  input: T;
  metadata?: Record<string, any>;
}

export interface BatchResponse<T = any> {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  result?: T;
  error?: string;
}

export interface BatchOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
  onItemComplete?: (result: BatchResponse) => void;
}

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  version: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  timestamp: string;
}

// Webhook Types
export interface WebhookConfig {
  webhook_id?: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type WebhookEventType = 
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.node.completed'
  | 'execution.node.failed'
  | 'agent.registered'
  | 'agent.updated'
  | 'agent.removed'
  | 'flow.created'
  | 'flow.updated'
  | 'flow.deleted'
  | 'system.health.changed'
  | '*'; // All events

export interface WebhookEvent {
  id: string;
  event: WebhookEventType;
  data: any;
  timestamp: string;
  webhook_id: string;
  signature?: string;
  attempt: number;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string;
  url: string;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  response_status?: number;
  response_body?: string;
  error_message?: string;
  attempts: number;
  next_retry_at?: string;
  created_at: string;
  delivered_at?: string;
}

export interface WebhookEndpoint {
  webhook_id: string;
  url: string;
  events: WebhookEventType[];
  active: boolean;
  secret: string;
  headers: Record<string, string>;
  created_at: string;
  updated_at: string;
  last_delivery?: WebhookDelivery;
  success_count: number;
  failure_count: number;
}

// Environment Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: 'required' | 'invalid_type' | 'invalid_value' | 'missing_schema';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Agent Execution Types
export interface AgentExecutionRequest {
  input: Record<string, any>;
  config?: {
    system_prompt?: string;
    timeout?: number;
    max_turns?: number;
    environment?: Record<string, string | number | boolean>;
  };
  metadata?: Record<string, any>;
}

export interface AgentExecutionResponse {
  output: Record<string, any>;
  metadata?: Record<string, any>;
  execution_time?: number;
  status: 'success' | 'error';
  error_message?: string;
}

export interface WebhookEventData {
  execution?: ExecutionContext;
  agent?: Agent;
  flow?: Flow;
  health?: HealthCheck;
  [key: string]: any;
}

export interface WebhookSignatureOptions {
  secret: string;
  timestamp: string;
  payload: string;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}