/**
 * AI Spine SDK Main Class
 * 
 * The main SDK class that provides all functionality for interacting with AI Spine
 */

import { AISpineClient } from './client';
import {
  AISpineConfig,
  Agent,
  AgentConfig,
  Flow,
  FlowDefinition,
  FlowCreateRequest,
  FlowUpdateRequest,
  MyFlowsResponse,
  FlowDeleteResponse,
  FlowExecutionRequest,
  ExecutionContext,
  ExecutionResponse,
  Metrics,
  HealthCheck,
  RequestOptions,
  BatchRequest,
  BatchResponse,
  BatchOptions,
  WebhookConfig,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookEventType,
  AgentEnvironmentField,
  AgentEnvironmentSchema,
  ValidationResult,
  ValidationError as ValidationErrorType,
  AgentExecutionRequest,
  AgentExecutionResponse,
  UserInfo,
} from './types';
import {
  validateApiKey,
  validateFlowId,
  validateExecutionId,
  validateAgentId,
  validateFlowInput,
  validateAgentConfig,
  throwIfValidationErrors,
  sanitizeInput,
  delay,
  isExecutionComplete,
} from './utils';
import { AISpineError, ValidationError } from './errors';
import { WebhookEventHandler } from './webhooks';

export class AISpine {
  private readonly client: AISpineClient;
  private readonly webhookHandler: WebhookEventHandler;

  constructor(config: string | AISpineConfig) {
    // Allow string API key as shorthand for backward compatibility
    const finalConfig: AISpineConfig = typeof config === 'string' 
      ? { apiKey: config }
      : config;

    // API key is optional when using Supabase token for user account methods
    if (!finalConfig.apiKey && !finalConfig.supabaseToken) {
      finalConfig.apiKey = 'sk_no_auth_required';
      console.warn('No API key or Supabase token provided. Limited functionality available.');
    } else if (!finalConfig.apiKey && finalConfig.supabaseToken) {
      // Has Supabase token but no API key - set dummy key for compatibility
      finalConfig.apiKey = 'sk_no_auth_required';
    } else if (finalConfig.apiKey && finalConfig.apiKey !== 'sk_no_auth_required' && !finalConfig.apiKey.startsWith('sk_')) {
      console.warn('API key should start with "sk_". Make sure you\'re using a valid user key.');
    }

    this.client = new AISpineClient(finalConfig);
    this.webhookHandler = new WebhookEventHandler();
  }

  // Flow Execution Methods

  /**
   * Execute a flow with the given input data
   * 
   * @param flowId - The ID of the flow to execute
   * @param input - Input data for the flow
   * @param options - Request options
   * @returns Promise resolving to execution response
   * 
   * @example
   * ```typescript
   * const result = await spine.executeFlow('customer-support', {
   *   message: 'I need help with my order'
   * });
   * console.log('Execution ID:', result.execution_id);
   * ```
   */
  public async executeFlow(
    flowId: string,
    input: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<ExecutionResponse> {
    // Validate inputs
    const errors: ValidationErrorType[] = [];
    
    if (!validateFlowId(flowId)) {
      errors.push({
        field: 'flowId',
        message: 'Invalid flow ID format',
        code: 'invalid_value',
        value: flowId,
      });
    }
    
    errors.push(...validateFlowInput(input));
    throwIfValidationErrors(errors, 'Flow execution validation failed');

    // Sanitize input
    const sanitizedInput = sanitizeInput(input);
    
    const request: FlowExecutionRequest = {
      flow_id: flowId,
      input_data: sanitizedInput,
    };

    const response = await this.client.post<ExecutionResponse>('/api/v1/flows/execute', request, options);
    return response.data;
  }

  /**
   * Get the status and result of an execution
   * 
   * @param executionId - The execution ID
   * @param options - Request options
   * @returns Promise resolving to execution context
   * 
   * @example
   * ```typescript
   * const execution = await spine.getExecution('exec-123');
   * console.log('Status:', execution.status);
   * console.log('Result:', execution.output_data);
   * ```
   */
  public async getExecution(
    executionId: string,
    options: RequestOptions = {}
  ): Promise<ExecutionContext> {
    if (!validateExecutionId(executionId)) {
      throw new ValidationError('Invalid execution ID format');
    }

    const response = await this.client.get<ExecutionContext>(`/api/v1/executions/${executionId}`, undefined, options);
    return response.data;
  }

  /**
   * Wait for an execution to complete
   * 
   * @param executionId - The execution ID
   * @param options - Polling options
   * @returns Promise resolving to completed execution
   * 
   * @example
   * ```typescript
   * const result = await spine.waitForExecution('exec-123', {
   *   timeout: 60000, // 1 minute
   *   interval: 2000  // Poll every 2 seconds
   * });
   * ```
   */
  public async waitForExecution(
    executionId: string,
    options: {
      timeout?: number;
      interval?: number;
      onProgress?: (execution: ExecutionContext) => void;
    } & RequestOptions = {}
  ): Promise<ExecutionContext> {
    const timeout = options.timeout || 300000; // 5 minutes default
    const interval = options.interval || 2000; // 2 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const execution = await this.getExecution(executionId, options);
      
      if (options.onProgress) {
        options.onProgress(execution);
      }

      if (isExecutionComplete(execution.status)) {
        return execution;
      }

      await delay(interval);
    }

    throw new AISpineError(
      `Execution ${executionId} did not complete within ${timeout}ms`,
      'EXECUTION_TIMEOUT',
      408,
      { executionId, timeout }
    );
  }

  // Flow Management Methods

  /**
   * List all available flows
   * 
   * @param options - Request options
   * @returns Promise resolving to array of flows
   * 
   * @example
   * ```typescript
   * const flows = await spine.listFlows();
   * flows.forEach(flow => {
   *   console.log(`${flow.name}: ${flow.description}`);
   * });
   * ```
   */
  public async listFlows(options: RequestOptions = {}): Promise<Flow[]> {
    const response = await this.client.get<Flow[]>('/api/v1/flows', undefined, options);
    return response.data;
  }

  /**
   * Get a specific flow by ID
   * 
   * @param flowId - The flow ID
   * @param options - Request options
   * @returns Promise resolving to flow details
   */
  public async getFlow(flowId: string, options: RequestOptions = {}): Promise<Flow> {
    if (!validateFlowId(flowId)) {
      throw new ValidationError('Invalid flow ID format');
    }

    const response = await this.client.get<Flow>(`/api/v1/flows/${flowId}`, undefined, options);
    return response.data;
  }

  // Agent Management Methods

  /**
   * List all registered agents
   * 
   * @param options - Request options
   * @returns Promise resolving to array of agents
   * 
   * @example
   * ```typescript
   * const agents = await spine.listAgents();
   * agents.forEach(agent => {
   *   console.log(`${agent.name} (${agent.status}): ${agent.capabilities.join(', ')}`);
   * });
   * ```
   */
  public async listAgents(options: RequestOptions = {}): Promise<Agent[]> {
    const response = await this.client.get<Agent[]>('/api/v1/agents', undefined, options);
    return response.data;
  }

  /**
   * Get a specific agent by ID
   * 
   * @param agentId - The agent ID
   * @param options - Request options
   * @returns Promise resolving to agent details
   */
  public async getAgent(agentId: string, options: RequestOptions = {}): Promise<Agent> {
    if (!validateAgentId(agentId)) {
      throw new ValidationError('Invalid agent ID format');
    }

    const response = await this.client.get<Agent>(`/api/v1/agents/${agentId}`, undefined, options);
    return response.data;
  }

  /**
   * Register a new agent
   * 
   * @param config - Agent configuration
   * @param options - Request options
   * @returns Promise resolving to registered agent
   * 
   * @example
   * ```typescript
   * const agent = await spine.registerAgent({
   *   agent_id: 'my-custom-agent',
   *   name: 'My Custom Agent',
   *   description: 'A custom AI agent for specific tasks',
   *   endpoint: 'https://my-agent.example.com/api',
   *   capabilities: ['text-processing', 'data-analysis'],
   *   agent_type: 'processor', // 'input' | 'processor' | 'output' | 'custom'
   *   is_active: true
   * });
   * ```
   */
  public async registerAgent(config: AgentConfig, options: RequestOptions = {}): Promise<Agent> {
    const errors = validateAgentConfig(config);
    throwIfValidationErrors(errors, 'Agent registration validation failed');

    // Ensure agent_type is included with a default value
    const payload = {
      ...sanitizeInput(config),
      agent_type: config.agent_type || 'custom',
      is_active: config.is_active ?? true
    };

    const response = await this.client.post<Agent>('/api/v1/agents', payload, options);
    return response.data;
  }

  /**
   * Test connection to an agent
   * 
   * @param endpoint - Agent endpoint URL
   * @param options - Request options
   * @returns Promise resolving to connection test result
   */
  public async testAgent(endpoint: string, options: RequestOptions = {}): Promise<{ connected: boolean; message?: string }> {
    const response = await this.client.post<{ connected: boolean; message?: string }>(
      '/api/v1/agents/test',
      { endpoint },
      options
    );
    return response.data;
  }

  // Execution Management Methods

  /**
   * List all executions with optional filtering
   * 
   * @param filters - Optional filters
   * @param options - Request options
   * @returns Promise resolving to array of executions
   */
  public async listExecutions(
    filters: {
      flow_id?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {},
    options: RequestOptions = {}
  ): Promise<ExecutionContext[]> {
    const response = await this.client.get<ExecutionContext[]>('/api/v1/executions', filters, options);
    return response.data;
  }

  // Batch Processing Methods

  /**
   * Execute multiple flows in batch
   * 
   * @param requests - Array of batch requests
   * @param options - Batch options
   * @returns Promise resolving to batch results
   * 
   * @example
   * ```typescript
   * const results = await spine.executeBatch([
   *   { id: '1', flowId: 'text-analysis', input: { text: 'Hello world' } },
   *   { id: '2', flowId: 'text-analysis', input: { text: 'Goodbye world' } }
   * ], {
   *   concurrency: 2,
   *   onProgress: (completed, total) => console.log(`${completed}/${total} completed`)
   * });
   * ```
   */
  public async executeBatch(
    requests: Array<{ id: string; flowId: string; input: Record<string, any> }>,
    options: BatchOptions = {}
  ): Promise<BatchResponse[]> {
    const concurrency = options.concurrency || 5;
    const results: BatchResponse[] = [];
    let completed = 0;

    const executeRequest = async (request: { id: string; flowId: string; input: Record<string, any> }): Promise<BatchResponse> => {
      try {
        const executionResponse = await this.executeFlow(request.flowId, request.input);
        const execution = await this.waitForExecution(executionResponse.execution_id);
        
        const result: BatchResponse = {
          id: request.id,
          status: execution.status as 'completed' | 'failed',
          result: execution.output_data,
          error: execution.error_message,
        };

        completed++;
        if (options.onProgress) {
          options.onProgress(completed, requests.length);
        }
        if (options.onItemComplete) {
          options.onItemComplete(result);
        }

        return result;
      } catch (error) {
        const result: BatchResponse = {
          id: request.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        completed++;
        if (options.onProgress) {
          options.onProgress(completed, requests.length);
        }
        if (options.onItemComplete) {
          options.onItemComplete(result);
        }

        return result;
      }
    };

    // Process requests with concurrency limit
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(executeRequest));
      results.push(...batchResults);
    }

    return results;
  }

  // System Methods

  /**
   * Get system metrics
   * 
   * @param options - Request options
   * @returns Promise resolving to system metrics
   */
  public async getMetrics(options: RequestOptions = {}): Promise<Metrics> {
    const response = await this.client.get<Metrics>('/metrics', undefined, options);
    return response.data;
  }

  /**
   * Check system health
   * 
   * @param options - Request options
   * @returns Promise resolving to health status
   */
  public async healthCheck(options: RequestOptions = {}): Promise<HealthCheck> {
    const response = await this.client.get<HealthCheck>('/health', undefined, options);
    return response.data;
  }

  // Utility Methods

  /**
   * Get current SDK configuration
   */
  public getConfig(): AISpineConfig & { apiKey: string } {
    return this.client.getConfig();
  }

  /**
   * Update SDK configuration
   */
  public updateConfig(updates: Partial<AISpineConfig>): void {
    this.client.updateConfig(updates);
  }

  // Webhook Methods

  /**
   * Create a new webhook endpoint
   * 
   * @param config - Webhook configuration
   * @param options - Request options
   * @returns Promise resolving to webhook endpoint
   * 
   * @example
   * ```typescript
   * const webhook = await spine.createWebhook({
   *   url: 'https://api.example.com/webhooks',
   *   events: ['execution.completed', 'execution.failed'],
   *   secret: 'your-webhook-secret'
   * });
   * ```
   */
  public async createWebhook(config: WebhookConfig, options: RequestOptions = {}): Promise<WebhookEndpoint> {
    // Validate webhook configuration
    if (!config.url) {
      throw new ValidationError('Webhook URL is required');
    }
    
    if (!config.events || config.events.length === 0) {
      throw new ValidationError('At least one event type is required');
    }

    try {
      new URL(config.url);
    } catch {
      throw new ValidationError('Invalid webhook URL format');
    }

    const response = await this.client.post<WebhookEndpoint>('/webhooks', config, options);
    return response.data;
  }

  /**
   * List all webhook endpoints
   * 
   * @param options - Request options
   * @returns Promise resolving to array of webhook endpoints
   */
  public async listWebhooks(options: RequestOptions = {}): Promise<WebhookEndpoint[]> {
    const response = await this.client.get<WebhookEndpoint[]>('/webhooks', undefined, options);
    return response.data;
  }

  /**
   * Get a specific webhook endpoint
   * 
   * @param webhookId - The webhook ID
   * @param options - Request options
   * @returns Promise resolving to webhook endpoint
   */
  public async getWebhook(webhookId: string, options: RequestOptions = {}): Promise<WebhookEndpoint> {
    if (!webhookId) {
      throw new ValidationError('Webhook ID is required');
    }

    const response = await this.client.get<WebhookEndpoint>(`/webhooks/${webhookId}`, undefined, options);
    return response.data;
  }

  /**
   * Update a webhook endpoint
   * 
   * @param webhookId - The webhook ID
   * @param updates - Updates to apply
   * @param options - Request options
   * @returns Promise resolving to updated webhook endpoint
   */
  public async updateWebhook(
    webhookId: string, 
    updates: Partial<WebhookConfig>, 
    options: RequestOptions = {}
  ): Promise<WebhookEndpoint> {
    if (!webhookId) {
      throw new ValidationError('Webhook ID is required');
    }

    if (updates.url) {
      try {
        new URL(updates.url);
      } catch {
        throw new ValidationError('Invalid webhook URL format');
      }
    }

    const response = await this.client.put<WebhookEndpoint>(`/webhooks/${webhookId}`, updates, options);
    return response.data;
  }

  /**
   * Delete a webhook endpoint
   * 
   * @param webhookId - The webhook ID
   * @param options - Request options
   * @returns Promise resolving when webhook is deleted
   */
  public async deleteWebhook(webhookId: string, options: RequestOptions = {}): Promise<void> {
    if (!webhookId) {
      throw new ValidationError('Webhook ID is required');
    }

    await this.client.delete(`/webhooks/${webhookId}`, options);
  }

  /**
   * Test a webhook endpoint by sending a test event
   * 
   * @param webhookId - The webhook ID
   * @param eventType - Type of test event to send
   * @param options - Request options
   * @returns Promise resolving to delivery result
   */
  public async testWebhook(
    webhookId: string, 
    eventType: WebhookEventType = 'execution.completed', 
    options: RequestOptions = {}
  ): Promise<WebhookDelivery> {
    if (!webhookId) {
      throw new ValidationError('Webhook ID is required');
    }

    const response = await this.client.post<WebhookDelivery>(
      `/webhooks/${webhookId}/test`,
      { event_type: eventType },
      options
    );
    return response.data;
  }

  /**
   * Get webhook delivery history
   * 
   * @param webhookId - The webhook ID
   * @param options - Request options
   * @returns Promise resolving to array of webhook deliveries
   */
  public async getWebhookDeliveries(
    webhookId: string, 
    options: RequestOptions = {}
  ): Promise<WebhookDelivery[]> {
    if (!webhookId) {
      throw new ValidationError('Webhook ID is required');
    }

    const response = await this.client.get<WebhookDelivery[]>(`/webhooks/${webhookId}/deliveries`, undefined, options);
    return response.data;
  }

  /**
   * Retry a failed webhook delivery
   * 
   * @param webhookId - The webhook ID
   * @param deliveryId - The delivery ID to retry
   * @param options - Request options
   * @returns Promise resolving to new delivery attempt
   */
  public async retryWebhookDelivery(
    webhookId: string, 
    deliveryId: string, 
    options: RequestOptions = {}
  ): Promise<WebhookDelivery> {
    if (!webhookId) {
      throw new ValidationError('Webhook ID is required');
    }
    if (!deliveryId) {
      throw new ValidationError('Delivery ID is required');
    }

    const response = await this.client.post<WebhookDelivery>(
      `/webhooks/${webhookId}/deliveries/${deliveryId}/retry`,
      {},
      options
    );
    return response.data;
  }

  // Environment Validation Methods

  /**
   * Validate environment variables against an agent's schema
   * 
   * @param agentId - The agent ID to validate against
   * @param environment - Environment variables to validate
   * @param options - Request options
   * @returns Promise resolving to validation result
   * 
   * @example
   * ```typescript
   * const result = await spine.validateAgentEnvironment('restaurant_agent', {
   *   opentable_api_key: 'sk_live_...',
   *   opentable_partner_id: 'partner_123'
   * });
   * 
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  public async validateAgentEnvironment(
    agentId: string,
    environment: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<ValidationResult> {
    if (!validateAgentId(agentId)) {
      throw new ValidationError('Invalid agent ID format');
    }

    try {
      // Get agent schema first
      const agent = await this.getAgent(agentId, options);
      
      if (!agent.environment_schema) {
        return {
          valid: true,
          errors: []
        };
      }

      // Perform validation
      return this.validateEnvironmentAgainstSchema(environment, agent.environment_schema);
    } catch (error) {
      if (error instanceof AISpineError) {
        throw error;
      }
      throw new AISpineError('Environment validation failed', 'validation_error', undefined, { error });
    }
  }

  /**
   * Get environment schema for an agent
   * 
   * @param agentId - The agent ID
   * @param options - Request options
   * @returns Promise resolving to environment schema
   * 
   * @example
   * ```typescript
   * const schema = await spine.getAgentEnvironmentSchema('restaurant_agent');
   * console.log('Required fields:', Object.keys(schema));
   * ```
   */
  public async getAgentEnvironmentSchema(
    agentId: string,
    options: RequestOptions = {}
  ): Promise<AgentEnvironmentSchema> {
    if (!validateAgentId(agentId)) {
      throw new ValidationError('Invalid agent ID format');
    }

    try {
      const agent = await this.getAgent(agentId, options);
      return agent.environment_schema || {};
    } catch (error) {
      if (error instanceof AISpineError) {
        throw error;
      }
      throw new AISpineError('Failed to get agent environment schema', 'api_error', undefined, { error });
    }
  }

  /**
   * Validate environment variables against a schema (client-side)
   * 
   * @param environment - Environment variables to validate
   * @param schema - Environment schema to validate against
   * @returns Validation result
   */
  private validateEnvironmentAgainstSchema(
    environment: Record<string, any>,
    schema: AgentEnvironmentSchema
  ): ValidationResult {
    const errors: ValidationErrorType[] = [];

    // Check required fields
    for (const [fieldName, fieldConfig] of Object.entries(schema)) {
      const value = environment[fieldName];

      // Check if required field is missing
      if (fieldConfig.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          code: 'required'
        });
        continue;
      }

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const expectedType = fieldConfig.type === 'password' ? 'string' : fieldConfig.type;
      const actualType = typeof value;

      if (expectedType === 'number' && actualType !== 'number') {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a number`,
          code: 'invalid_type'
        });
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a boolean`,
          code: 'invalid_type'
        });
      } else if (expectedType === 'string' && actualType !== 'string') {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be a string`,
          code: 'invalid_type'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Webhook Event Handler Methods

  /**
   * Register a webhook event handler
   * 
   * @param eventType - The event type to listen for
   * @param handler - The handler function
   * 
   * @example
   * ```typescript
   * spine.onWebhook('execution.completed', (event) => {
   *   console.log('Execution completed:', event.data.execution);
   * });
   * ```
   */
  public onWebhook(
    eventType: WebhookEventType, 
    handler: (event: any) => void | Promise<void>
  ): void {
    this.webhookHandler.on(eventType, handler);
  }

  /**
   * Remove a webhook event handler
   * 
   * @param eventType - The event type
   * @param handler - The handler function to remove
   */
  public offWebhook(
    eventType: WebhookEventType, 
    handler: (event: any) => void | Promise<void>
  ): void {
    this.webhookHandler.off(eventType, handler);
  }

  /**
   * Get the webhook event handler instance
   * Useful for advanced webhook management
   */
  public getWebhookHandler(): WebhookEventHandler {
    return this.webhookHandler;
  }

  // User Management Methods

  /**
   * Get the current authenticated user information
   * 
   * @param options - Request options
   * @returns Promise resolving to user information
   * 
   * @example
   * ```typescript
   * const user = await spine.getCurrentUser();
   * console.log('User email:', user.email);
   * console.log('Credits remaining:', user.credits);
   * ```
   */
  public async getCurrentUser(options: RequestOptions = {}): Promise<UserInfo> {
    return this.client.getCurrentUser();
  }

  // Secure User Account Methods (Using Supabase Token)

  /**
   * Get user profile using Supabase authentication
   * 
   * @returns Promise resolving to user profile
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const profile = await spine.getUserProfile();
   * console.log('User:', profile.email);
   * ```
   */
  public async getUserProfile() {
    return this.client.getUserProfile();
  }

  /**
   * Get user's API key status using Supabase authentication
   * 
   * @returns Promise resolving to API key status (masked)
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const status = await spine.getUserApiKeyStatus();
   * if (!status.has_api_key) {
   *   console.log('No API key exists');
   * } else {
   *   console.log('Masked key:', status.api_key_masked);
   *   console.log('Credits:', status.credits);
   * }
   * ```
   */
  public async getUserApiKeyStatus() {
    return this.client.getUserApiKeyStatus();
  }

  /**
   * Generate or regenerate API key using Supabase authentication
   * 
   * @returns Promise resolving to new API key (shown once)
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const result = await spine.generateApiKey();
   * console.log('New API key:', result.api_key);
   * console.log('Action:', result.action); // 'created' or 'regenerated'
   * // Save this key securely - won't be shown again!
   * ```
   */
  public async generateApiKey() {
    return this.client.generateApiKey();
  }

  /**
   * Revoke API key using Supabase authentication
   * 
   * @returns Promise resolving to confirmation
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const result = await spine.revokeApiKey();
   * console.log('API key revoked:', result.message);
   * ```
   */
  public async revokeApiKey() {
    return this.client.revokeApiKey();
  }

  // Deprecated User Key Methods (Use secure methods above)

  /**
   * @deprecated Use getUserApiKeyStatus() with Supabase token instead
   * Check if a user has an API key generated
   * 
   * @param userId - Supabase Auth user ID (UUID)
   * @returns Promise resolving to API key status and details
   * 
   * @example
   * ```typescript
   * const userId = '123e4567-e89b-12d3-a456-426614174000';
   * const status = await spine.checkUserApiKey(userId);
   * 
   * if (!status.has_api_key) {
   *   console.log('User does not have an API key');
   * } else {
   *   console.log('API Key:', status.api_key);
   *   console.log('Credits:', status.credits);
   * }
   * ```
   */
  public async checkUserApiKey(userId: string) {
    return this.client.checkUserApiKey(userId);
  }

  /**
   * @deprecated Use generateApiKey() with Supabase token instead
   * Generate or regenerate an API key for a user
   * 
   * @param userId - Supabase Auth user ID (UUID)
   * @returns Promise resolving to new API key and action taken
   * 
   * @example
   * ```typescript
   * const userId = '123e4567-e89b-12d3-a456-426614174000';
   * const result = await spine.generateUserApiKey(userId);
   * 
   * console.log('Action:', result.action); // 'created' or 'regenerated'
   * console.log('New API Key:', result.api_key);
   * console.log('Message:', result.message);
   * ```
   */
  public async generateUserApiKey(userId: string) {
    return this.client.generateUserApiKey(userId);
  }

  /**
   * @deprecated Use revokeApiKey() with Supabase token instead
   * Revoke (delete) a user's API key
   * 
   * @param userId - Supabase Auth user ID (UUID)
   * @returns Promise resolving to confirmation of revocation
   * 
   * @example
   * ```typescript
   * const userId = '123e4567-e89b-12d3-a456-426614174000';
   * const result = await spine.revokeUserApiKey(userId);
   * 
   * console.log('Status:', result.status); // 'revoked'
   * console.log('Message:', result.message);
   * ```
   */
  public async revokeUserApiKey(userId: string) {
    return this.client.revokeUserApiKey(userId);
  }

  /**
   * Check remaining credits for the current user
   * 
   * @param options - Request options
   * @returns Promise resolving to the number of credits remaining
   * 
   * @example
   * ```typescript
   * const credits = await spine.checkCredits();
   * if (credits < 100) {
   *   console.warn('Low credits! Please top up at https://ai-spine.com/billing');
   * }
   * ```
   */
  public async checkCredits(options: RequestOptions = {}): Promise<number> {
    return this.client.checkCredits();
  }

  // Flow CRUD Methods (Using Supabase Token)

  /**
   * Create a new flow (requires Supabase authentication)
   * 
   * @param flowData - The flow definition to create
   * @returns Promise resolving to the created flow
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const flow = await spine.createFlow({
   *   flow_id: 'my-custom-flow',
   *   name: 'My Custom Flow',
   *   description: 'A custom workflow',
   *   nodes: [...],
   *   entry_point: 'input',
   *   exit_points: ['output']
   * });
   * ```
   */
  public async createFlow(flowData: FlowCreateRequest): Promise<FlowDefinition> {
    const config = this.client.getConfig();
    if (!config.supabaseToken) {
      throw new ValidationError('Supabase token is required for creating flows');
    }

    // Validate flow data
    if (!flowData.flow_id || !flowData.name || !flowData.nodes || !flowData.entry_point) {
      throw new ValidationError('flow_id, name, nodes, and entry_point are required');
    }

    const response = await this.client.post<FlowDefinition>(
      '/api/v1/flows',
      flowData,
      {
        headers: {
          'Authorization': `Bearer ${config.supabaseToken}`
        }
      }
    );

    return response.data;
  }

  /**
   * Get all flows created by the current user (requires Supabase authentication)
   * 
   * @returns Promise resolving to user's flows
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const result = await spine.getMyFlows();
   * console.log(`You have ${result.count} flows`);
   * result.flows.forEach(flow => {
   *   console.log(`- ${flow.name} (${flow.flow_id})`);
   * });
   * ```
   */
  public async getMyFlows(): Promise<MyFlowsResponse> {
    const config = this.client.getConfig();
    if (!config.supabaseToken) {
      throw new ValidationError('Supabase token is required for getting user flows');
    }

    const response = await this.client.get<MyFlowsResponse>(
      '/api/v1/flows/my-flows',
      undefined,
      {
        headers: {
          'Authorization': `Bearer ${config.supabaseToken}`
        }
      }
    );

    return response.data;
  }

  /**
   * Update an existing flow (requires ownership and Supabase authentication)
   * 
   * @param flowId - The flow ID to update
   * @param updates - The updates to apply
   * @returns Promise resolving to the updated flow
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const updated = await spine.updateFlow('my-custom-flow', {
   *   name: 'Updated Flow Name',
   *   description: 'Updated description',
   *   nodes: [...]
   * });
   * console.log('Flow version:', updated.version);
   * ```
   */
  public async updateFlow(flowId: string, updates: FlowUpdateRequest): Promise<FlowDefinition> {
    const config = this.client.getConfig();
    if (!config.supabaseToken) {
      throw new ValidationError('Supabase token is required for updating flows');
    }

    if (!flowId) {
      throw new ValidationError('Flow ID is required');
    }

    const response = await this.client.put<FlowDefinition>(
      `/api/v1/flows/${flowId}`,
      updates,
      {
        headers: {
          'Authorization': `Bearer ${config.supabaseToken}`
        }
      }
    );

    return response.data;
  }

  /**
   * Delete a flow (requires ownership and Supabase authentication)
   * 
   * @param flowId - The flow ID to delete
   * @returns Promise resolving to deletion confirmation
   * 
   * @example
   * ```typescript
   * const spine = new AISpine({
   *   supabaseToken: session.access_token
   * });
   * 
   * const result = await spine.deleteFlow('my-custom-flow');
   * console.log(result.message); // 'Flow deleted successfully'
   * ```
   */
  public async deleteFlow(flowId: string): Promise<FlowDeleteResponse> {
    const config = this.client.getConfig();
    if (!config.supabaseToken) {
      throw new ValidationError('Supabase token is required for deleting flows');
    }

    if (!flowId) {
      throw new ValidationError('Flow ID is required');
    }

    const response = await this.client.delete<FlowDeleteResponse>(
      `/api/v1/flows/${flowId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.supabaseToken}`
        }
      }
    );

    return response.data;
  }
}