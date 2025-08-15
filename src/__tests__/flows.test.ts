/**
 * Flow CRUD Operations Tests
 */

import { AISpine } from '../spine';
import { AISpineClient } from '../client';
import { ValidationError } from '../errors';

// Mock the client module
jest.mock('../client');

describe('Flow CRUD Operations', () => {
  let spine: AISpine;
  let mockClient: jest.Mocked<AISpineClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a mock client instance
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      getCurrentUser: jest.fn(),
      checkCredits: jest.fn(),
      checkUserApiKey: jest.fn(),
      generateUserApiKey: jest.fn(),
      revokeUserApiKey: jest.fn(),
      getUserProfile: jest.fn(),
      getUserApiKeyStatus: jest.fn(),
      generateApiKey: jest.fn(),
      revokeApiKey: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        apiKey: 'sk_test',
        supabaseToken: 'test-supabase-token',
        baseURL: 'https://api.example.com',
        timeout: 30000,
        retries: 3,
        debug: false,
      }),
      updateConfig: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    // Mock the AISpineClient constructor to return our mock
    (AISpineClient as jest.MockedClass<typeof AISpineClient>).mockImplementation(() => mockClient);
    
    // Create spine instance with Supabase token
    spine = new AISpine({
      apiKey: 'sk_test',
      supabaseToken: 'test-supabase-token'
    });
  });

  describe('createFlow', () => {
    it('should create a new flow with valid data', async () => {
      const flowData = {
        flow_id: 'test-flow',
        name: 'Test Flow',
        description: 'A test flow',
        nodes: [
          {
            id: 'input',
            type: 'input' as const,
            config: {}
          },
          {
            id: 'processor',
            type: 'processor' as const,
            agent_id: 'test-agent',
            depends_on: ['input'],
            config: {}
          },
          {
            id: 'output',
            type: 'output' as const,
            depends_on: ['processor'],
            config: {}
          }
        ],
        entry_point: 'input',
        exit_points: ['output']
      };

      const expectedResponse = {
        ...flowData,
        version: 1,
        created_by: 'user-123',
        is_active: true,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      };

      mockClient.post.mockResolvedValue({
        data: expectedResponse,
        status: 201,
        statusText: 'Created',
        headers: {}
      });

      const result = await spine.createFlow(flowData);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/flows',
        flowData,
        {
          headers: {
            'Authorization': 'Bearer test-supabase-token'
          }
        }
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw error when Supabase token is missing', async () => {
      spine = new AISpine({ apiKey: 'sk_test' });

      await expect(spine.createFlow({
        flow_id: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [],
        entry_point: 'input'
      })).rejects.toThrow('Supabase token is required for creating flows');
    });

    it('should validate required fields', async () => {
      await expect(spine.createFlow({
        flow_id: '',
        name: 'Test',
        description: 'Test',
        nodes: [],
        entry_point: 'input'
      })).rejects.toThrow('flow_id, name, nodes, and entry_point are required');

      await expect(spine.createFlow({
        flow_id: 'test',
        name: '',
        description: 'Test',
        nodes: [],
        entry_point: 'input'
      })).rejects.toThrow('flow_id, name, nodes, and entry_point are required');
    });
  });

  describe('getMyFlows', () => {
    it('should retrieve user flows', async () => {
      const expectedResponse = {
        flows: [
          {
            flow_id: 'flow-1',
            name: 'Flow 1',
            description: 'First flow',
            nodes: [],
            entry_point: 'input',
            version: 1,
            created_by: 'user-123',
            is_active: true,
            created_at: '2025-01-15T10:00:00Z',
            updated_at: '2025-01-15T10:00:00Z'
          },
          {
            flow_id: 'flow-2',
            name: 'Flow 2',
            description: 'Second flow',
            nodes: [],
            entry_point: 'input',
            version: 2,
            created_by: 'user-123',
            is_active: true,
            created_at: '2025-01-14T10:00:00Z',
            updated_at: '2025-01-15T12:00:00Z'
          }
        ],
        count: 2,
        user_id: 'user-123'
      };

      mockClient.get.mockResolvedValue({
        data: expectedResponse,
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const result = await spine.getMyFlows();

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/flows/my-flows',
        undefined,
        {
          headers: {
            'Authorization': 'Bearer test-supabase-token'
          }
        }
      );
      expect(result).toEqual(expectedResponse);
      expect(result.count).toBe(2);
      expect(result.flows).toHaveLength(2);
    });

    it('should throw error when Supabase token is missing', async () => {
      spine = new AISpine({ apiKey: 'sk_test' });

      await expect(spine.getMyFlows()).rejects.toThrow('Supabase token is required for getting user flows');
    });
  });

  describe('updateFlow', () => {
    it('should update an existing flow', async () => {
      const updates = {
        name: 'Updated Flow Name',
        description: 'Updated description',
        nodes: [
          {
            id: 'new-node',
            type: 'processor' as const,
            agent_id: 'new-agent',
            config: {}
          }
        ]
      };

      const expectedResponse = {
        flow_id: 'test-flow',
        name: 'Updated Flow Name',
        description: 'Updated description',
        nodes: updates.nodes,
        entry_point: 'input',
        version: 2,
        created_by: 'user-123',
        is_active: true,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T14:00:00Z'
      };

      mockClient.put.mockResolvedValue({
        data: expectedResponse,
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const result = await spine.updateFlow('test-flow', updates);

      expect(mockClient.put).toHaveBeenCalledWith(
        '/api/v1/flows/test-flow',
        updates,
        {
          headers: {
            'Authorization': 'Bearer test-supabase-token'
          }
        }
      );
      expect(result).toEqual(expectedResponse);
      expect(result.version).toBe(2);
    });

    it('should throw error when flow ID is missing', async () => {
      await expect(spine.updateFlow('', { name: 'Test' })).rejects.toThrow('Flow ID is required');
    });

    it('should throw error when Supabase token is missing', async () => {
      spine = new AISpine({ apiKey: 'sk_test' });

      await expect(spine.updateFlow('test-flow', { name: 'Test' }))
        .rejects.toThrow('Supabase token is required for updating flows');
    });
  });

  describe('deleteFlow', () => {
    it('should delete a flow', async () => {
      const expectedResponse = {
        message: 'Flow deleted successfully',
        status: 'deleted' as const
      };

      mockClient.delete.mockResolvedValue({
        data: expectedResponse,
        status: 200,
        statusText: 'OK',
        headers: {}
      });

      const result = await spine.deleteFlow('test-flow');

      expect(mockClient.delete).toHaveBeenCalledWith(
        '/api/v1/flows/test-flow',
        {
          headers: {
            'Authorization': 'Bearer test-supabase-token'
          }
        }
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should throw error when flow ID is missing', async () => {
      await expect(spine.deleteFlow('')).rejects.toThrow('Flow ID is required');
    });

    it('should throw error when Supabase token is missing', async () => {
      spine = new AISpine({ apiKey: 'sk_test' });

      await expect(spine.deleteFlow('test-flow'))
        .rejects.toThrow('Supabase token is required for deleting flows');
    });
  });

  describe('Error Handling', () => {
    it('should handle 409 conflict when creating duplicate flow', async () => {
      mockClient.post.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Flow already exists' }
        }
      });

      await expect(spine.createFlow({
        flow_id: 'existing-flow',
        name: 'Test',
        description: 'Test',
        nodes: [],
        entry_point: 'input'
      })).rejects.toThrow();
    });

    it('should handle 403 forbidden when updating flow without ownership', async () => {
      mockClient.put.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'You do not own this flow' }
        }
      });

      await expect(spine.updateFlow('system-flow', { name: 'Test' })).rejects.toThrow();
    });

    it('should handle 403 forbidden when deleting system flow', async () => {
      mockClient.delete.mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Cannot delete system flow' }
        }
      });

      await expect(spine.deleteFlow('credit_analysis')).rejects.toThrow();
    });

    it('should handle 404 not found', async () => {
      mockClient.put.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Flow not found' }
        }
      });

      await expect(spine.updateFlow('non-existent', { name: 'Test' })).rejects.toThrow();
    });
  });
});