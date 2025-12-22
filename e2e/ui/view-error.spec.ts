// TODO - refactor opportunity - reuse things from other tests
import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

test.describe('Paste view page', () => {
	test('unknown slug shows Not found error state', async ({ page }) => {
		const slug = `missing-${Date.now()}-abcdef`;

		await page.goto(`${baseURL}/${slug}`);

		await expect(page.locator('body')).toContainText(/not found/i);
	});

	test('raw endpoint returns 404 for missing slug', async ({ request }) => {
		const res = await request.get(`${baseURL}/raw/missing-${Date.now()}`, {
			headers: { origin: baseURL },
			timeout: 10_000
		});
		expect(res.status()).toBe(404);
	});
});
