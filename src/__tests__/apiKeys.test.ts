/**
 * Tests for API Key Management methods
 */

import axios from 'axios';
import { AISpine } from '../spine';
import { AISpineClient } from '../client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Key Management', () => {
  const validApiKey = 'sk_test_1234567890abcdef1234567890abcdef';
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  let spine: AISpine;
  let client: AISpineClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a mocked axios instance
    (mockedAxios.create as jest.Mock).mockReturnValue(mockedAxios);
    
    spine = new AISpine(validApiKey);
    client = new AISpineClient(validApiKey);
  });

  describe('checkUserApiKey', () => {
    it('should check if user has API key', async () => {
      const mockResponse = {
        data: {
          has_api_key: true,
          api_key: 'sk_user_test123',
          credits: 1000,
          rate_limit: 100,
          created_at: '2024-01-01T00:00:00Z',
          last_used_at: '2024-01-15T00:00:00Z'
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await spine.checkUserApiKey(userId);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://ai-spine-api.up.railway.app/api/v1/user/keys/my-key',
        {
          params: { user_id: userId },
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      expect(result).toEqual(mockResponse.data);
      expect(result.has_api_key).toBe(true);
      expect(result.api_key).toBe('sk_user_test123');
    });

    it('should handle user without API key', async () => {
      const mockResponse = {
        data: {
          has_api_key: false,
          api_key: null,
          message: 'User does not have an API key'
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await spine.checkUserApiKey(userId);

      expect(result.has_api_key).toBe(false);
      expect(result.api_key).toBeNull();
    });
  });

  describe('generateUserApiKey', () => {
    it('should generate new API key for user', async () => {
      const mockResponse = {
        data: {
          message: 'API key created successfully',
          api_key: 'sk_user_new_test456',
          action: 'created' as const
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {}
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await spine.generateUserApiKey(userId);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ai-spine-api.up.railway.app/api/v1/user/keys/generate',
        { user_id: userId },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      expect(result).toEqual(mockResponse.data);
      expect(result.action).toBe('created');
      expect(result.api_key).toBe('sk_user_new_test456');
    });

    it('should regenerate existing API key', async () => {
      const mockResponse = {
        data: {
          message: 'API key regenerated successfully',
          api_key: 'sk_user_regenerated_789',
          action: 'regenerated' as const
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await spine.generateUserApiKey(userId);

      expect(result.action).toBe('regenerated');
      expect(result.api_key).toBe('sk_user_regenerated_789');
    });
  });

  describe('revokeUserApiKey', () => {
    it('should revoke user API key', async () => {
      const mockResponse = {
        data: {
          message: 'API key revoked successfully',
          status: 'revoked' as const
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      };

      mockedAxios.delete.mockResolvedValueOnce(mockResponse);

      const result = await spine.revokeUserApiKey(userId);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'https://ai-spine-api.up.railway.app/api/v1/user/keys/revoke',
        {
          data: { user_id: userId },
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        }
      );

      expect(result).toEqual(mockResponse.data);
      expect(result.status).toBe('revoked');
    });
  });

  describe('Integration workflow', () => {
    it('should handle complete API key lifecycle', async () => {
      // 1. Check - no key
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          has_api_key: false,
          api_key: null,
          message: 'User does not have an API key'
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      });

      let status = await spine.checkUserApiKey(userId);
      expect(status.has_api_key).toBe(false);

      // 2. Generate new key
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: 'API key created successfully',
          api_key: 'sk_user_new_key',
          action: 'created' as const
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {}
      });

      const generated = await spine.generateUserApiKey(userId);
      expect(generated.action).toBe('created');
      expect(generated.api_key).toBe('sk_user_new_key');

      // 3. Check - has key
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          has_api_key: true,
          api_key: 'sk_user_new_key',
          credits: 1000,
          rate_limit: 100,
          created_at: '2024-01-01T00:00:00Z',
          last_used_at: null
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      });

      status = await spine.checkUserApiKey(userId);
      expect(status.has_api_key).toBe(true);
      expect(status.api_key).toBe('sk_user_new_key');

      // 4. Regenerate key
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: 'API key regenerated successfully',
          api_key: 'sk_user_regenerated_key',
          action: 'regenerated' as const
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      });

      const regenerated = await spine.generateUserApiKey(userId);
      expect(regenerated.action).toBe('regenerated');
      expect(regenerated.api_key).toBe('sk_user_regenerated_key');

      // 5. Revoke key
      mockedAxios.delete.mockResolvedValueOnce({
        data: {
          message: 'API key revoked successfully',
          status: 'revoked' as const
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      });

      const revoked = await spine.revokeUserApiKey(userId);
      expect(revoked.status).toBe('revoked');
    });
  });
});