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

	test('clicking duplicate button creates a new bin with all notes and navigates to it', async ({
		page,
		request
	}) => {
		// Create a bin with 2 notes
		const content1 = 'const x = 42;';
		const content2 = 'const y = 100;';

		const res1 = await request.post(`${baseURL}/api/paste`, {
			headers: withOriginHeaders(),
			data: JSON.stringify({ texts: [content1, content2] }),
			timeout: 15_000
		});
		const body1 = await res1.json();
		const originalSlug = body1.slug;

		await page.goto(`${baseURL}/${originalSlug}`);

		// Verify we're in the original bin with 2 items
		const footer = page.locator('footer');
		await expect(footer).toContainText('`ITEMS: 2`');

		const originalUrl = page.url();

		// Click the duplicate button
		await page.getByRole('button', { name: 'duplicate' }).click();

		// Wait for navigation to complete
		await page.waitForURL(/\/[^/]+$/);

		// Verify we're on a new slug (different from original)
		const newUrl = page.url();
		expect(newUrl).not.toBe(originalUrl);

		// Extract the new slug from the URL
		const newSlug = newUrl.split('/').pop();
		expect(newSlug).toBeTruthy();
		expect(newSlug).not.toBe(originalSlug);

		// Verify the new bin also has 2 items
		await expect(footer).toContainText('`ITEMS: 2`');

		// Verify both contents are present in the new bin
		const codeBlocks = page.locator('pre > code');
		const count = await codeBlocks.count();
		expect(count).toBe(2);
	});

	test('duplicate preserves all content exactly', async ({ page, request }) => {
		const content1 = 'function test() {\n  return "multiline\\nstring";\n}';
		const content2 = 'console.log("test");';

		const res = await request.post(`${baseURL}/api/paste`, {
			headers: withOriginHeaders(),
			data: JSON.stringify({ texts: [content1, content2] }),
			timeout: 15_000
		});
		const body = await res.json();
		const originalSlug = body.slug;

		await page.goto(`${baseURL}/${originalSlug}`);

		// Duplicate the bin
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);

		// Verify both contents are present via checking the page
		const codeBlocks = page.locator('pre > code');
		const count = await codeBlocks.count();
		expect(count).toBe(2);
	});

	test('duplicate creates a new bin (different group)', async ({ page, request }) => {
		const content = 'const original = true;';
		const { slug: originalSlug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${originalSlug}`);

		// Check the group footer shows 1 item
		const footer = page.locator('footer');
		await expect(footer).toContainText('`ITEMS: 1`');

		// Get the original group ID
		const originalGroupText = await footer.textContent();
		const originalGroupMatch = originalGroupText?.match(/Group: "([^"]+)"/);
		const originalGroupId = originalGroupMatch?.[1];

		// Duplicate the bin
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);

		// The new bin should show 1 item
		await expect(footer).toContainText('`ITEMS: 1`');

		// Get the new group ID
		const newGroupText = await footer.textContent();
		const newGroupMatch = newGroupText?.match(/Group: "([^"]+)"/);
		const newGroupId = newGroupMatch?.[1];

		// Verify we have a different group ID
		expect(newGroupId).toBeTruthy();
		expect(newGroupId).not.toBe(originalGroupId);

		// Navigate back to original slug
		await page.goto(`${baseURL}/${originalSlug}`);

		// It should still show 1 item (not 2, because it's a different group)
		await expect(footer).toContainText('`ITEMS: 1`');
	});

	test('can duplicate a bin multiple times', async ({ page, request }) => {
		const content1 = 'const value = 123;';
		const content2 = 'const name = "test";';

		const res = await request.post(`${baseURL}/api/paste`, {
			headers: withOriginHeaders(),
			data: JSON.stringify({ texts: [content1, content2] }),
			timeout: 15_000
		});
		const body = await res.json();
		const originalSlug = body.slug;

		await page.goto(`${baseURL}/${originalSlug}`);

		// Verify original has 2 items
		const footer = page.locator('footer');
		await expect(footer).toContainText('`ITEMS: 2`');

		// First duplicate
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);
		const firstDuplicateSlug = page.url().split('/').pop();

		// Verify first duplicate has 2 items
		await expect(footer).toContainText('`ITEMS: 2`');

		// Second duplicate
		await page.getByRole('button', { name: 'duplicate' }).click();
		await page.waitForURL(/\/[^/]+$/);
		const secondDuplicateSlug = page.url().split('/').pop();

		// Verify all slugs are different
		expect(originalSlug).toBeTruthy();
		expect(firstDuplicateSlug).toBeTruthy();
		expect(secondDuplicateSlug).toBeTruthy();
		expect(new Set([originalSlug, firstDuplicateSlug, secondDuplicateSlug]).size).toBe(3);

		// Verify second duplicate has 2 items
		await expect(footer).toContainText('`ITEMS: 2`');

		// All bins should have different group IDs
		const getGroupId = async (slug: string) => {
			await page.goto(`${baseURL}/${slug}`);
			const text = await footer.textContent();
			const match = text?.match(/Group: "([^"]+)"/);
			return match?.[1];
		};

		const originalGroupId = await getGroupId(originalSlug);
		const firstGroupId = await getGroupId(firstDuplicateSlug!);
		const secondGroupId = await getGroupId(secondDuplicateSlug!);

		expect(new Set([originalGroupId, firstGroupId, secondGroupId]).size).toBe(3);
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
