# AI Spine JavaScript SDK

The official JavaScript SDK for AI Spine - **The Stripe for AI Agent Orchestration**.

AI Spine makes it incredibly easy to orchestrate AI agents and build sophisticated AI workflows. Just like Stripe simplified payments, AI Spine simplifies AI agent coordination.

## 🚀 Quick Start

### Installation

```bash
npm install @ai-spine/sdk
# or
yarn add @ai-spine/sdk
# or
pnpm add @ai-spine/sdk
```

### Basic Usage

```typescript
import { AISpine } from '@ai-spine/sdk';

// Initialize with your API key
const spine = new AISpine('sk_test_your_api_key_here');

// Execute a flow
const result = await spine.executeFlow('customer-support', {
  message: 'I need help with my order'
});

console.log('Execution started:', result.execution_id);

// Wait for completion and get results
const execution = await spine.waitForExecution(result.execution_id);
console.log('Final result:', execution.output_data);
```

## 📚 Documentation

### Configuration

You can configure the SDK during initialization:

```typescript
import { AISpine } from '@ai-spine/sdk';

const spine = new AISpine({
  apiKey: 'sk_test_your_api_key_here',
  baseURL: 'https://api.ai-spine.com/v1', // Custom API URL
  timeout: 30000, // 30 second timeout
  retries: 3, // Retry failed requests 3 times
  debug: true // Enable debug logging
});
```

### Flow Execution

#### Execute a Flow

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

#### Wait for Completion

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

#### Get Execution Status

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

### Flow Management

#### List Available Flows

```typescript
const flows = await spine.listFlows();

flows.forEach(flow => {
  console.log(`${flow.name}: ${flow.description}`);
  console.log(`Nodes: ${flow.nodes.length}`);
});
```

#### Get Flow Details

```typescript
const flow = await spine.getFlow('customer-support');

console.log(`Flow: ${flow.name}`);
console.log(`Description: ${flow.description}`);
console.log('Nodes:');
flow.nodes.forEach(node => {
  console.log(`  - ${node.id} (${node.type}): ${node.agent_id}`);
});
```

### Agent Management

#### List Registered Agents

```typescript
const agents = await spine.listAgents();

agents.forEach(agent => {
  console.log(`${agent.name} (${agent.status})`);
  console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
  console.log(`  Endpoint: ${agent.endpoint}`);
});
```

#### Register a New Agent

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

#### Test Agent Connection

```typescript
const testResult = await spine.testAgent('https://my-agent.example.com/api');

if (testResult.connected) {
  console.log('Agent is reachable and responding');
} else {
  console.log('Agent connection failed:', testResult.message);
}
```

### Batch Processing

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

### System Monitoring

#### Health Check

```typescript
const health = await spine.healthCheck();

console.log(`System status: ${health.status}`);
console.log(`Version: ${health.version}`);
console.log(`Database: ${health.database}`);
console.log(`Uptime: ${health.uptime}s`);
```

#### Get Metrics

```typescript
const metrics = await spine.getMetrics();

console.log(`Total executions: ${metrics.total_executions}`);
console.log(`Success rate: ${(metrics.successful_executions / metrics.total_executions * 100).toFixed(1)}%`);
console.log(`Average execution time: ${metrics.average_execution_time}ms`);
```

### Environment Variables (NEW in v2.1.0)

The SDK now supports environment variable management for agents, making it easy to handle API keys, credentials, and configuration.

#### Register Agent with Environment Schema

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

#### Validate Environment Variables

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

#### Use Environment Variables in Flows

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

#### Environment Field Types

- **`string`**: Regular text fields
- **`number`**: Numeric values
- **`boolean`**: True/false values
- **`password`**: Sensitive fields (API keys, secrets) - handled as strings but marked as sensitive for UI

## 🔧 Advanced Usage

### Error Handling

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

### Custom Configuration Updates

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

### Input Validation and Sanitization

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

### Customer Support Bot

```typescript
import { AISpine } from '@ai-spine/sdk';

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

### Content Generation Pipeline

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

## 🪝 Webhooks

Set up webhooks to receive real-time notifications about AI Spine events:

### Creating Webhooks

```typescript
// Create a webhook endpoint
const webhook = await spine.createWebhook({
  url: 'https://your-app.com/webhooks/ai-spine',
  events: [
    'execution.completed',
    'execution.failed',
    'agent.registered'
  ],
  secret: 'whsec_your_secret_key'
});

console.log(webhook.webhook_id);
```

### Handling Webhook Events

```typescript
// Register event handlers
spine.onWebhook('execution.completed', (event) => {
  console.log(`Execution ${event.data.execution.execution_id} completed!`);
  console.log('Result:', event.data.execution.output_data);
});

spine.onWebhook('execution.failed', (event) => {
  console.error(`Execution failed: ${event.data.execution.error_message}`);
});

// Handle all events with wildcard
spine.onWebhook('*', (event) => {
  console.log(`Event received: ${event.event}`);
});
```

### Webhook Server Example

```typescript
import express from 'express';
import { createWebhookMiddleware, WebhookSignature } from '@ai-spine/sdk';

const app = express();
const webhookSecret = 'whsec_your_secret_key';

// Use middleware for automatic signature verification
app.use('/webhooks/ai-spine', express.raw({ type: 'application/json' }));
app.use('/webhooks/ai-spine', createWebhookMiddleware(webhookSecret));

app.post('/webhooks/ai-spine', (req, res) => {
  const event = JSON.parse(req.body);
  
  switch (event.event) {
    case 'execution.completed':
      handleExecutionCompleted(event.data.execution);
      break;
    case 'execution.failed':
      handleExecutionFailed(event.data.execution);
      break;
    case 'agent.registered':
      handleAgentRegistered(event.data.agent);
      break;
  }
  
  res.status(200).json({ received: true });
});

app.listen(3000);
```

### Manual Signature Verification

```typescript
import { WebhookSignature } from '@ai-spine/sdk';

// Verify webhook signature manually
const signature = req.headers['x-ai-spine-signature'];
const payload = req.body;
const secret = 'whsec_your_secret_key';

const verification = WebhookSignature.verify(signature, payload, secret);

if (!verification.valid) {
  return res.status(401).json({ error: verification.error });
}

// Process webhook...
```

### Webhook Management

```typescript
// List all webhooks
const webhooks = await spine.listWebhooks();

// Update webhook configuration
const updated = await spine.updateWebhook(webhookId, {
  events: ['*'], // Listen to all events
  active: true
});

// Test webhook endpoint
const delivery = await spine.testWebhook(webhookId, 'execution.completed');

// View delivery history
const deliveries = await spine.getWebhookDeliveries(webhookId);

// Retry failed delivery
if (delivery.status === 'failed') {
  await spine.retryWebhookDelivery(webhookId, delivery.id);
}

// Delete webhook
await spine.deleteWebhook(webhookId);
```

### Supported Events

- `execution.started` - When a flow execution begins
- `execution.completed` - When a flow execution completes successfully
- `execution.failed` - When a flow execution fails
- `execution.node.completed` - When a node in a flow completes
- `execution.node.failed` - When a node in a flow fails
- `agent.registered` - When a new agent is registered
- `agent.updated` - When an agent configuration is updated
- `agent.removed` - When an agent is removed
- `flow.created` - When a new flow is created
- `flow.updated` - When a flow is updated
- `flow.deleted` - When a flow is deleted
- `system.health.changed` - When system health status changes
- `*` - All events (wildcard)

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