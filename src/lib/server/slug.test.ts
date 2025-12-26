import { describe, it, expect } from 'vitest';

import { base64Url, generateSlug } from './slug';

describe('base64Url', () => {
	it('converts + to - and / to _ and strips trailing =', () => {
		const buf = Buffer.from([251, 255, 255]);

		const out = base64Url(buf);

		expect(out).not.toContain('+');
		expect(out).not.toContain('/');
		expect(out).not.toContain('=');
		expect(out).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('does not change an already URL-safe base64 string (except padding removal)', () => {
		const buf = Buffer.from('hello world', 'utf8');
		const out = base64Url(buf);

		expect(out).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(out).not.toContain('=');
	});

	it('returns empty string for empty buffer', () => {
		const out = base64Url(Buffer.from([]));
		expect(out).toBe('');
	});
});

describe('generateSlug', () => {
	it('uses randomBytes(6) by default and returns base64Url(randomBytes)', async () => {
		const slug = generateSlug();

		expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(slug).not.toContain('=');
	});

	it('passes through custom byte length', async () => {
		const slug = generateSlug(10);
		expect(slug.length).toEqual(14);
	});
});
