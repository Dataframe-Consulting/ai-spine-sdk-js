# AI Spine JavaScript SDK

The official JavaScript SDK for AI Spine - **The Stripe for AI Agent Orchestration**.

AI Spine makes it incredibly easy to orchestrate AI agents and build sophisticated AI workflows. Just like Stripe simplified payments, AI Spine simplifies AI agent coordination.

## 🚀 Quick Start

### Installation

```bash
npm install ai-spine-sdk
# or
yarn add ai-spine-sdk
# or
pnpm add ai-spine-sdk
```

### Basic usage

```typescript
import { AISpine } from 'ai-spine-sdk';

// Initialize SDK (API key is optional - backend currently has API_KEY_REQUIRED=false)
const spine = new AISpine();  // Will use production API by default

// Check API health
const health = await spine.healthCheck();
console.log('API Status:', health.status);

// Execute a flow (example: credit analysis)
const result = await spine.executeFlow('credit_analysis', {
  user_query: 'Necesito un préstamo de 50000',
  amount: 50000
});

console.log('Execution started:', result.execution_id);

// Wait for completion and get results
const execution = await spine.waitForExecution(result.execution_id);
console.log('Final result:', execution.output_data);
```

## 📚 Documentation

### ⚠️ Important notes

- **API Status**: The API is currently running at `https://ai-spine-api-production.up.railway.app`
- **Authentication**: API keys are currently optional (`API_KEY_REQUIRED=false`)
- **Agents**: No real agents are connected yet - flows will fail until agents are registered
- **Webhooks**: Not implemented - use polling with `waitForExecution()` instead

### Configuration

You can configure the SDK during initialization:

```typescript
import { AISpine } from 'ai-spine-sdk';

const spine = new AISpine({
  apiKey: 'sk_test_your_api_key_here', // Optional - currently API_KEY_REQUIRED=false
  // baseURL defaults to: https://ai-spine-api-production.up.railway.app
  // baseURL: 'https://your-custom-api.com', // Optional: Custom API URL
  timeout: 30000, // 30 second timeout
  retries: 3, // Retry failed requests 3 times
  debug: true // Enable debug logging
});
```

### Flow execution

#### Execute a flow

```typescript
// Simple execution
const result = await spine.executeFlow('text-analysis', {
  text: 'Analyze this text for sentiment and topics'
});

// With custom timeout
const result = await spine.executeFlow('long-running-task', 
  { data: complexData },
  { timeout: 120000 } // 2 minute timeout
);
```

#### Wait for completion

```typescript
// Wait with progress updates
const execution = await spine.waitForExecution(result.execution_id, {
  timeout: 300000, // 5 minutes
  interval: 2000,  // Check every 2 seconds
  onProgress: (execution) => {
    console.log(`Status: ${execution.status}`);
    if (execution.status === 'running') {
      console.log('Still processing...');
    }
  }
});

console.log('Final result:', execution.output_data);
```

#### Get execution status

```typescript
// Get current status
const execution = await spine.getExecution('exec-123');

console.log(`Status: ${execution.status}`);
console.log(`Started: ${execution.started_at}`);

if (execution.status === 'completed') {
  console.log('Result:', execution.output_data);
} else if (execution.status === 'failed') {
  console.log('Error:', execution.error_message);
}
```

### Flow management

#### List available flows

```typescript
const flows = await spine.listFlows();

flows.forEach(flow => {
  console.log(`${flow.name}: ${flow.description}`);
  console.log(`Nodes: ${flow.nodes.length}`);
});
```

#### Get flow details

```typescript
const flow = await spine.getFlow('customer-support');

console.log(`Flow: ${flow.name}`);
console.log(`Description: ${flow.description}`);
console.log('Nodes:');
flow.nodes.forEach(node => {
  console.log(`  - ${node.id} (${node.type}): ${node.agent_id}`);
});
```

### Agent management

#### List registered agents

```typescript
const agents = await spine.listAgents();

agents.forEach(agent => {
  console.log(`${agent.name} (${agent.status})`);
  console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
  console.log(`  Endpoint: ${agent.endpoint}`);
});
```

#### Register a new agent

```typescript
const agent = await spine.registerAgent({
  agent_id: 'my-custom-agent',
  name: 'My Custom Agent',
  description: 'A specialized agent for custom tasks',
  endpoint: 'https://my-agent.example.com/api',
  capabilities: ['text-processing', 'data-analysis', 'custom-logic'],
  type: 'custom'
});

console.log(`Agent registered: ${agent.agent_id}`);
```

#### Test agent connection

```typescript
const testResult = await spine.testAgent('https://my-agent.example.com/api');

if (testResult.connected) {
  console.log('Agent is reachable and responding');
} else {
  console.log('Agent connection failed:', testResult.message);
}
```

### Batch processing

Execute multiple flows in parallel with automatic concurrency control:

```typescript
const requests = [
  { id: '1', flowId: 'sentiment-analysis', input: { text: 'I love this product!' } },
  { id: '2', flowId: 'sentiment-analysis', input: { text: 'This is terrible.' } },
  { id: '3', flowId: 'sentiment-analysis', input: { text: 'It\'s okay, I guess.' } }
];

const results = await spine.executeBatch(requests, {
  concurrency: 2, // Process 2 at a time
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total} completed`);
  },
  onItemComplete: (result) => {
    console.log(`Item ${result.id} completed:`, result.status);
  }
});

// Process results
results.forEach(result => {
  if (result.status === 'completed') {
    console.log(`${result.id}: ${JSON.stringify(result.result)}`);
  } else {
    console.log(`${result.id} failed: ${result.error}`);
  }
});
```

### System monitoring

#### Health check

```typescript
const health = await spine.healthCheck();

console.log(`System status: ${health.status}`);
console.log(`Version: ${health.version}`);
console.log(`Database: ${health.database}`);
console.log(`Uptime: ${health.uptime}s`);
```

#### Get metrics

```typescript
const metrics = await spine.getMetrics();

console.log(`Total executions: ${metrics.total_executions}`);
console.log(`Success rate: ${(metrics.successful_executions / metrics.total_executions * 100).toFixed(1)}%`);
console.log(`Average execution time: ${metrics.average_execution_time}ms`);
```

### Environment variables (NEW in v2.1.0)

The SDK now supports environment variable management for agents, making it easy to handle API keys, credentials, and configuration.

#### Register agent with environment schema

```typescript
const agent = await spine.registerAgent({
  agent_id: 'restaurant_agent',
  name: 'Restaurant Reservation Agent',
  description: 'Books restaurant reservations through OpenTable',
  endpoint: 'http://localhost:8001/restaurant',
  capabilities: ['restaurant_booking', 'opentable_api'],
  environment_schema: {
    'opentable_api_key': {
      type: 'password',
      description: 'Your OpenTable API key for authentication',
      required: true,
      sensitive: true
    },
    'opentable_partner_id': {
      type: 'string',
      description: 'Your OpenTable partner ID',
      required: true,
      sensitive: false
    },
    'default_cuisine': {
      type: 'string',
      description: 'Default cuisine when none specified',
      required: false,
      default_value: 'any'
    }
  }
});
```

#### Validate environment variables

```typescript
// Get environment schema for an agent
const schema = await spine.getAgentEnvironmentSchema('restaurant_agent');

// Validate environment variables
const result = await spine.validateAgentEnvironment('restaurant_agent', {
  'opentable_api_key': 'ot_live_abcd1234567890',
  'opentable_partner_id': 'partner_12345',
  'default_cuisine': 'italian'
});

if (!result.valid) {
  console.error('Validation errors:');
  result.errors.forEach(error => {
    console.error(`- ${error.field}: ${error.message}`);
  });
}
```

#### Use environment variables in flows

```typescript
const flow = await spine.createFlow({
  flow_id: 'restaurant_booking',
  name: 'Restaurant Booking Flow',
  description: 'Books restaurant reservations with environment variables',
  nodes: [
    {
      id: 'book_restaurant',
      type: 'processor',
      agent_id: 'restaurant_agent',
      config: {
        system_prompt: 'Book a restaurant reservation using OpenTable API',
        environment: {
          'opentable_api_key': process.env.OPENTABLE_API_KEY,
          'opentable_partner_id': process.env.OPENTABLE_PARTNER_ID,
          'default_cuisine': 'italian'
        }
      }
    }
  ]
});
```

#### Environment field types

- **`string`**: Regular text fields
- **`number`**: Numeric values
- **`boolean`**: True/false values
- **`password`**: Sensitive fields (API keys, secrets) - handled as strings but marked as sensitive for UI

## 🔑 API Key Management

The SDK provides methods to manage user API keys programmatically. These methods **do not require authentication** and are designed to be used from your backend to manage API keys for your users.

### Check if user has API key

```typescript
const userId = '123e4567-e89b-12d3-a456-426614174000'; // Supabase Auth user ID
const status = await spine.checkUserApiKey(userId);

if (!status.has_api_key) {
  console.log('User does not have an API key');
} else {
  console.log('API Key:', status.api_key);
  console.log('Credits:', status.credits);
  console.log('Rate limit:', status.rate_limit);
  console.log('Created at:', status.created_at);
  console.log('Last used:', status.last_used_at);
}
```

### Generate or regenerate API key

```typescript
const userId = '123e4567-e89b-12d3-a456-426614174000';

// This will create a new key if none exists, or regenerate if one already exists
const result = await spine.generateUserApiKey(userId);

console.log('Action:', result.action); // 'created' or 'regenerated'
console.log('New API Key:', result.api_key);
console.log('Message:', result.message);

// Save this key securely - it won't be shown again!
```

### Revoke API key

```typescript
const userId = '123e4567-e89b-12d3-a456-426614174000';

// Permanently delete the user's API key
const result = await spine.revokeUserApiKey(userId);

console.log('Status:', result.status); // 'revoked'
console.log('Message:', result.message);
```

### Complete workflow example

```typescript
import { AISpine } from 'ai-spine-sdk';

// Initialize without API key for key management operations
const spine = new AISpine({
  apiKey: 'sk_dummy', // These endpoints don't use the API key
  baseURL: 'https://ai-spine-api-production.up.railway.app'
});

async function manageUserApiKey(userId: string) {
  // 1. Check if user has an API key
  const status = await spine.checkUserApiKey(userId);
  
  if (!status.has_api_key) {
    // 2. Generate first API key
    const generated = await spine.generateUserApiKey(userId);
    console.log('Created new API key:', generated.api_key);
    
    // Store this key securely in your database
    await saveApiKeyToDatabase(userId, generated.api_key);
    
    return generated.api_key;
  }
  
  // User already has a key
  return status.api_key;
}

async function regenerateCompromisedKey(userId: string) {
  // Regenerate if key is compromised
  const regenerated = await spine.generateUserApiKey(userId);
  console.log('New API key:', regenerated.api_key);
  
  // Update stored key
  await updateApiKeyInDatabase(userId, regenerated.api_key);
  
  return regenerated.api_key;
}

async function removeUserAccess(userId: string) {
  // Revoke API key when user account is deleted or suspended
  await spine.revokeUserApiKey(userId);
  console.log('User API key has been revoked');
  
  // Clean up database
  await removeApiKeyFromDatabase(userId);
}
```

## 🔧 Advanced Usage

### Error handling

The SDK provides detailed error classes for different scenarios:

```typescript
import { 
  AISpine, 
  AuthenticationError, 
  ValidationError, 
  NotFoundError,
  TimeoutError,
  isAISpineError 
} from '@ai-spine/sdk';

try {
  const result = await spine.executeFlow('non-existent-flow', { data: 'test' });
} catch (error) {
  if (isAISpineError(error)) {
    console.log(`AI Spine Error [${error.code}]: ${error.message}`);
    
    switch (error.constructor) {
      case AuthenticationError:
        console.log('Check your API key');
        break;
      case ValidationError:
        console.log('Validation errors:', error.validationErrors);
        break;
      case NotFoundError:
        console.log('Resource not found');
        break;
      case TimeoutError:
        console.log('Request timed out, try increasing timeout');
        break;
      default:
        console.log('Details:', error.details);
    }
  } else {
    console.log('Unexpected error:', error);
  }
}
```

### Custom configuration updates

```typescript
// Update configuration at runtime
spine.updateConfig({
  timeout: 60000,
  debug: true
});

// Get current configuration
const config = spine.getConfig();
console.log('Current base URL:', config.baseURL);
```

### Input validation and sanitization

The SDK automatically validates and sanitizes inputs:

```typescript
// This will throw a ValidationError
try {
  await spine.executeFlow('invalid-flow-id!', { data: 'test' });
} catch (error) {
  console.log('Validation failed:', error.message);
}

// This will be automatically sanitized (functions removed, etc.)
const result = await spine.executeFlow('my-flow', {
  validData: 'hello',
  invalidFunction: () => console.log('this will be removed'),
  nested: {
    validNested: 'world',
    undefinedValue: undefined // This will be removed
  }
});
```

## 🌟 Examples

### Customer support bot

```typescript
import { AISpine } from 'ai-spine-sdk';

const spine = new AISpine(process.env.AI_SPINE_API_KEY);

async function handleCustomerMessage(message: string, customerId: string) {
  try {
    // Execute customer support flow
    const execution = await spine.executeFlow('customer-support', {
      message,
      customer_id: customerId,
      priority: 'normal'
    });

    // Wait for AI response
    const result = await spine.waitForExecution(execution.execution_id, {
      onProgress: (exec) => {
        console.log(`Processing customer request... (${exec.status})`);
      }
    });

    return {
      response: result.output_data.response,
      category: result.output_data.category,
      escalate: result.output_data.escalate || false
    };
  } catch (error) {
    console.error('Customer support error:', error);
    return {
      response: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
      category: 'system_error',
      escalate: true
    };
  }
}

// Usage
const response = await handleCustomerMessage(
  'I want to return my order from last week',
  'cust_123456'
);

console.log('AI Response:', response.response);
if (response.escalate) {
  console.log('⚠️ This request needs human attention');
}
```

### Content generation pipeline

```typescript
async function generateContent(topic: string, style: string) {
  const requests = [
    { id: 'outline', flowId: 'content-outline', input: { topic, style } },
    { id: 'intro', flowId: 'intro-generator', input: { topic, style } },
    { id: 'conclusion', flowId: 'conclusion-generator', input: { topic, style } }
  ];

  const results = await spine.executeBatch(requests, {
    concurrency: 3, // Generate all parts in parallel
    onProgress: (completed, total) => {
      console.log(`Content generation: ${completed}/${total} parts completed`);
    }
  });

  // Combine results
  const content = {
    outline: results.find(r => r.id === 'outline')?.result,
    intro: results.find(r => r.id === 'intro')?.result,
    conclusion: results.find(r => r.id === 'conclusion')?.result
  };

  return content;
}
```

## 🔗 Environment Support

The SDK works in multiple JavaScript environments:

- **Node.js** - Server-side applications
- **Browser** - Client-side web applications  
- **Edge Functions** - Vercel, Cloudflare Workers
- **React Native** - Mobile applications
- **Electron** - Desktop applications

## 📋 TypeScript

The SDK is built with TypeScript and provides full type safety:

```typescript
import { AISpine, ExecutionContext, Flow } from '@ai-spine/sdk';

const spine = new AISpine(apiKey);

// Full type inference
const flows: Flow[] = await spine.listFlows();
const execution: ExecutionContext = await spine.getExecution('exec-123');

// Type-safe input/output
interface CustomerSupportInput {
  message: string;
  customer_id: string;
  priority: 'low' | 'normal' | 'high';
}

interface CustomerSupportOutput {
  response: string;
  category: string;
  confidence: number;
  escalate: boolean;
}

// This will be fully typed
const result = await spine.executeFlow('customer-support', {
  message: 'I need help',
  customer_id: 'cust_123',
  priority: 'normal'
} as CustomerSupportInput);
```

## 📡 Available Endpoints

The SDK provides access to the following AI Spine API endpoints:

### Core operations
- `executeFlow(flowId, inputData)` - Execute an AI workflow
- `getExecution(executionId)` - Get execution status and results
- `waitForExecution(executionId, options)` - Poll until execution completes
- `cancelExecution(executionId)` - Cancel a running execution

### Flow management
- `listFlows()` - List all available flows
- `getFlow(flowId)` - Get flow details and configuration

### Agent management
- `listAgents()` - List all registered agents
- `createAgent(agentConfig)` - Register a new agent
- `deleteAgent(agentId)` - Remove an agent

### System information
- `healthCheck()` - Check API health status
- `getMetrics()` - Get system metrics

## 📊 Monitoring Executions

AI Spine uses polling to check execution status. The SDK provides convenient methods to wait for completion:

```typescript
// Execute and wait for completion
const result = await spine.executeFlow('analysis-flow', inputData);

// Wait with custom options
const execution = await spine.waitForExecution(result.execution_id, {
  timeout: 300000,    // Maximum wait time: 5 minutes
  interval: 2000,     // Check every 2 seconds
  onProgress: (status) => {
    console.log(`Current status: ${status.status}`);
  }
});

// Or check status manually
const status = await spine.getExecution(result.execution_id);
console.log(`Status: ${status.status}`); // 'pending' | 'running' | 'completed' | 'failed'
```


## 🐛 Debugging

Enable debug mode to see detailed request/response logs:

```typescript
const spine = new AISpine({
  apiKey: 'sk_test_...',
  debug: true // This will log all HTTP requests/responses
});

// Or enable at runtime
spine.updateConfig({ debug: true });
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

## 📞 Support

- 📧 Email: support@ai-spine.com
- 💬 Discord: [Join our community](https://discord.gg/ai-spine)
- 📖 Documentation: [https://docs.ai-spine.com](https://docs.ai-spine.com)
- 🐛 Issues: [GitHub Issues](https://github.com/ai-spine/sdk-js/issues)