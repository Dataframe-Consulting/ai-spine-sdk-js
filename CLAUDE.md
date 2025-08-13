# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build the SDK
npm run build

# Development mode with watch
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a single test file
npm test -- src/__tests__/spine.test.ts

# Lint the codebase
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

## Publishing to NPM

### Automated Deploy with GitHub Actions

El proyecto tiene configurado un workflow de GitHub Actions (`.github/workflows/npm-publish.yml`) que:

1. **Se ejecuta automáticamente** en cada push a la rama `main`
2. **Verifica si la versión cambió** comparando con npm registry
3. **Si la versión es nueva**:
   - Ejecuta tests
   - Construye el proyecto
   - Publica a npm automáticamente
   - Crea un tag git (ej: v2.2.0)
4. **Si la versión ya existe**: No hace nada (evita publicaciones duplicadas)

### Cómo publicar una nueva versión

1. **Actualizar la versión en package.json** siguiendo Semantic Versioning:
   ```bash
   # Para cambios que rompen compatibilidad (MAJOR: 2.0.0 → 3.0.0)
   npm version major --no-git-tag-version
   
   # Para nuevas funcionalidades compatibles (MINOR: 2.1.0 → 2.2.0)  
   npm version minor --no-git-tag-version
   
   # Para corrección de bugs (PATCH: 2.1.1 → 2.1.2)
   npm version patch --no-git-tag-version
   ```

2. **Commit y push a main**:
   ```bash
   git add package.json
   git commit -m "chore: bump version to X.Y.Z"
   git push origin main
   ```

3. **GitHub Actions se encarga del resto**:
   - Ve el progreso en: GitHub → Actions tab
   - Si todo está bien, la nueva versión se publicará en npm
   - Se creará automáticamente el tag vX.Y.Z

### Versionado Semántico (A.B.C)

- **A (MAJOR)**: Cambios incompatibles con versiones anteriores
  - Ejemplo: API key pasa de opcional a obligatorio
  - Ejemplo: Se elimina un método público
  
- **B (MINOR)**: Nuevas funcionalidades compatibles hacia atrás
  - Ejemplo: Se añade método `checkCredits()`
  - Ejemplo: Se añade parámetro opcional
  
- **C (PATCH)**: Corrección de bugs sin cambios en la API
  - Ejemplo: Fix en validación de webhooks
  - Ejemplo: Corrección de timeout

**IMPORTANTE**: Si hay dudas sobre qué versión usar, pregúntame antes de actualizar.

## Architecture Overview

This is the AI Spine JavaScript SDK - a TypeScript SDK for orchestrating AI agents and workflows, positioned as "The Stripe for AI Agent Orchestration".

### Core Structure

The SDK follows a clean architecture pattern with clear separation of concerns:

- **AISpine** (`src/spine.ts`): Main SDK class providing the public API interface. Handles flow execution, agent management, webhooks, and environment variables.

- **AISpineClient** (`src/client.ts`): HTTP client responsible for all API communication with retry logic, rate limiting, and error handling.

- **Type System** (`src/types.ts`): Comprehensive TypeScript types for all SDK entities including agents, flows, executions, webhooks, and validation.

- **Error Handling** (`src/errors.ts`): Hierarchical error classes for different error scenarios (authentication, validation, rate limiting, etc.).

- **Utilities** (`src/utils.ts`): Validation functions, sanitization, and helper methods used throughout the SDK.

- **Webhooks** (`src/webhooks.ts`): Webhook signature verification, event handling, and middleware creation for webhook endpoints.

### Key Features

1. **Flow Execution**: Execute AI workflows with input data and wait for completion
2. **Agent Management**: Create, update, and manage AI agents with environment variables
3. **Batch Processing**: Execute multiple flows or agents in parallel
4. **Webhook Integration**: Secure webhook verification and event handling
5. **Environment Variables**: Secure configuration management for agents (v2.1.0 feature)

### Build Configuration

- **Rollup**: Used for bundling with support for CommonJS, ESM, and TypeScript declarations
- **TypeScript**: Strict mode enabled for type safety
- **Jest**: Test runner with ts-jest for TypeScript support
- **ESLint**: Code linting with TypeScript ESLint parser

### Testing

Tests are located in `src/__tests__/` and use Jest with a setup file for common mocks. The test environment simulates node and includes coverage reporting.

### API Integration

The SDK communicates with the AI Spine API at `https://ai-spine-api-production.up.railway.app` by default. All requests include:
- Authentication via `Authorization: Bearer {apiKey}` header (optional - API_KEY_REQUIRED=false)
- Content-Type and Accept headers set to `application/json`
- Automatic retry logic with exponential backoff
- Timeout handling

### Important Project Context

**Current Status:**
- API is live at Railway but no real agents are connected yet
- Authentication is NOW REQUIRED (API key must start with 'sk_')
- New user management features: `getCurrentUser()` and `checkCredits()`
- Webhooks are NOT implemented - use polling with `waitForExecution()`
- Only HTTP/HTTPS protocols are supported for agent endpoints

**Package Publishing:**
- Published to npm as `ai-spine-sdk` (not @ai-spine/sdk)
- Repository: https://github.com/Dataframe-Consulting/ai-spine-sdk-js
- Homepage: https://www.dataframeai.com/

**API Endpoints Available:**
- POST /flows/execute
- GET /executions/{executionId}
- GET /flows
- GET /flows/{flowId}
- GET /agents
- POST /agents
- DELETE /agents/{agentId} (Note: No PUT/update endpoint)
- GET /health
- GET /status
- GET /metrics
- POST /executions/{executionId}/cancel

**Request/Response Format:**
```javascript
// Execute Flow Request
{
  "flow_id": "credit_analysis",
  "input_data": { /* user data */ },
  "metadata": {}
}

// Response
{
  "execution_id": "uuid",
  "status": "pending|running|completed|failed",
  "result": null
}
```

### Development Guidelines

1. **No Webhooks**: Don't implement or suggest webhook features - they're not supported
2. **Optional API Key**: Allow SDK to work without API key since it's currently disabled
3. **Use Polling**: Always use `waitForExecution()` for monitoring execution status
4. **Production URL**: Default to Railway URL, not localhost
5. **Test Considerations**: Some tests may fail due to config changes (API key optional, URL changed) - this is expected