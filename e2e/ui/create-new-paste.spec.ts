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

test.describe('Create new paste in group', () => {
	test('shows new button on paste view page', async ({ page, request }) => {
		const content = 'function hello() { return "world"; }';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const newButton = page.getByRole('button', { name: '+ new' });
		await expect(newButton).toBeVisible();
	});

	test('clicking new button shows textarea for new paste', async ({ page, request }) => {
		const content = 'const x = 42;';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// Click the new button
		await page.getByRole('button', { name: '+ new' }).click();

		// Textarea should be visible
		const textarea = page.getByRole('textbox');
		await expect(textarea).toBeVisible();
		await expect(textarea).toHaveValue('');

		// Save and cancel buttons should be visible
		await expect(page.getByRole('button', { name: 'save' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'cancel' })).toBeVisible();

		// New paste label should be visible
		await expect(page.getByText('New paste')).toBeVisible();
	});

	test('clicking cancel button hides new paste mode', async ({ page, request }) => {
		const content = 'test content';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// Enter new paste mode
		await page.getByRole('button', { name: '+ new' }).click();
		await expect(page.getByRole('textbox')).toBeVisible();

		// Click cancel
		await page.getByRole('button', { name: 'cancel' }).first().click();

		// New paste mode should be hidden
		await expect(page.getByText('New paste')).not.toBeVisible();

		// New button should be visible again
		await expect(page.getByRole('button', { name: '+ new' })).toBeVisible();
	});

	test('can create and save new paste in same group', async ({ page, request }) => {
		const originalContent = 'console.log("original");';
		const newContent = 'console.log("new paste");';
		const { slug } = await createPaste(request, originalContent);

		await page.goto(`${baseURL}/${slug}`);

		// Verify original content is visible
		const originalCodeBlock = page.locator('pre > code').first();
		await expect(originalCodeBlock).toContainText('original');

		// Count existing pastes
		const initialPasteCount = await page.locator('.file').count();

		// Enter new paste mode
		await page.getByRole('button', { name: '+ new' }).click();

		// Type the new content
		const textarea = page.getByRole('textbox');
		await textarea.fill(newContent);

		// Save the new paste
		await page.getByRole('button', { name: 'save' }).first().click();

		// Wait for the page to update
		await page.waitForTimeout(1000);

		// Verify new paste appears on the page
		const newPasteCount = await page.locator('.file').count();
		expect(newPasteCount).toBe(initialPasteCount + 1);

		// Verify new content is visible
		const codeBlocks = page.locator('pre > code');
		await expect(codeBlocks.last()).toContainText('new paste');

		// Verify new button is visible again
		await expect(page.getByRole('button', { name: '+ new' })).toBeVisible();
	});

	test('new paste persists after page reload', async ({ page, request }) => {
		const originalContent = 'let a = 1;';
		const newContent = 'let b = 2;';
		const { slug } = await createPaste(request, originalContent);

		await page.goto(`${baseURL}/${slug}`);

		// Create and save new paste
		await page.getByRole('button', { name: '+ new' }).click();
		await page.getByRole('textbox').fill(newContent);
		await page.getByRole('button', { name: 'save' }).first().click();

		// Wait for save to complete
		await page.waitForTimeout(1000);

		// Reload the page
		await page.reload();

		// Verify both pastes are visible
		const codeBlocks = page.locator('pre > code');
		await expect(codeBlocks.first()).toContainText('let a = 1');
		await expect(codeBlocks.last()).toContainText('let b = 2');
	});

	test('empty content is rejected when creating new paste', async ({ page, request }) => {
		const content = 'original content';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// Enter new paste mode
		await page.getByRole('button', { name: '+ new' }).click();

		// Try to save empty content
		await page.getByRole('textbox').fill('   ');
		await page.getByRole('button', { name: 'save' }).first().click();

		// Wait a moment
		await page.waitForTimeout(500);

		// Should still be in new paste mode (save failed)
		await expect(page.getByRole('textbox')).toBeVisible();

		// Only one paste should exist
		const pasteCount = await page.locator('.file').count();
		expect(pasteCount).toBe(1);
	});

	test('new paste gets same group_id as existing paste', async ({ page, request }) => {
		const originalContent = 'function test() { return 1; }';
		const newContent = 'function test2() { return 2; }';
		const { slug: slug1 } = await createPaste(request, originalContent);

		await page.goto(`${baseURL}/${slug1}`);

		// Create new paste
		await page.getByRole('button', { name: '+ new' }).click();
		await page.getByRole('textbox').fill(newContent);
		await page.getByRole('button', { name: 'save' }).first().click();

		// Wait for save to complete
		await page.waitForTimeout(1000);

		// Get the slug of the new paste from the page
		const slugElements = page.locator('.bar span').filter({ hasText: /^[A-Za-z0-9_-]+\s+•/ });
		const slugTexts = await slugElements.allTextContents();
		expect(slugTexts.length).toBe(2);

		// Extract the second slug
		const slug2Match = slugTexts[1].match(/^([A-Za-z0-9_-]+)\s+•/);
		expect(slug2Match).toBeTruthy();
		const slug2 = slug2Match![1];

		// Navigate to the second slug and verify both pastes are still visible
		await page.goto(`${baseURL}/${slug2}`);

		// Both pastes should be visible on this page too
		const codeBlocks = page.locator('pre > code');
		await expect(codeBlocks).toHaveCount(2);
		await expect(codeBlocks.first()).toContainText('test()');
		await expect(codeBlocks.last()).toContainText('test2()');
	});
});
