/**
 * Shared test constants used across unit tests and e2e tests.
 *
 * IMPORTANT: These constants must match the values set in the CI/CD environment.
 * See .github/workflows/ci.yml for the environment variable definitions.
 */

/**
 * Test API key used for authentication in test environments.
 * This value MUST match:
 * - The API_KEY environment variable in .github/workflows/ci.yml
 * - The x-api-key header in all test requests
 */
export const TEST_API_KEY = 'test';
