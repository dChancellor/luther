// TODO - refactor opportunity - reuse things from other tests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TEST_API_KEY } from '../helpers/constants';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

function withOriginHeaders(extra?: Record<string, string>) {
	return {
		'content-type': 'text/plain',
		origin: baseURL,
		referer: `${baseURL}/`,
		'x-api-key': TEST_API_KEY,
		...extra
	};
}

async function createPaste(request: any, content: string) {
	const res = await request.post('/api/paste', {
		headers: withOriginHeaders(),
		data: content,
		timeout: 10_000
	});

	const body = await res.text().catch(() => '');
	if (!res.ok()) {
		throw new Error(
			`POST /api/paste failed: ${res.status()} ${res.statusText()}\n${body.slice(0, 800)}`
		);
	}

	const json = JSON.parse(body);
	return { res, json };
}

test.describe('POST /api/paste', () => {
	test('creates a paste and returns { slug, url }', async ({ request }) => {
		const { json } = await createPaste(request, 'hello from playwright');

		expect(json).toHaveProperty('slug');
		expect(json).toHaveProperty('url');

		expect(String(json.slug)).toMatch(/^[a-z0-9_-]+$/i);
		expect(String(json.url)).toContain(String(json.slug));
	});

	test('returns JSON content-type', async ({ request }) => {
		const res = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: 'content-type check'
		});

		expect(res.ok()).toBeTruthy();
		const ct = res.headers()['content-type'] || '';
		expect(ct).toMatch(/application\/json/i);
	});

	test('rejects empty/whitespace-only body (400)', async ({ request }) => {
		const res = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: '   \n\t  '
		});

		expect(res.status()).toBe(400);
		const json = await res.json();
		expect(String(json.error ?? '')).toMatch(/non-empty/i);
	});

	test('rejects MAX_BYTES+1', async ({ request }) => {
		const overPath = resolve('dev/examples/example_inputs/test-200001.txt');

		const over = readFileSync(overPath);
		const tooBigRes = await request.post('/api/paste', {
			headers: withOriginHeaders(),
			data: over
		});
		expect(tooBigRes.status()).toBe(413);

		const json = await tooBigRes.json();
		expect(String(json.error ?? '')).toMatch(/too large|max/i);
	});

	test('creates multiple pastes back-to-back without collisions (smoke)', async ({ request }) => {
		const slugs = new Set<string>();

		for (let i = 0; i < 10; i++) {
			const { json } = await createPaste(request, `paste ${i} ${Date.now()}`);
			expect(slugs.has(json.slug)).toBe(false);
			slugs.add(json.slug);
		}
	});

	test('rejects unsupported methods (optional)', async ({ request }) => {
		const res = await request.get('/api/paste', {
			headers: { origin: baseURL }
		});

		expect([404, 405]).toContain(res.status());
	});
});

test.describe('Paste retrieval', () => {
	test('paste page loads for returned slug', async ({ request }) => {
		const content = 'const x = 123;\nconsole.log(x);\n';
		const { json } = await createPaste(request, content);

		const pageRes = await request.get(`/${json.slug}`, {
			headers: { origin: baseURL }
		});

		expect(pageRes.ok()).toBeTruthy();
		const ct = pageRes.headers()['content-type'] || '';
		expect(ct).toMatch(/text\/html/i);
	});

	test('raw endpoint returns the exact text (if /raw/:slug exists)', async ({ request }) => {
		const content = 'raw test line 1\nraw test line 2\n';
		const { json } = await createPaste(request, content);

		const rawRes = await request.get(`/raw/${json.slug}`, {
			headers: { origin: baseURL }
		});

		expect(rawRes.ok()).toBeTruthy();

		const rawText = await rawRes.text();
		expect(rawText).toBe(content);
	});

	test('unknown slug returns 404 from raw endpoint', async ({ request }) => {
		const res = await request.get('/raw/this-slug-should-not-exist-abcdef', {
			headers: { origin: baseURL }
		});
		expect(res.status()).toBe(404);
	});
});

// NOTE: Commented out because I temporarily removed langauge in the return
//
// test.describe('Language detection (optional)', () => {
// 	const jsTextFile = resolve('dev/examples/example_inputs/js.txt');
//
// 	const jsText = readFileSync(jsTextFile);
//
// 	test('detects javascript-like content when API returns language', async ({ request }) => {
// 		const { json } = await createPaste(request, jsText.toString());
// 		console.log(json);
// 		expect(json.language).toBe('javascript');
// 	});
// });
