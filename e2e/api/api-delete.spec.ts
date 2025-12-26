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
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'test paste for deletion'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		const getRes = await request.get(`/raw/${slug}`);
		expect(getRes.ok()).toBeTruthy();

		const deleteRes = await request.delete(`/api/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(deleteRes.ok()).toBeTruthy();
		const deleteJson = await deleteRes.json();
		expect(deleteJson.success).toBe(true);

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
		const createRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'test paste for double deletion'
		});

		expect(createRes.ok()).toBeTruthy();
		const createJson = await createRes.json();
		const slug = createJson.slug;

		const firstDeleteRes = await request.delete(`/api/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(firstDeleteRes.ok()).toBeTruthy();

		const secondDeleteRes = await request.delete(`/api/${slug}`, {
			headers: withOriginHeaders()
		});

		expect(secondDeleteRes.status()).toBe(404);
	});
});
