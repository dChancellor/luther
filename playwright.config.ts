import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
	testDir: './e2e',
	outputDir: './e2e-results',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: baseURL,
		trace: 'on-first-retry',
		extraHTTPHeaders: {
			'x-internal-test-bypass': '1'
		}
	},
	projects: [
		// {
		// 	name: 'chromium',
		// 	testMatch: /ui\/.*\.spec\.ts/,
		// 	use: { ...devices['Desktop Chrome'], baseURL },
		// 	retries: 2
		// },
		// {
		// 	name: 'firefox',
		// 	testMatch: /ui\/.*\.spec\.ts/,
		// 	use: { ...devices['Desktop Firefox'], baseURL },
		// 	retries: 2
		// },
		// {
		// 	name: 'webkit',
		// 	testMatch: /ui\/.*\.spec\.ts/,
		// 	use: { ...devices['Desktop Safari'], baseURL },
		// 	retries: 2
		// },
		{ name: 'api', use: { baseURL }, testMatch: /api\/.*\.spec\.ts/, workers: 1, retries: 2 }
	],
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173 --host 0.0.0.0',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
