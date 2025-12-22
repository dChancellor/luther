// TODO - refactor opportunity - reuse things from other tests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

function originHeaders() {
	return {
		'content-type': 'text/plain',
		origin: baseURL,
		referer: `${baseURL}/`,
		'x-internal-test-bypass': '1'
	};
}

async function createPaste(request: any, content: string) {
	const res = await request.post(`${baseURL}/api/paste`, {
		headers: originHeaders(),
		data: content,
		timeout: 20_000
	});

	const text = await res.text().catch(() => '');
	if (!res.ok()) {
		throw new Error(
			`POST /api/paste failed: ${res.status()} ${res.statusText()}\n${text.slice(0, 800)}`
		);
	}

	return JSON.parse(text) as { slug: string };
}

test.describe('API concurrency smoke', () => {
	test('can create multiple pastes concurrently and fetch raw', async ({ request }) => {
		test.setTimeout(60_000);

		const payloads = Array.from({ length: 5 }, (_, i) => `concurrency-${i}-${Date.now()}\n`);

		const created = await Promise.all(payloads.map((p) => createPaste(request, p)));

		// Slugs should be unique
		const slugs = created.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);

		// And raw should match for each
		for (let i = 0; i < created.length; i++) {
			const slug = created[i].slug;

			const rawRes = await request.get(`${baseURL}/raw/${slug}`, {
				headers: { origin: baseURL },
				timeout: 10_000
			});

			expect(rawRes.ok()).toBeTruthy();
			const text = await rawRes.text();
			expect(text).toBe(payloads[i]);
		}
	});
});
