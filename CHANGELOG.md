# Changelog

## [Unreleased]

## [2.5.3] - 2025-01-15

### Fixed
- **CRITICAL**: Fixed agent_type validation error causing 500 response
- Changed default agent_type from 'custom' to 'processor' 
- agent_type now only accepts: 'input', 'processor', 'output', 'conditional'
- Removed invalid 'custom' option that was causing server errors

## [2.5.2] - 2025-01-15

### Fixed
- **CRITICAL**: Fixed all API endpoints to use correct `/api/v1/` prefix
- Agent registration was failing with 401 due to incorrect path `/agents` instead of `/api/v1/agents`
- Fixed paths for: agents, flows, executions endpoints
- All API calls now correctly use `/api/v1/` prefix

## [2.5.1] - 2025-01-15

### Fixed
- Fixed agent registration error 500 by adding required `agent_type` field
- Agent registration now properly sends `agent_type` with default value 'custom'
- Added `is_active` field with default value `true` for agent registration

### Changed
- Updated `Agent` and `AgentConfig` types to include `agent_type` and `is_active` fields
- `agent_type` accepts: 'input', 'processor', 'output', or 'custom'

## [2.5.0] - 2025-01-15

### Added
- **Flow CRUD Operations**: Full support for creating, reading, updating, and deleting flows
  - `createFlow()` - Create new custom flows with Supabase authentication
  - `getMyFlows()` - List all flows created by the authenticated user
  - `updateFlow()` - Update existing flows (requires ownership)
  - `deleteFlow()` - Delete flows (requires ownership, system flows protected)
- New TypeScript types for flow management:
  - `FlowDefinition` - Complete flow structure with metadata
  - `FlowCreateRequest` - Request payload for creating flows
  - `FlowUpdateRequest` - Request payload for updating flows
  - `MyFlowsResponse` - Response from getMyFlows endpoint
  - `FlowDeleteResponse` - Response from flow deletion
- Flow versioning support - flows automatically increment version on update
- Flow ownership tracking - only flow creators can modify/delete their flows
- Comprehensive test suite for all flow CRUD operations

### Changed
- Flow type extended with new fields: `version`, `created_by`, `is_active`, `exit_points`
- All flow CRUD operations require Supabase authentication token
- System flows (without `created_by`) are protected from deletion

### Security
- Flow operations properly validate ownership before allowing modifications
- Supabase token required for all flow management endpoints
- User can only see and modify their own flows

## [2.4.2] - 2025-01-14

### Fixed
- Fixed TypeScript type definitions not being generated correctly in build
- Fixed `supabaseToken` property not being recognized in TypeScript
- Simplified config type definitions to properly support optional supabaseToken

## [2.4.1] - 2025-01-14

### Fixed
- Fixed incorrect warning when initializing SDK with Supabase token but no API key
- Fixed "Refused to set unsafe header User-Agent" error in browsers
- Added X-SDK-Version header for browser compatibility
- User-Agent header now only set in Node.js environments

## [2.4.0] - 2025-01-14

### Added
- **Dual Authentication System**: Support for both API key and Supabase token authentication
- New secure user account methods using Supabase authentication:
  - `getUserProfile()` - Get user profile information
  - `getUserApiKeyStatus()` - Get API key status with masked key
  - `generateApiKey()` - Generate or regenerate API key
  - `revokeApiKey()` - Revoke user's API key
- New TypeScript types for secure endpoints:
  - `UserProfile` - User profile data
  - `UserApiKeyStatus` - Secure API key status response
  - `UserApiKeyGenerateResponse` - Secure key generation response
- `supabaseToken` configuration option for authenticated requests

### Changed
- Clear separation between authentication methods:
  - Supabase token for user account management (`/api/v1/user/account/*`)
  - API key for API operations (`/api/v1/flows/*`, `/api/v1/agents/*`)
- Improved initialization warnings for missing credentials

### Deprecated
- Old user key management methods (still functional but will be removed in v3.0.0):
  - `checkUserApiKey(userId)` - Use `getUserApiKeyStatus()` instead
  - `generateUserApiKey(userId)` - Use `generateApiKey()` instead
  - `revokeUserApiKey(userId)` - Use `revokeApiKey()` instead

### Security
- User account endpoints now require proper Supabase authentication
- API keys are masked in status responses for security
- No more passing user IDs as parameters (extracted from token)

## [2.3.1] - 2025-01-14

### Fixed
- API key is now optional when initializing the SDK for user management endpoints
- Users can now access Settings page without an API key to generate their first key
- Fixed initialization blocker that prevented users from using `checkUserApiKey`, `generateUserApiKey`, and `revokeUserApiKey` methods

### Changed
- SDK now initializes with a placeholder key (`sk_no_auth_required`) when no API key is provided
- Console warning is shown when SDK is initialized without an API key
- Updated examples and documentation to show API key is optional for user management

## [2.3.0] - 2025-01-14

### Added
- New API key management methods for user-level key operations
  - `checkUserApiKey(userId)` - Check if a user has an API key
  - `generateUserApiKey(userId)` - Generate or regenerate a user's API key
  - `revokeUserApiKey(userId)` - Revoke (delete) a user's API key
- TypeScript types for API key management responses
  - `ApiKeyStatus` - Status and details of a user's API key
  - `ApiKeyGenerateResponse` - Response from key generation
  - `ApiKeyRevokeResponse` - Response from key revocation
- Comprehensive test suite for API key management
- New example file demonstrating API key lifecycle management
- API Key Management section in README with complete examples

### Changed
- API key management endpoints do not require authentication (Bearer token)
- Updated version to 2.3.0 across all package files

## [2.2.1] - 2024-01-13

### Added
- Automated GitHub Release creation from CHANGELOG.md
- CHANGELOG.md for better version tracking

### Fixed
- GitHub Actions workflow permissions for creating tags

### Changed
- Workflow now extracts release notes from CHANGELOG.md

## [2.2.0] - 2024-01-13

### Added
- API key is now required for all requests
- New `getCurrentUser()` method to retrieve user information
- New `checkCredits()` method to check remaining credits
- `InsufficientCreditsError` class for credit-related errors
- `onCreditsLow` callback option to notify when credits are running low
- Automatic GitHub Actions workflow for npm publishing

### Changed
- API key validation now warns if key doesn't start with "sk_"
- Updated error handling to detect credit-related 403 errors
- Enhanced TypeScript types with `UserInfo` and `APIKeyInfo`

### Breaking Changes
- API key is now mandatory (was optional in v2.1.x)

## [2.1.1] - 2024-01-10

### Fixed
- Repository URL and homepage in package.json

## [2.1.0] - 2024-01-08

### Added
- Environment variables support for agents
- Agent validation methods
- Webhook signature verification

## [2.0.0] - 2024-01-05

### Added
- Initial public release
- Core SDK functionality
- Flow execution methods
- Agent management
- Batch processing support

[Unreleased]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/releases/tag/v2.0.0