/**
 * Flow CRUD Operations Example
 * 
 * This example demonstrates how to create, read, update, and delete flows
 * using the AI Spine SDK with Supabase authentication.
 */

const { AISpine } = require('ai-spine-sdk');

// Note: In a real application, you would get the Supabase token from your auth system
// For example, from @supabase/auth-helpers-react: const { session } = useSession();
const SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function main() {
  // Initialize SDK with Supabase token for flow management
  const spine = new AISpine({
    supabaseToken: SUPABASE_TOKEN,
    apiKey: process.env.AI_SPINE_API_KEY, // Optional for flow CRUD, required for execution
    debug: true
  });

  try {
    // 1. Create a new flow
    console.log('\n=== Creating a new flow ===');
    const newFlow = await spine.createFlow({
      flow_id: 'customer-sentiment-analysis',
      name: 'Customer Sentiment Analysis',
      description: 'Analyzes customer feedback and generates insights',
      entry_point: 'input',
      exit_points: ['output'],
      nodes: [
        {
          id: 'input',
          type: 'input',
          config: {
            description: 'Receives customer feedback text'
          }
        },
        {
          id: 'sentiment-analyzer',
          type: 'processor',
          agent_id: 'sentiment_agent',
          depends_on: ['input'],
          config: {
            system_prompt: 'Analyze the sentiment of the provided text',
            timeout: 30000
          }
        },
        {
          id: 'insight-generator',
          type: 'processor',
          agent_id: 'insight_agent',
          depends_on: ['sentiment-analyzer'],
          config: {
            system_prompt: 'Generate actionable insights from sentiment analysis',
            timeout: 30000
          }
        },
        {
          id: 'output',
          type: 'output',
          depends_on: ['insight-generator'],
          config: {
            format: 'json'
          }
        }
      ],
      metadata: {
        category: 'customer-service',
        tags: ['sentiment', 'analysis', 'insights']
      }
    });

    console.log('Flow created successfully!');
    console.log(`Flow ID: ${newFlow.flow_id}`);
    console.log(`Version: ${newFlow.version}`);
    console.log(`Created by: ${newFlow.created_by}`);

    // 2. List all user's flows
    console.log('\n=== Listing my flows ===');
    const myFlows = await spine.getMyFlows();
    
    console.log(`Total flows: ${myFlows.count}`);
    myFlows.flows.forEach(flow => {
      console.log(`- ${flow.name} (${flow.flow_id}) - v${flow.version}`);
    });

    // 3. Update the flow
    console.log('\n=== Updating the flow ===');
    const updatedFlow = await spine.updateFlow('customer-sentiment-analysis', {
      description: 'Enhanced customer feedback analyzer with sentiment and insights',
      nodes: [
        {
          id: 'input',
          type: 'input',
          config: {
            description: 'Receives customer feedback text'
          }
        },
        {
          id: 'language-detector',
          type: 'processor',
          agent_id: 'language_agent',
          depends_on: ['input'],
          config: {
            system_prompt: 'Detect the language of the input text'
          }
        },
        {
          id: 'sentiment-analyzer',
          type: 'processor',
          agent_id: 'sentiment_agent',
          depends_on: ['language-detector'],
          config: {
            system_prompt: 'Analyze the sentiment of the provided text',
            timeout: 30000
          }
        },
        {
          id: 'insight-generator',
          type: 'processor',
          agent_id: 'insight_agent',
          depends_on: ['sentiment-analyzer'],
          config: {
            system_prompt: 'Generate actionable insights from sentiment analysis',
            timeout: 30000
          }
        },
        {
          id: 'output',
          type: 'output',
          depends_on: ['insight-generator'],
          config: {
            format: 'json'
          }
        }
      ],
      metadata: {
        category: 'customer-service',
        tags: ['sentiment', 'analysis', 'insights', 'multilingual'],
        updated_reason: 'Added language detection step'
      }
    });

    console.log('Flow updated successfully!');
    console.log(`New version: ${updatedFlow.version}`);
    console.log(`Updated at: ${updatedFlow.updated_at}`);

    // 4. Execute the flow (requires API key)
    if (process.env.AI_SPINE_API_KEY) {
      console.log('\n=== Executing the flow ===');
      const execution = await spine.executeFlow('customer-sentiment-analysis', {
        input_data: {
          text: 'I love this product! It works perfectly and the support team is amazing.'
        }
      });

      console.log(`Execution started: ${execution.execution_id}`);
      console.log('Waiting for completion...');

      const result = await spine.waitForExecution(execution.execution_id);
      console.log('Execution completed!');
      console.log('Results:', JSON.stringify(result.output_data, null, 2));
    }

    // 5. Delete a flow (commented out to preserve the example flow)
    // console.log('\n=== Deleting the flow ===');
    // const deleteResult = await spine.deleteFlow('customer-sentiment-analysis');
    // console.log('Flow deleted:', deleteResult.message);

  } catch (error) {
    console.error('Error:', error.message);
    
    // Handle specific error cases
    if (error.status === 409) {
      console.log('Flow already exists. Try with a different flow_id.');
    } else if (error.status === 403) {
      console.log('You do not have permission to modify this flow.');
    } else if (error.status === 404) {
      console.log('Flow not found.');
    } else if (error.status === 401) {
      console.log('Authentication failed. Check your Supabase token.');
    }
  }
}

// Error handling for different scenarios
async function demonstrateErrorHandling() {
  const spine = new AISpine({
    supabaseToken: SUPABASE_TOKEN,
    debug: false
  });

  console.log('\n=== Demonstrating Error Handling ===');

  // Attempt to update a system flow (should fail)
  try {
    await spine.updateFlow('credit_analysis', { name: 'My Credit Analysis' });
  } catch (error) {
    console.log('✓ Cannot update system flow:', error.message);
  }

  // Attempt to delete a system flow (should fail)
  try {
    await spine.deleteFlow('credit_analysis');
  } catch (error) {
    console.log('✓ Cannot delete system flow:', error.message);
  }

  // Attempt to create flow without authentication (should fail)
  try {
    const unauthSpine = new AISpine({ apiKey: 'sk_test' });
    await unauthSpine.createFlow({
      flow_id: 'test',
      name: 'Test',
      description: 'Test',
      nodes: [],
      entry_point: 'input'
    });
  } catch (error) {
    console.log('✓ Cannot create flow without authentication:', error.message);
  }
}

// Run the examples
if (require.main === module) {
  if (!SUPABASE_TOKEN) {
    console.error('Please set SUPABASE_ACCESS_TOKEN environment variable');
    console.log('Example: SUPABASE_ACCESS_TOKEN=your_token node flow-crud.js');
    process.exit(1);
  }

  main()
    .then(() => demonstrateErrorHandling())
    .then(() => {
      console.log('\n✅ All examples completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { main };