// TODO - refactor opportunity - reuse things from other tests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
	test('renders title, metadata, code, and raw link', async ({ page, request }) => {
		const jsTextFile = resolve('example_inputs/js.txt');

		const jsText = readFileSync(jsTextFile);

		const { slug } = await createPaste(request, jsText.toString());

		await page.goto(`${baseURL}/${slug}`);

		await expect(page).toHaveTitle(`Luther/${slug}`);

		const meta = page.locator('.meta');
		await expect(meta).toContainText('Created');
		await expect(meta).toContainText('lang:');

		const rawLink = meta.getByRole('link', { name: 'raw' });
		await expect(rawLink).toHaveAttribute('href', `/raw/${slug}`);

		const code = page.locator('pre > code');
		await expect(code).toBeVisible();
		await expect(code).toContainText('const result = hljs.highlightAuto(code);');

		const count = await code.locator('[class^="hljs-"], [class*=" hljs-"]').count();
		expect(count).toBeGreaterThan(0);
	});

	test('raw link returns plain text matching the original', async ({ page, request }) => {
		const content = 'line 1\nline 2\nline 3\n';
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const rawHref = await page.locator('.meta a', { hasText: 'raw' }).getAttribute('href');
		expect(rawHref).toBe(`/raw/${slug}`);

		// Fetch raw directly (more reliable than clicking into a new page)
		const rawRes = await request.get(`${baseURL}${rawHref}`, {
			headers: { origin: baseURL },
			timeout: 10_000
		});

		expect(rawRes.ok()).toBeTruthy();
		const rawText = await rawRes.text();
		expect(rawText).toBe(content);
	});

	test('does not execute scripts embedded in paste content (XSS smoke)', async ({
		page,
		request
	}) => {
		const content = `<script>window.__pwned = true</script>\nconst y = 1;\n`;

		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const pwned = await page.evaluate(() => (window as any).__pwned === true);
		expect(pwned).toBe(false);

		await expect(page.locator('pre > code')).toBeVisible();
	});

	test('shows the correct favicon link', async ({ page, request }) => {
		const { slug } = await createPaste(request, 'favicon test');
		await page.goto(`${baseURL}/${slug}`);

		const iconHref = await page.locator('head link[rel="icon"]').getAttribute('href');
		expect(iconHref).toBeTruthy();
		expect(iconHref!).toMatch(/bulletin-board.*\.svg$/);
	});

	test('view page hydrates and shows highlighted markup', async ({ page, request }) => {
		const jsTextFile = resolve('example_inputs/js.txt');

		const jsText = readFileSync(jsTextFile);

		const { slug } = await createPaste(request, jsText.toString());
		await page.goto(`${baseURL}/${slug}`, { waitUntil: 'domcontentloaded' });

		const code = page.locator('pre > code');
		await expect(code).toBeVisible();

		const tokenCount = await code.locator('[class^="hljs-"], [class*=" hljs-"]').count();
		expect(tokenCount).toBeGreaterThan(0);
	});
});

test.describe('Paste view page (additional guardrails)', () => {
	test('meta shows Created + lang, and raw link points correctly', async ({ page, request }) => {
		const content = 'function hi(){return 1}\n';
		const created = await createPaste(request, content);

		await page.goto(`${baseURL}/${created.slug}`);

		const meta = page.locator('.meta');
		await expect(meta).toBeVisible();
		await expect(meta).toContainText('Created');
		await expect(meta).toContainText('lang:');

		const rawLink = meta.getByRole('link', { name: 'raw' });
		await expect(rawLink).toHaveAttribute('href', `/raw/${created.slug}`);

		// If API returns language, assert it matches what UI shows.
		// (Optional: only check when present)
		if (created.language) {
			await expect(meta).toContainText(`lang: ${created.language}`);
		}
	});

	test('raw endpoint returns text/plain, exact content, and not HTML', async ({ request }) => {
		const content = `line 1\nline 2\nline 3\n`;
		const { slug } = await createPaste(request, content);

		const rawRes = await request.get(`${baseURL}/raw/${slug}`, {
			headers: { origin: baseURL },
			timeout: 10_000
		});

		expect(rawRes.ok()).toBeTruthy();

		const ct = rawRes.headers()['content-type'] ?? '';
		expect(ct).toMatch(/text\/plain/i);

		const rawText = await rawRes.text();
		expect(rawText).toBe(content);

		// Guardrail: raw should not return HTML
		expect(rawText.toLowerCase()).not.toContain('<html');
		expect(rawText.toLowerCase()).not.toContain('<script');
	});

	test('code block contains no unsafe elements (no links/images/iframes/scripts)', async ({
		page,
		request
	}) => {
		// Include characters that often confuse highlighters
		const content = `const url = "https://example.com";\n// <img src=x onerror=alert(1)>\n`;
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const code = page.locator('pre > code');
		await expect(code).toBeVisible();

		// Even though content contains markup-y strings, the rendered code block should not contain real elements.
		await expect(
			page.locator('pre code a, pre code img, pre code iframe, pre code script')
		).toHaveCount(0);
	});

	test('paste page still renders after a hard reload', async ({ page, request }) => {
		const content = `function add(a,b){return a+b}\nconsole.log(add(1,2))\n`;
		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		const code = page.locator('pre > code');
		await expect(code).toBeVisible();
		await expect(code).toContainText('function add');

		await page.reload();

		await expect(code).toBeVisible();
		await expect(code).toContainText('function add');
	});
	test('XSS regression: HTML-like paste does not execute and is rendered inert', async ({
		page,
		request
	}) => {
		// This is "mostly text" to encourage detectLanguage -> 'text' (or whatever your plaintext branch is).
		// Still includes dangerous tags/attrs that would execute if injected as real HTML.
		const content = [
			'Just some notes, not code.',
			'<script>window.__pwned = true</script>',
			'<img src=x onerror="window.__pwned_img=true">',
			'<a href="javascript:window.__pwned_link=true">click</a>',
			'end.',
			''
		].join('\n');

		const { slug } = await createPaste(request, content);

		await page.goto(`${baseURL}/${slug}`);

		// If anything executed, these would be true.
		const executed = await page.evaluate(() => ({
			pwned: (window as any).__pwned === true,
			pwnedImg: (window as any).__pwned_img === true,
			pwnedLink: (window as any).__pwned_link === true
		}));
		expect(executed).toEqual({ pwned: false, pwnedImg: false, pwnedLink: false });

		// Ensure dangerous elements did not appear as real DOM inside the code block.
		await expect(page.locator('pre code script')).toHaveCount(0);
		await expect(page.locator('pre code img')).toHaveCount(0);
		await expect(page.locator('pre code a')).toHaveCount(0);

		// But the literal text should still be visible somewhere in the code block.
		const code = page.locator('pre > code');
		await expect(code).toContainText('<script>window.__pwned = true</script>');
	});
});
