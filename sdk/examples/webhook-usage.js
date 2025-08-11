/**
 * AI Spine SDK Webhook Usage Example
 * 
 * This example demonstrates webhook functionality including:
 * - Creating webhook endpoints
 * - Handling webhook events
 * - Signature verification
 * - Retry mechanisms
 */

const { AISpine, WebhookSignature, createWebhookMiddleware } = require('@ai-spine/sdk');
const express = require('express'); // npm install express

async function webhookExample() {
  // Initialize the SDK
  const spine = new AISpine({
    apiKey: process.env.AI_SPINE_API_KEY || 'sk_test_your_api_key_here',
    baseURL: 'http://localhost:8000/api/v1',
    debug: true,
  });

  try {
    console.log('🪝 AI Spine SDK Webhook Example\n');

    // 1. Create a webhook endpoint
    console.log('1. Creating webhook endpoint...');
    const webhook = await spine.createWebhook({
      url: 'https://your-app.com/webhooks/ai-spine',
      events: [
        'execution.completed',
        'execution.failed',
        'agent.registered',
        'flow.created'
      ],
      secret: 'whsec_your_webhook_secret_here',
      headers: {
        'X-Custom-Header': 'your-value'
      }
    });

    console.log(`   Created webhook: ${webhook.webhook_id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Events: ${webhook.events.join(', ')}\n`);

    // 2. List all webhooks
    console.log('2. Listing all webhook endpoints...');
    const webhooks = await spine.listWebhooks();
    console.log(`   Found ${webhooks.length} webhook(s):`);
    webhooks.forEach(wh => {
      console.log(`   - ${wh.webhook_id}: ${wh.url} (${wh.events.length} events)`);
      console.log(`     Success: ${wh.success_count}, Failures: ${wh.failure_count}`);
    });
    console.log();

    // 3. Test the webhook
    console.log('3. Testing webhook endpoint...');
    const testDelivery = await spine.testWebhook(webhook.webhook_id, 'execution.completed');
    console.log(`   Test delivery: ${testDelivery.id}`);
    console.log(`   Status: ${testDelivery.status}`);
    console.log(`   Response status: ${testDelivery.response_status || 'pending'}\n`);

    // 4. Get webhook delivery history
    console.log('4. Getting webhook delivery history...');
    const deliveries = await spine.getWebhookDeliveries(webhook.webhook_id);
    console.log(`   Found ${deliveries.length} delivery attempt(s):`);
    deliveries.forEach(delivery => {
      console.log(`   - ${delivery.id}: ${delivery.status} (${delivery.attempts} attempts)`);
      if (delivery.error_message) {
        console.log(`     Error: ${delivery.error_message}`);
      }
    });
    console.log();

    // 5. Update webhook configuration
    console.log('5. Updating webhook configuration...');
    const updatedWebhook = await spine.updateWebhook(webhook.webhook_id, {
      events: [...webhook.events, 'execution.started'], // Add new event
      active: true
    });
    console.log(`   Updated events: ${updatedWebhook.events.join(', ')}\n`);

    // 6. Register event handlers
    console.log('6. Setting up webhook event handlers...');
    
    spine.onWebhook('execution.completed', (event) => {
      console.log(`✅ Execution completed: ${event.data.execution?.execution_id}`);
      console.log(`   Status: ${event.data.execution?.status}`);
      console.log(`   Duration: ${event.data.execution?.completed_at - event.data.execution?.started_at}ms`);
    });

    spine.onWebhook('execution.failed', (event) => {
      console.log(`❌ Execution failed: ${event.data.execution?.execution_id}`);
      console.log(`   Error: ${event.data.execution?.error_message}`);
    });

    spine.onWebhook('agent.registered', (event) => {
      console.log(`🤖 New agent registered: ${event.data.agent?.name}`);
      console.log(`   Capabilities: ${event.data.agent?.capabilities.join(', ')}`);
    });

    // Wildcard handler for all events
    spine.onWebhook('*', (event) => {
      console.log(`📨 Received webhook event: ${event.event}`);
    });

    console.log('   Event handlers registered for all webhook events\n');

    console.log('✅ Webhook example completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Set up your webhook endpoint to receive events');
    console.log('   2. Use WebhookSignature.verify() to validate incoming webhooks');
    console.log('   3. Implement proper error handling and retries');
    console.log('   4. Monitor webhook delivery success rates');

  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    
    if (error.status) {
      console.error('   HTTP status:', error.status);
    }
  }
}

/**
 * Express.js webhook endpoint example
 * This shows how to create a webhook endpoint that receives AI Spine events
 */
function createWebhookServer() {
  const app = express();
  const port = 3000;
  const webhookSecret = 'whsec_your_webhook_secret_here';

  // Use raw body parser for webhook signature verification
  app.use('/webhooks/ai-spine', express.raw({ type: 'application/json' }));

  // Apply webhook verification middleware
  app.use('/webhooks/ai-spine', createWebhookMiddleware(webhookSecret));

  // Webhook endpoint
  app.post('/webhooks/ai-spine', (req, res) => {
    try {
      const event = JSON.parse(req.body);
      
      console.log(`📨 Received webhook: ${event.event}`);
      console.log(`   Event ID: ${event.id}`);
      console.log(`   Timestamp: ${event.timestamp}`);
      
      // Handle different event types
      switch (event.event) {
        case 'execution.completed':
          console.log(`✅ Execution ${event.data.execution.execution_id} completed`);
          break;
          
        case 'execution.failed':
          console.log(`❌ Execution ${event.data.execution.execution_id} failed`);
          console.log(`   Error: ${event.data.execution.error_message}`);
          break;
          
        case 'agent.registered':
          console.log(`🤖 Agent ${event.data.agent.name} registered`);
          break;
          
        default:
          console.log(`   Event data:`, JSON.stringify(event.data, null, 2));
      }
      
      // Respond with 200 to acknowledge receipt
      res.status(200).json({ received: true });
      
    } catch (error) {
      console.error('❌ Error processing webhook:', error.message);
      res.status(400).json({ error: 'Invalid webhook payload' });
    }
  });

  app.listen(port, () => {
    console.log(`🚀 Webhook server listening on port ${port}`);
    console.log(`   Webhook URL: http://localhost:${port}/webhooks/ai-spine`);
  });
}

/**
 * Manual webhook signature verification example
 */
function manualSignatureVerification() {
  const payload = JSON.stringify({
    id: 'evt_123',
    event: 'execution.completed',
    data: { execution: { execution_id: 'exec_456' } },
    timestamp: new Date().toISOString()
  });

  const secret = 'whsec_your_webhook_secret_here';
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Generate signature
  const signature = WebhookSignature.generate({
    secret,
    timestamp,
    payload
  });

  console.log('🔐 Webhook signature verification example:');
  console.log(`   Generated signature: ${signature}`);

  // Verify signature
  const verification = WebhookSignature.verify(signature, payload, secret);
  console.log(`   Verification result: ${verification.valid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (!verification.valid && verification.error) {
    console.log(`   Error: ${verification.error}`);
  }
}

// Run examples
if (require.main === module) {
  console.log('Choose an example to run:');
  console.log('1. node webhook-usage.js webhook - Full webhook example');
  console.log('2. node webhook-usage.js server - Start webhook server');
  console.log('3. node webhook-usage.js signature - Signature verification example');

  const command = process.argv[2];
  
  switch (command) {
    case 'webhook':
      webhookExample();
      break;
    case 'server':
      createWebhookServer();
      break;
    case 'signature':
      manualSignatureVerification();
      break;
    default:
      webhookExample();
  }
}