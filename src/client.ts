/**
 * AI Spine HTTP Client
 * 
 * Handles all HTTP communications with the AI Spine API
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { 
  AISpineConfig, 
  RequestOptions, 
  SDKResponse,
  UserInfo,
  ApiKeyStatus,
  ApiKeyGenerateResponse,
  ApiKeyRevokeResponse,
  UserProfile,
  UserApiKeyStatus,
  UserApiKeyGenerateResponse
} from './types';
import { 
  createErrorFromResponse, 
  NetworkError, 
  TimeoutError,
  AISpineError 
} from './errors';

export class AISpineClient {
  private readonly http: AxiosInstance;
  private readonly config: Required<AISpineConfig>;

  constructor(config: AISpineConfig | string) {
    // Backward compatibility
    if (typeof config === 'string') {
      config = { apiKey: config };
    }

    // API key is optional for user management endpoints
    if (!config.apiKey) {
      config.apiKey = 'sk_no_auth_required';
    }

    if (config.apiKey !== 'sk_no_auth_required' && !config.apiKey.startsWith('sk_')) {
      console.warn('API key should start with "sk_". Make sure you\'re using a valid user key.');
    }

    // Set defaults
    this.config = {
      apiKey: config.apiKey,
      supabaseToken: config.supabaseToken,
      baseURL: config.baseURL || 'https://ai-spine-api.up.railway.app',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      debug: config.debug || false,
      onCreditsLow: config.onCreditsLow || (() => {})
    }

    // Create axios instance
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-SDK-Version': 'ai-spine-sdk-js/2.4.1',
    };

    // Only add User-Agent in Node.js environment (not in browsers)
    if (typeof window === 'undefined') {
      headers['User-Agent'] = '@ai-spine/sdk-js/2.4.1';
    }

    this.http = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers,
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for debugging
    this.http.interceptors.request.use(
      (config) => {
        if (this.config.debug) {
          console.log(`[AI Spine SDK] ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }
        return config;
      },
      (error) => {
        if (this.config.debug) {
          console.error('[AI Spine SDK] Request error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and debugging
    this.http.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log(`[AI Spine SDK] Response ${response.status}:`, {
            status: response.status,
            data: response.data,
          });
        }
        return response;
      },
      (error) => {
        if (this.config.debug) {
          console.error('[AI Spine SDK] Response error:', error);
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): AISpineError {
    // Network or timeout errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new TimeoutError(this.config.timeout);
      }
      return new NetworkError(error.message, { 
        code: error.code,
        originalError: error.message 
      });
    }

    // HTTP errors with response
    const { status, data } = error.response;
    return createErrorFromResponse(status, data, error.message);
  }

  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    options: RequestOptions = {}
  ): Promise<SDKResponse<T>> {
    const maxRetries = options.retries ?? this.config.retries;
    let lastError: AISpineError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await requestFn();
        return {
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
        };
      } catch (error) {
        lastError = error instanceof AISpineError ? error : new AISpineError(
          'Unexpected error',
          'UNKNOWN_ERROR',
          undefined,
          { originalError: error }
        );

        // Don't retry on certain errors
        if (
          lastError.status === 400 || // Bad Request
          lastError.status === 401 || // Unauthorized
          lastError.status === 403 || // Forbidden
          lastError.status === 404    // Not Found
        ) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));

        if (this.config.debug) {
          console.log(`[AI Spine SDK] Retrying request (attempt ${attempt + 2}/${maxRetries + 1}) after ${delay}ms`);
        }
      }
    }

    throw lastError!;
  }

  // HTTP Methods

  public async get<T = any>(
    path: string, 
    params?: Record<string, any>, 
    options: RequestOptions = {}
  ): Promise<SDKResponse<T>> {
    return this.executeWithRetry(
      () => this.http.get<T>(path, {
        params,
        timeout: options.timeout,
        headers: options.headers,
      }),
      options
    );
  }

  public async post<T = any>(
    path: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<SDKResponse<T>> {
    return this.executeWithRetry(
      () => this.http.post<T>(path, data, {
        timeout: options.timeout,
        headers: options.headers,
      }),
      options
    );
  }

  public async put<T = any>(
    path: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<SDKResponse<T>> {
    return this.executeWithRetry(
      () => this.http.put<T>(path, data, {
        timeout: options.timeout,
        headers: options.headers,
      }),
      options
    );
  }

  public async delete<T = any>(
    path: string, 
    options: RequestOptions = {}
  ): Promise<SDKResponse<T>> {
    return this.executeWithRetry(
      () => this.http.delete<T>(path, {
        timeout: options.timeout,
        headers: options.headers,
      }),
      options
    );
  }

  public async patch<T = any>(
    path: string, 
    data?: any, 
    options: RequestOptions = {}
  ): Promise<SDKResponse<T>> {
    return this.executeWithRetry(
      () => this.http.patch<T>(path, data, {
        timeout: options.timeout,
        headers: options.headers,
      }),
      options
    );
  }

  // User Management Methods

  public async getCurrentUser(): Promise<UserInfo> {
    const response = await this.get<UserInfo>('/api/v1/users/me');
    
    // Check if credits are low and trigger callback
    if (this.config.onCreditsLow && response.data.credits < 100) {
      this.config.onCreditsLow(response.data.credits);
    }
    
    return response.data;
  }

  public async checkCredits(): Promise<number> {
    const user = await this.getCurrentUser();
    return user.credits;
  }

  // API Key Management Methods (DEPRECATED - Use secure methods above)

  /**
   * @deprecated Use getUserApiKeyStatus() with Supabase token instead
   * Check if a user has an API key generated
   * @param userId - Supabase Auth user ID (UUID)
   * @returns API key status and details
   */
  public async checkUserApiKey(userId: string): Promise<ApiKeyStatus> {
    // These endpoints don't require authentication, so we'll create a custom request
    const response = await axios.get<ApiKeyStatus>(
      `${this.config.baseURL}/api/v1/user/keys/my-key`,
      {
        params: { user_id: userId },
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      }
    );
    return response.data;
  }

  /**
   * @deprecated Use generateUserApiKey() with Supabase token instead
   * Generate or regenerate an API key for a user
   * @param userId - Supabase Auth user ID (UUID)
   * @returns New API key and action taken
   */
  public async generateUserApiKey(userId: string): Promise<ApiKeyGenerateResponse> {
    // These endpoints don't require authentication, so we'll create a custom request
    const response = await axios.post<ApiKeyGenerateResponse>(
      `${this.config.baseURL}/api/v1/user/keys/generate`,
      { user_id: userId },
      {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      }
    );
    return response.data;
  }

  /**
   * @deprecated Use revokeApiKey() with Supabase token instead
   * Revoke (delete) a user's API key
   * @param userId - Supabase Auth user ID (UUID)
   * @returns Confirmation of revocation
   */
  public async revokeUserApiKey(userId: string): Promise<ApiKeyRevokeResponse> {
    // These endpoints don't require authentication, so we'll create a custom request
    const response = await axios.delete<ApiKeyRevokeResponse>(
      `${this.config.baseURL}/api/v1/user/keys/revoke`,
      {
        data: { user_id: userId },
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      }
    );
    return response.data;
  }

  // Secure User Account Methods (Using Supabase Token)

  /**
   * Get user profile using Supabase token
   * @returns User profile information
   */
  public async getUserProfile(): Promise<UserProfile> {
    if (!this.config.supabaseToken) {
      throw new Error('Supabase token is required for user account methods');
    }

    const response = await this.get<UserProfile>(
      '/api/v1/user/account/profile',
      undefined,
      {
        headers: {
          'Authorization': `Bearer ${this.config.supabaseToken}`
        }
      }
    );
    return response.data;
  }

  /**
   * Get user's API key status using Supabase token
   * @returns API key status (masked key, credits, etc.)
   */
  public async getUserApiKeyStatus(): Promise<UserApiKeyStatus> {
    if (!this.config.supabaseToken) {
      throw new Error('Supabase token is required for user account methods');
    }

    const response = await this.get<UserApiKeyStatus>(
      '/api/v1/user/account/api-key/status',
      undefined,
      {
        headers: {
          'Authorization': `Bearer ${this.config.supabaseToken}`
        }
      }
    );
    return response.data;
  }

  /**
   * Generate or regenerate user's API key using Supabase token
   * @returns New API key (shown only once)
   */
  public async generateApiKey(): Promise<UserApiKeyGenerateResponse> {
    if (!this.config.supabaseToken) {
      throw new Error('Supabase token is required for user account methods');
    }

    const response = await this.post<UserApiKeyGenerateResponse>(
      '/api/v1/user/account/api-key/generate',
      {},
      {
        headers: {
          'Authorization': `Bearer ${this.config.supabaseToken}`
        }
      }
    );
    return response.data;
  }

  /**
   * Revoke user's API key using Supabase token
   * @returns Confirmation message
   */
  public async revokeApiKey(): Promise<{ message: string; status: string }> {
    if (!this.config.supabaseToken) {
      throw new Error('Supabase token is required for user account methods');
    }

    const response = await this.post<{ message: string; status: string }>(
      '/api/v1/user/account/api-key/revoke',
      {},
      {
        headers: {
          'Authorization': `Bearer ${this.config.supabaseToken}`
        }
      }
    );
    return response.data;
  }

  // Utility Methods

  public getConfig(): Required<AISpineConfig> {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<AISpineConfig>): void {
    Object.assign(this.config, updates);
    
    // Update axios instance if necessary
    if (updates.baseURL) {
      this.http.defaults.baseURL = updates.baseURL;
    }
    
    if (updates.timeout) {
      this.http.defaults.timeout = updates.timeout;
    }
    
    if (updates.apiKey) {
      this.http.defaults.headers['Authorization'] = `Bearer ${updates.apiKey}`;
    }
  }

  public async healthCheck(): Promise<SDKResponse<{ status: string; version?: string }>> {
    return this.get('/health');
  }
}