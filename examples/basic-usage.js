/**
 * Basic AI Spine SDK Usage Example
 * 
 * This example demonstrates the core functionality of the AI Spine SDK
 */

const { AISpine, InsufficientCreditsError, RateLimitError } = require('@ai-spine/sdk');

async function main() {
  // Initialize the SDK with API key (required)
  const spine = new AISpine({
    apiKey: process.env.AI_SPINE_API_KEY || 'sk_test_your_api_key_here',
    // baseURL: 'https://ai-spine-api-production.up.railway.app', // Default production API
    debug: true, // Enable debug logging
    onCreditsLow: (credits) => {
      console.warn(`⚠️  Low credits warning: ${credits} remaining`);
    }
  });

  try {
    console.log('🚀 AI Spine SDK Basic Usage Example\n');

    // 1. Check user info and credits
    console.log('1. Checking user info and credits...');
    const user = await spine.getCurrentUser();
    console.log(`   User: ${user.email}`);
    console.log(`   Plan: ${user.plan}`);
    console.log(`   Credits remaining: ${user.credits}`);
    
    const credits = await spine.checkCredits();
    if (credits < 100) {
      console.warn(`   ⚠️  Low credits! Please top up at https://ai-spine.com/billing`);
    }
    console.log();

    // 2. Check system health
    console.log('2. Checking system health...');
    const health = await spine.healthCheck();
    console.log(`   Status: ${health.status}`);
    console.log(`   Version: ${health.version || 'unknown'}\n`);

    // 3. List available flows
    console.log('3. Listing available flows...');
    const flows = await spine.listFlows();
    console.log(`   Found ${flows.length} flows:`);
    flows.forEach(flow => {
      console.log(`   - ${flow.name}: ${flow.description}`);
      console.log(`     ID: ${flow.flow_id} (${flow.nodes.length} nodes)`);
    });
    console.log();

    // 4. List registered agents
    console.log('4. Listing registered agents...');
    const agents = await spine.listAgents();
    console.log(`   Found ${agents.length} agents:`);
    agents.forEach(agent => {
      console.log(`   - ${agent.name} (${agent.status})`);
      console.log(`     Capabilities: ${agent.capabilities.join(', ')}`);
      console.log(`     Endpoint: ${agent.endpoint}`);
    });
    console.log();

    // 5. Execute a flow (if available)
    if (flows.length > 0) {
      const flowToExecute = flows[0]; // Use the first available flow
      console.log(`5. Executing flow: ${flowToExecute.name}`);
      
      const executionRequest = {
        user_query: 'Hello, I need help with my account'
      };

      console.log('   Input:', JSON.stringify(executionRequest, null, 2));
      
      const execution = await spine.executeFlow(flowToExecute.flow_id, executionRequest);
      console.log(`   Execution started: ${execution.execution_id}`);
      console.log(`   Status: ${execution.status}`);

      // 6. Wait for completion
      console.log('\n6. Waiting for execution to complete...');
      const result = await spine.waitForExecution(execution.execution_id, {
        timeout: 60000, // 1 minute timeout
        interval: 2000,  // Check every 2 seconds
        onProgress: (exec) => {
          console.log(`   Status: ${exec.status} (${exec.execution_id})`);
        }
      });

      console.log('\n✅ Execution completed!');
      console.log('   Final Status:', result.status);
      console.log('   Started:', result.started_at);
      console.log('   Completed:', result.completed_at);
      
      if (result.output_data) {
        console.log('   Output:', JSON.stringify(result.output_data, null, 2));
      }
      
      if (result.error_message) {
        console.log('   Error:', result.error_message);
      }

      // 7. Show node execution details
      console.log('\n7. Node execution details:');
      Object.entries(result.node_results).forEach(([nodeId, nodeResult]) => {
        console.log(`   Node: ${nodeId}`);
        console.log(`   - Status: ${nodeResult.status}`);
        console.log(`   - Duration: ${nodeResult.duration || 'unknown'}ms`);
        if (nodeResult.error_message) {
          console.log(`   - Error: ${nodeResult.error_message}`);
        }
      });
    } else {
      console.log('5. No flows available for execution');
    }

    // 8. Get system metrics
    console.log('\n8. Getting system metrics...');
    const metrics = await spine.getMetrics();
    console.log(`   Total executions: ${metrics.total_executions}`);
    console.log(`   Successful: ${metrics.successful_executions}`);
    console.log(`   Failed: ${metrics.failed_executions}`);
    if (metrics.total_executions > 0) {
      const successRate = (metrics.successful_executions / metrics.total_executions * 100).toFixed(1);
      console.log(`   Success rate: ${successRate}%`);
    }
    console.log(`   Average execution time: ${metrics.average_execution_time}ms`);

    console.log('\n🎉 Example completed successfully!');

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    
    // Handle specific error types
    if (error instanceof InsufficientCreditsError) {
      console.error('   No credits remaining! Top up at https://ai-spine.com/billing');
      if (error.creditsNeeded) {
        console.error(`   Credits needed: ${error.creditsNeeded}`);
      }
    } else if (error instanceof RateLimitError) {
      console.error('   Rate limit exceeded. Please wait before retrying.');
      if (error.retryAfter) {
        console.error(`   Retry after: ${error.retryAfter} seconds`);
      }
    } else {
      if (error.code) {
        console.error('   Error code:', error.code);
      }
      
      if (error.status) {
        console.error('   HTTP status:', error.status);
      }
      
      if (error.details) {
        console.error('   Details:', JSON.stringify(error.details, null, 2));
      }
    }
    
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}