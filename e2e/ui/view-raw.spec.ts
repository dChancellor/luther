// TODO - refactor opportunity - reuse things from other tests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

function originHeaders() {
	return {
		'content-type': 'text/plain',
		origin: baseURL,
		referer: `${baseURL}/`
	};
}

async function createPaste(request: any, content: string) {
	const res = await request.post(`${baseURL}/api/paste`, {
		headers: originHeaders(),
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

test.describe('Paste view page', () => {
	test('raw link points to /raw/{slug} and returns exact content', async ({ page, request }) => {
		const content = `line 1\nline 2\nline 3\n`;
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const rawLink = page.locator('.meta a', { hasText: 'raw' });
		await expect(rawLink).toHaveAttribute('href', `/raw/${slug}`);

		const rawRes = await request.get(`${baseURL}/raw/${slug}`, {
			headers: { origin: baseURL },
			timeout: 10_000
		});

		expect(rawRes.ok()).toBeTruthy();
		expect(rawRes.headers()['content-type']).toMatch(/text\/plain/i);

		const rawText = await rawRes.text();
		expect(rawText).toBe(content);
	});
});
