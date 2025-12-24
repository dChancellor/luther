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

test.describe('DELETE /api/paste/[slug]', () => {
	test('deletes a paste successfully', async ({ request }) => {
		// First, create a paste
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'test paste for deletion'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		// Verify the paste exists
		const getRes = await request.get(`/raw/${slug}`);
		expect(getRes.ok()).toBeTruthy();

		// Delete the paste
		const deleteRes = await request.delete(`/api/paste/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(deleteRes.ok()).toBeTruthy();
		const deleteJson = await deleteRes.json();
		expect(deleteJson.success).toBe(true);

		// Verify the paste is no longer accessible
		const getAfterDeleteRes = await request.get(`/raw/${slug}`);
		expect(getAfterDeleteRes.status()).toBe(404);
	});

	test('returns 404 when deleting non-existent paste', async ({ request }) => {
		const deleteRes = await request.delete('/api/paste/nonexistent', {
			headers: withOriginHeaders()
		});

		expect(deleteRes.status()).toBe(404);
	});

	test('returns 404 when deleting already deleted paste', async ({ request }) => {
		// Create a paste
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'test paste for double deletion'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		// Delete it once
		const firstDeleteRes = await request.delete(`/api/paste/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(firstDeleteRes.ok()).toBeTruthy();

		// Try to delete it again
		const secondDeleteRes = await request.delete(`/api/paste/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(secondDeleteRes.status()).toBe(404);
	});

	test('requires authentication', async ({ request }) => {
		// Create a paste first
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'test paste for auth check'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		// Try to delete without API key
		const deleteRes = await request.delete(`/api/paste/${slug}`, {
			headers: {
				'content-type': 'text/plain',
				origin: baseURL,
				referer: `${baseURL}/`,
				'x-internal-test-bypass': '1'
			}
		});

		expect(deleteRes.status()).toBe(401);
		const json = await deleteRes.json();
		expect(json.error).toBe('Unauthorized');
	});
});
