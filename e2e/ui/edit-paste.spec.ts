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

test.describe('Edit paste functionality', () => {
	test('shows edit button on paste view page', async ({ page, request }) => {
		const content = 'function hello() { return "world"; }';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const editButton = page.getByRole('button', { name: 'edit' });
		await expect(editButton).toBeVisible();
	});

	test('clicking edit button shows textarea with paste content', async ({ page, request }) => {
		const content = 'const x = 42;';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// Click the edit button
		await page.getByRole('button', { name: 'edit' }).click();

		// Textarea should be visible with the content
		const textarea = page.getByRole('textbox');
		await expect(textarea).toBeVisible();
		await expect(textarea).toHaveValue(content);

		// Save and cancel buttons should be visible
		await expect(page.getByRole('button', { name: 'save' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'cancel' })).toBeVisible();
	});

	test('clicking cancel button hides edit mode', async ({ page, request }) => {
		const content = 'test content';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// Enter edit mode
		await page.getByRole('button', { name: 'edit' }).click();
		await expect(page.getByRole('textbox')).toBeVisible();

		// Click cancel
		await page.getByRole('button', { name: 'cancel' }).click();

		// Edit mode should be hidden
		await expect(page.getByRole('textbox')).not.toBeVisible();

		// Code block should be visible again
		await expect(page.locator('pre > code')).toBeVisible();
	});

	test('can edit and save paste content', async ({ page, request }) => {
		const originalContent = 'console.log("original");';
		const editedContent = 'console.log("edited");';
		const { slug } = await createPaste(request, originalContent);

		await page.goto(`${baseURL}/${slug}`);

		// Verify original content is visible
		const codeBlock = page.locator('pre > code');
		await expect(codeBlock).toContainText('original');

		// Enter edit mode
		await page.getByRole('button', { name: 'edit' }).click();

		// Edit the content
		const textarea = page.getByRole('textbox');
		await textarea.fill(editedContent);

		// Save the changes
		await page.getByRole('button', { name: 'save' }).click();

		// Wait for the page to reload
		await page.waitForTimeout(1000);

		// Reload the page to see the updated content
		await page.reload();

		// Verify edited content is visible
		await expect(codeBlock).toContainText('edited');
	});

	test('edited content persists after page reload', async ({ page, request }) => {
		const originalContent = 'let a = 1;';
		const editedContent = 'let a = 2;';
		const { slug } = await createPaste(request, originalContent);

		await page.goto(`${baseURL}/${slug}`);

		// Edit and save
		await page.getByRole('button', { name: 'edit' }).click();
		await page.getByRole('textbox').fill(editedContent);
		await page.getByRole('button', { name: 'save' }).click();

		// Wait for save to complete
		await page.waitForTimeout(1000);

		// Navigate away and back
		await page.goto(`${baseURL}/`);
		await page.goto(`${baseURL}/${slug}`);

		// Verify edited content persists
		const codeBlock = page.locator('pre > code');
		await expect(codeBlock).toContainText('let a = 2');
		await expect(codeBlock).not.toContainText('let a = 1');
	});

	test('can retrieve edited content via raw endpoint', async ({ page, request }) => {
		const originalContent = 'function test() { return 1; }';
		const editedContent = 'function test() { return 2; }';
		const { slug } = await createPaste(request, originalContent);

		await page.goto(`${baseURL}/${slug}`);

		// Edit and save
		await page.getByRole('button', { name: 'edit' }).click();
		await page.getByRole('textbox').fill(editedContent);
		await page.getByRole('button', { name: 'save' }).click();

		// Wait for save to complete
		await page.waitForTimeout(1000);

		// Verify via raw endpoint
		const rawRes = await request.get(`${baseURL}/raw/${slug}`, {
			headers: { origin: baseURL }
		});

		expect(rawRes.ok()).toBeTruthy();
		const rawText = await rawRes.text();
		expect(rawText).toBe(editedContent);
	});

	test('empty content is rejected when saving', async ({ page, request }) => {
		const content = 'original content';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// Enter edit mode
		await page.getByRole('button', { name: 'edit' }).click();

		// Try to save empty content
		await page.getByRole('textbox').fill('   ');
		await page.getByRole('button', { name: 'save' }).click();

		// Wait a moment
		await page.waitForTimeout(500);

		// Content should still be in edit mode (save failed)
		await expect(page.getByRole('textbox')).toBeVisible();

		// Reload and verify original content is still there
		await page.reload();
		const codeBlock = page.locator('pre > code');
		await expect(codeBlock).toContainText('original content');
	});
});
