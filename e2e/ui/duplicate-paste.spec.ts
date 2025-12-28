/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import { TEST_API_KEY } from '../helpers/constants';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

function withOriginHeaders(extra?: Record<string, string>) {
	return {
		'content-type': 'text/plain',
		origin: baseURL,
		referer: `${baseURL}/`,
		'x-internal-test-bypass': '1',
		'x-api-key': TEST_API_KEY,
		...extra
	};
}

async function createPaste(request: any, content: string) {
	const res = await request.post(`${baseURL}/api/paste`, {
		headers: withOriginHeaders(),
		data: content,
		timeout: 15_000
	});

	const body = await res.text().catch(() => '');
	if (!res.ok()) {
		throw new Error(
			`POST /api/paste failed: ${res.status()} ${res.statusText()}\n${body.slice(0, 800)}`
		);
	}

	return JSON.parse(body) as { slug: string; url?: string; language?: string };
}

test.describe('Duplicate paste functionality', () => {
	test('shows duplicate button on paste view page', async ({ page, request }) => {
		const content = 'function hello() { return "world"; }';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const duplicateButton = page.getByRole('button', { name: 'duplicate' });
		await expect(duplicateButton).toBeVisible();
	});

	test('clicking duplicate button creates a new paste and navigates to it', async ({
		page,
		request
	}) => {
		const originalContent = 'const x = 42;';
		const { slug: originalSlug } = await createPaste(request, originalContent);

		await page.goto(`${baseURL}/${originalSlug}`);

		// Verify we're on the original slug
		await expect(page).toHaveURL(`${baseURL}/${originalSlug}`);
		await expect(page).toHaveTitle(`Luther/${originalSlug}`);

		// Click the duplicate button
		await page.getByRole('button', { name: 'duplicate' }).click();

		// Wait for navigation to complete
		await page.waitForURL(/\/[^/]+$/);

		// Verify we're on a new slug (different from original)
		const newUrl = page.url();
		expect(newUrl).not.toBe(`${baseURL}/${originalSlug}`);

		// Extract the new slug from the URL
		const newSlug = newUrl.split('/').pop();
		expect(newSlug).toBeTruthy();
		expect(newSlug).not.toBe(originalSlug);

		// Verify the content is the same
		const codeBlock = page.locator('pre > code');
		await expect(codeBlock).toContainText(originalContent);
	});

	test('duplicate preserves content exactly', async ({ page, request }) => {
		const content = 'function test() {\n  return "multiline\\nstring";\n}\nconsole.log("test");';
		const { slug: originalSlug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${originalSlug}`);

		// Duplicate the paste
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);

		// Get the new slug
		const newSlug = page.url().split('/').pop();

		// Verify content via raw endpoint
		const rawRes = await request.get(`${baseURL}/raw/${newSlug}`, {
			headers: { origin: baseURL }
		});

		expect(rawRes.ok()).toBeTruthy();
		const rawText = await rawRes.text();
		expect(rawText).toBe(content);
	});

	test('duplicate creates a new entry in the same group', async ({ page, request }) => {
		const content = 'const original = true;';
		const { slug: originalSlug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${originalSlug}`);

		// Check the group footer shows 1 item
		const footer = page.locator('footer');
		await expect(footer).toContainText('`ITEMS: 1`');

		// Duplicate the paste
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);

		// The group should now show 2 items
		await expect(footer).toContainText('`ITEMS: 2`');

		// Navigate back to original slug
		await page.goto(`${baseURL}/${originalSlug}`);

		// It should also show 2 items (same group)
		await expect(footer).toContainText('`ITEMS: 2`');
	});

	test('can duplicate a paste multiple times', async ({ page, request }) => {
		const content = 'const value = 123;';
		const { slug: originalSlug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${originalSlug}`);

		// First duplicate
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);
		const firstDuplicateSlug = page.url().split('/').pop();

		// Verify we can see the content
		const codeBlock = page.locator('pre > code');
		await expect(codeBlock).toContainText(content);

		// Second duplicate
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);
		const secondDuplicateSlug = page.url().split('/').pop();

		// Verify all slugs are different
		expect(originalSlug).toBeTruthy();
		expect(firstDuplicateSlug).toBeTruthy();
		expect(secondDuplicateSlug).toBeTruthy();
		expect(new Set([originalSlug, firstDuplicateSlug, secondDuplicateSlug]).size).toBe(3);

		// Verify the content is still correct
		await expect(codeBlock).toContainText(content);

		// Group should show 3 items
		const footer = page.locator('footer');
		await expect(footer).toContainText('`ITEMS: 3`');
	});

	test('duplicate button not shown in edit mode', async ({ page, request }) => {
		const content = 'test content';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// Duplicate button should be visible initially
		await expect(page.getByRole('button', { name: 'duplicate' })).toBeVisible();

		// Enter edit mode
		await page.getByRole('button', { name: 'edit' }).click();

		// Duplicate button should not be visible in edit mode
		await expect(page.getByRole('button', { name: 'duplicate' })).not.toBeVisible();

		// Cancel edit mode
		await page.getByRole('button', { name: 'cancel' }).click();

		// Duplicate button should be visible again
		await expect(page.getByRole('button', { name: 'duplicate' })).toBeVisible();
	});
});
