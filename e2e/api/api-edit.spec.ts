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

test.describe('PUT /api/paste/[slug]', () => {
	test('updates a paste successfully', async ({ request }) => {
		// First, create a paste
		const originalContent = 'original paste content';
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: originalContent
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		// Verify the original content
		const getRes = await request.get(`/raw/${slug}`);
		expect(getRes.ok()).toBeTruthy();
		const originalText = await getRes.text();
		expect(originalText).toBe(originalContent);

		// Update the paste
		const updatedContent = 'updated paste content';
		const updateRes = await request.put(`/api/paste/${slug}`, {
			headers: withOriginHeaders(),
			data: updatedContent
		});

		expect(updateRes.ok()).toBeTruthy();
		const updateJson = await updateRes.json();
		expect(updateJson.success).toBe(true);

		// Verify the paste was updated
		const getAfterUpdateRes = await request.get(`/raw/${slug}`);
		expect(getAfterUpdateRes.ok()).toBeTruthy();
		const updatedText = await getAfterUpdateRes.text();
		expect(updatedText).toBe(updatedContent);
	});

	test('returns 404 when updating non-existent paste', async ({ request }) => {
		const updateRes = await request.put('/api/paste/nonexistent', {
			headers: withOriginHeaders(),
			data: 'some content'
		});

		expect(updateRes.status()).toBe(404);
	});

	test('returns 404 when updating deleted paste', async ({ request }) => {
		// Create a paste
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'paste to be deleted'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		// Delete the paste
		const deleteRes = await request.delete(`/api/paste/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(deleteRes.ok()).toBeTruthy();

		// Try to update the deleted paste
		const updateRes = await request.put(`/api/paste/${slug}`, {
			headers: withOriginHeaders(),
			data: 'new content'
		});

		expect(updateRes.status()).toBe(404);
	});

	test('returns 400 when updating with empty content', async ({ request }) => {
		// Create a paste
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'original content'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		// Try to update with empty content
		const updateRes = await request.put(`/api/paste/${slug}`, {
			headers: withOriginHeaders(),
			data: '   '
		});

		expect(updateRes.status()).toBe(400);
		const updateJson = await updateRes.json();
		expect(updateJson.error).toContain('non-empty');
	});

	test('can update paste multiple times', async ({ request }) => {
		// Create a paste
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'version 1'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		// First update
		const update1Res = await request.put(`/api/paste/${slug}`, {
			headers: withOriginHeaders(),
			data: 'version 2'
		});

		expect(update1Res.ok()).toBeTruthy();

		// Second update
		const update2Res = await request.put(`/api/paste/${slug}`, {
			headers: withOriginHeaders(),
			data: 'version 3'
		});

		expect(update2Res.ok()).toBeTruthy();

		// Verify final content
		const getRawRes = await request.get(`/raw/${slug}`);
		const finalText = await getRawRes.text();
		expect(finalText).toBe('version 3');
	});
});
