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
		const originalContent = 'original paste content';
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: originalContent
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		const getRes = await request.get(`/raw/${slug}`);
		expect(getRes.ok()).toBeTruthy();
		const originalText = await getRes.text();
		expect(originalText).toBe(originalContent);

		const updatedContent = 'updated paste content';
		const updateRes = await request.put(`/api/${slug}`, {
			headers: withOriginHeaders(),
			data: updatedContent
		});

		expect(updateRes.ok()).toBeTruthy();
		const updateJson = await updateRes.json();
		expect(updateJson.success).toBe(true);

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
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'paste to be deleted'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		const deleteRes = await request.delete(`/api/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(deleteRes.ok()).toBeTruthy();

		const updateRes = await request.put(`/api/${slug}`, {
			headers: withOriginHeaders(),
			data: 'new content'
		});

		expect(updateRes.status()).toBe(404);
	});

	test('returns 400 when updating with empty content', async ({ request }) => {
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'original content'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		const updateRes = await request.put(`/api/${slug}`, {
			headers: withOriginHeaders(),
			data: '   '
		});

		expect(updateRes.status()).toBe(400);
		const updateJson = await updateRes.json();
		expect(updateJson.error).toContain('non-empty');
	});

	test('can update paste multiple times', async ({ request }) => {
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'version 1'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		const update1Res = await request.put(`/api/${slug}`, {
			headers: withOriginHeaders(),
			data: 'version 2'
		});

		expect(update1Res.ok()).toBeTruthy();

		const update2Res = await request.put(`/api/${slug}`, {
			headers: withOriginHeaders(),
			data: 'version 3'
		});

		expect(update2Res.ok()).toBeTruthy();

		const getRawRes = await request.get(`/raw/${slug}`);
		const finalText = await getRawRes.text();
		expect(finalText).toBe('version 3');
	});
});
