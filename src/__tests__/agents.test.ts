/**
 * Agent Registration Tests
 */

import { AISpine } from '../spine';
import { AISpineClient } from '../client';

// Mock the client module
jest.mock('../client');

describe('Agent Registration', () => {
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
    
    // Create spine instance
    spine = new AISpine('sk_test');
  });

  describe('registerAgent', () => {
    it('should register an agent with explicit agent_type', async () => {
      const agentConfig = {
        agent_id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        endpoint: 'https://api.example.com',
        capabilities: ['conversation', 'information_gathering'],
        agent_type: 'processor' as const,
        is_active: true
      };

      const expectedResponse = {
        ...agentConfig,
        status: 'active' as const,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      };

      mockClient.post.mockResolvedValue({
        data: expectedResponse,
        status: 201,
        statusText: 'Created',
        headers: {}
      });

      const result = await spine.registerAgent(agentConfig);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/agents',
        expect.objectContaining({
          agent_id: 'test-agent',
          name: 'Test Agent',
          description: 'A test agent',
          endpoint: 'https://api.example.com',
          capabilities: ['conversation', 'information_gathering'],
          agent_type: 'processor',
          is_active: true
        }),
        {}
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should default to processor agent_type when not specified', async () => {
      const agentConfig = {
        agent_id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        endpoint: 'https://api.example.com',
        capabilities: ['conversation']
        // agent_type not specified
      };

      const expectedResponse = {
        ...agentConfig,
        agent_type: 'processor',
        is_active: true,
        status: 'active' as const,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      };

      mockClient.post.mockResolvedValue({
        data: expectedResponse,
        status: 201,
        statusText: 'Created',
        headers: {}
      });

      const result = await spine.registerAgent(agentConfig);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/agents',
        expect.objectContaining({
          agent_id: 'test-agent',
          name: 'Test Agent',
          description: 'A test agent',
          endpoint: 'https://api.example.com',
          capabilities: ['conversation'],
          agent_type: 'processor', // Should default to 'processor'
          is_active: true // Should default to true
        }),
        {}
      );
      expect(result.agent_type).toBe('processor');
    });

    it('should default is_active to true when not specified', async () => {
      const agentConfig = {
        agent_id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        endpoint: 'https://api.example.com',
        capabilities: ['conversation', 'information_gathering'],
        agent_type: 'input' as const
        // is_active not specified
      };

      mockClient.post.mockResolvedValue({
        data: {
          ...agentConfig,
          is_active: true,
          status: 'active' as const
        },
        status: 201,
        statusText: 'Created',
        headers: {}
      });

      await spine.registerAgent(agentConfig);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/agents',
        expect.objectContaining({
          is_active: true // Should default to true
        }),
        {}
      );
    });

    it('should allow is_active to be set to false', async () => {
      const agentConfig = {
        agent_id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        endpoint: 'https://api.example.com',
        capabilities: ['conversation', 'information_gathering'],
        agent_type: 'output' as const,
        is_active: false
      };

      mockClient.post.mockResolvedValue({
        data: {
          ...agentConfig,
          status: 'inactive' as const
        },
        status: 201,
        statusText: 'Created',
        headers: {}
      });

      await spine.registerAgent(agentConfig);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/v1/agents',
        expect.objectContaining({
          is_active: false // Should respect false value
        }),
        {}
      );
    });

    it('should handle all valid agent_type values', async () => {
      const agentTypes: Array<'input' | 'processor' | 'output' | 'conditional'> = ['input', 'processor', 'output', 'conditional'];
      
      for (const agent_type of agentTypes) {
        mockClient.post.mockResolvedValue({
          data: {
            agent_id: `${agent_type}-agent`,
            name: `${agent_type} Agent`,
            description: 'Test',
            endpoint: 'https://api.example.com',
            capabilities: ['conversation'],
            agent_type,
            is_active: true,
            status: 'active' as const
          },
          status: 201,
          statusText: 'Created',
          headers: {}
        });

        const result = await spine.registerAgent({
          agent_id: `${agent_type}-agent`,
          name: `${agent_type} Agent`,
          description: 'Test',
          endpoint: 'https://api.example.com',
          capabilities: ['conversation'],
          agent_type
        });

        expect(result.agent_type).toBe(agent_type);
      }
    });
  });
});