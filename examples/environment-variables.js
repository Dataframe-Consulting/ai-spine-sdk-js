/**
 * Environment Variables Example
 * 
 * This example shows how to use the new environment variable features
 * introduced in SDK v2.1.0
 */

const { AISpine } = require('../dist');

async function environmentVariablesExample() {
  // Initialize the SDK
  const spine = new AISpine({
    apiKey: process.env.AI_SPINE_API_KEY || 'sk_test_your_api_key_here',
    baseURL: 'http://localhost:8000/api/v1',
    debug: true
  });

  try {
    console.log('🚀 Environment Variables Example\n');

    // 1. Register an agent with environment schema
    console.log('1. Registering restaurant agent with environment schema...');
    
    const restaurantAgent = await spine.registerAgent({
      agent_id: 'restaurant_agent_example',
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
          description: 'Default cuisine preference when none specified',
          required: false,
          default_value: 'any'
        },
        'max_party_size': {
          type: 'number',
          description: 'Maximum party size this agent can handle',
          required: false,
          default_value: 10
        }
      }
    });

    console.log('✅ Agent registered:', restaurantAgent.name);

    // 2. Get environment schema for an agent
    console.log('\n2. Getting environment schema...');
    
    const schema = await spine.getAgentEnvironmentSchema('restaurant_agent_example');
    console.log('📋 Environment schema:');
    for (const [field, config] of Object.entries(schema)) {
      console.log(`  - ${field}: ${config.type} (${config.required ? 'required' : 'optional'})`);
      console.log(`    ${config.description}`);
    }

    // 3. Validate environment variables
    console.log('\n3. Validating environment variables...');

    // Example 1: Invalid environment (missing required fields)
    const invalidEnv = {
      'default_cuisine': 'italian'
      // Missing required opentable_api_key and opentable_partner_id
    };

    const invalidResult = await spine.validateAgentEnvironment(
      'restaurant_agent_example', 
      invalidEnv
    );

    console.log('❌ Invalid environment validation:');
    console.log('  Valid:', invalidResult.valid);
    console.log('  Errors:', invalidResult.errors.map(e => `${e.field}: ${e.message}`));

    // Example 2: Valid environment
    const validEnv = {
      'opentable_api_key': 'ot_live_abcd1234567890',
      'opentable_partner_id': 'partner_12345',
      'default_cuisine': 'italian',
      'max_party_size': 8
    };

    const validResult = await spine.validateAgentEnvironment(
      'restaurant_agent_example',
      validEnv
    );

    console.log('\n✅ Valid environment validation:');
    console.log('  Valid:', validResult.valid);
    console.log('  Errors:', validResult.errors.length);

    // 4. Create a flow with environment variables
    console.log('\n4. Creating flow with environment variables...');

    const flow = await spine.createFlow({
      flow_id: 'restaurant_booking_with_env',
      name: 'Restaurant Booking with Environment',
      description: 'Restaurant booking flow using environment variables',
      nodes: [
        {
          id: 'user_input',
          type: 'input',
          agent_id: 'conversational_ai',
          config: {
            system_prompt: 'Collect restaurant booking requirements from the user',
            max_turns: 3
          }
        },
        {
          id: 'book_restaurant',
          type: 'processor',
          agent_id: 'restaurant_agent_example',
          depends_on: ['user_input'],
          config: {
            system_prompt: 'Book a restaurant reservation using OpenTable API',
            timeout: 60,
            // Environment variables for this node
            environment: {
              'opentable_api_key': 'ot_live_abcd1234567890',
              'opentable_partner_id': 'partner_12345',
              'default_cuisine': 'italian',
              'max_party_size': 8
            }
          }
        },
        {
          id: 'confirmation',
          type: 'output',
          depends_on: ['book_restaurant'],
          config: {
            format: 'json'
          }
        }
      ]
    });

    console.log('✅ Flow created:', flow.name);

    // 5. Execute the flow
    console.log('\n5. Executing flow with environment variables...');
    
    const execution = await spine.executeFlow('restaurant_booking_with_env', {
      user_request: 'I want to book a table for 4 people tonight at 7 PM for Italian food',
      location: 'downtown',
      date: new Date().toISOString().split('T')[0],
      time: '19:00'
    });

    console.log('🚀 Flow execution started:', execution.execution_id);

    // 6. Monitor execution
    const finalExecution = await spine.waitForExecution(execution.execution_id, {
      pollInterval: 2000,
      timeout: 60000
    });

    console.log('\n✅ Flow execution completed:');
    console.log('  Status:', finalExecution.status);
    console.log('  Duration:', finalExecution.completed_at && finalExecution.started_at 
      ? `${new Date(finalExecution.completed_at) - new Date(finalExecution.started_at)}ms`
      : 'N/A');

    if (finalExecution.output_data) {
      console.log('  Result:', JSON.stringify(finalExecution.output_data, null, 2));
    }

    // 7. Clean up - remove the test agent
    console.log('\n7. Cleaning up...');
    await spine.removeAgent('restaurant_agent_example');
    console.log('✅ Test agent removed');

  } catch (error) {
    console.error('❌ Error in environment variables example:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

// Run the example
if (require.main === module) {
  environmentVariablesExample()
    .then(() => {
      console.log('\n🎉 Environment variables example completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}

module.exports = { environmentVariablesExample };