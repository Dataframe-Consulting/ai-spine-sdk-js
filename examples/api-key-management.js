/**
 * Example: API Key Management
 * 
 * This example demonstrates how to manage user API keys programmatically
 * using the AI Spine SDK.
 */

const { AISpine } = require('ai-spine-sdk');

// Initialize the SDK
// Note: API key is optional for user management endpoints
const spine = new AISpine({
  // No apiKey needed for user management methods
  baseURL: 'https://ai-spine-api.up.railway.app'
});

/**
 * Check if a user has an API key
 */
async function checkUserKey(userId) {
  try {
    const status = await spine.checkUserApiKey(userId);
    
    if (!status.has_api_key) {
      console.log('❌ User does not have an API key');
      return null;
    }
    
    console.log('✅ User has an API key');
    console.log('  - Key:', status.api_key);
    console.log('  - Credits:', status.credits);
    console.log('  - Rate limit:', status.rate_limit);
    console.log('  - Created:', status.created_at);
    console.log('  - Last used:', status.last_used_at || 'Never');
    
    return status.api_key;
  } catch (error) {
    console.error('Error checking API key:', error.message);
    throw error;
  }
}

/**
 * Generate a new API key for a user
 */
async function generateKey(userId) {
  try {
    const result = await spine.generateUserApiKey(userId);
    
    if (result.action === 'created') {
      console.log('🆕 Created new API key');
    } else {
      console.log('🔄 Regenerated API key');
    }
    
    console.log('  - New key:', result.api_key);
    console.log('  - Message:', result.message);
    
    return result.api_key;
  } catch (error) {
    console.error('Error generating API key:', error.message);
    throw error;
  }
}

/**
 * Revoke a user's API key
 */
async function revokeKey(userId) {
  try {
    const result = await spine.revokeUserApiKey(userId);
    
    console.log('🗑️ API key revoked');
    console.log('  - Status:', result.status);
    console.log('  - Message:', result.message);
    
    return result;
  } catch (error) {
    console.error('Error revoking API key:', error.message);
    throw error;
  }
}

/**
 * Complete API key lifecycle demo
 */
async function demonstrateLifecycle() {
  // Example user ID (you would get this from Supabase Auth)
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  
  console.log('=== API Key Management Demo ===\n');
  console.log('User ID:', userId);
  console.log('\n--- Step 1: Check current status ---');
  
  // Check if user has a key
  let apiKey = await checkUserKey(userId);
  
  if (!apiKey) {
    console.log('\n--- Step 2: Generate first API key ---');
    apiKey = await generateKey(userId);
    
    console.log('\n--- Step 3: Verify key was created ---');
    await checkUserKey(userId);
  }
  
  console.log('\n--- Step 4: Regenerate key (simulating compromise) ---');
  const newApiKey = await generateKey(userId);
  
  console.log('\n--- Step 5: Verify new key ---');
  await checkUserKey(userId);
  
  console.log('\n--- Step 6: Revoke API key ---');
  await revokeKey(userId);
  
  console.log('\n--- Step 7: Verify key was revoked ---');
  await checkUserKey(userId);
  
  console.log('\n=== Demo Complete ===');
}

/**
 * Example: Integrate with your user management system
 */
class UserApiKeyManager {
  constructor(database) {
    this.db = database;
    this.spine = new AISpine({
      // No apiKey needed for user management methods
      baseURL: 'https://ai-spine-api.up.railway.app'
    });
  }
  
  /**
   * Ensure user has an API key
   */
  async ensureApiKey(userId) {
    // Check if we have a stored key
    const storedKey = await this.db.getApiKey(userId);
    
    if (storedKey) {
      // Verify it's still valid
      const status = await this.spine.checkUserApiKey(userId);
      if (status.has_api_key && status.api_key === storedKey) {
        return storedKey;
      }
    }
    
    // Generate new key
    const result = await this.spine.generateUserApiKey(userId);
    
    // Store in database
    await this.db.saveApiKey(userId, result.api_key);
    
    // Send email to user (optional)
    await this.sendApiKeyEmail(userId, result.api_key, result.action);
    
    return result.api_key;
  }
  
  /**
   * Handle compromised key
   */
  async handleCompromisedKey(userId) {
    // Regenerate immediately
    const result = await this.spine.generateUserApiKey(userId);
    
    // Update database
    await this.db.updateApiKey(userId, result.api_key);
    
    // Notify user
    await this.sendSecurityAlert(userId, 'API key was regenerated due to security concerns');
    
    return result.api_key;
  }
  
  /**
   * Clean up when user is deleted
   */
  async cleanupUser(userId) {
    // Revoke API key
    await this.spine.revokeUserApiKey(userId);
    
    // Remove from database
    await this.db.deleteApiKey(userId);
    
    console.log(`Cleaned up API key for user ${userId}`);
  }
  
  async sendApiKeyEmail(userId, apiKey, action) {
    // Implementation would send email
    console.log(`Email sent to user ${userId}: Your API key was ${action}`);
  }
  
  async sendSecurityAlert(userId, message) {
    // Implementation would send security alert
    console.log(`Security alert sent to user ${userId}: ${message}`);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateLifecycle().catch(console.error);
}

module.exports = {
  checkUserKey,
  generateKey,
  revokeKey,
  UserApiKeyManager
};