// TODO - refactor opportunity - reuse things from other tests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { db } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';

vi.mock('$lib/server/db', () => ({
	db: { execute: vi.fn() }
}));

vi.mock('$lib/server/slug', () => ({
	generateSlug: vi.fn()
}));

vi.mock('$lib/server/detect-language', () => ({
	detectLanguage: vi.fn(() => 'typescript')
}));

vi.mock('$lib/server/error', () => ({
	getErrorMessage: vi.fn((err) => err.message)
}));

describe('POST /api/paste', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockUrl = new URL('https://example.com');

	it('returns 201 and the slug on success', async () => {
		const text = 'console.log("hello")';
		const slug = 'test12';

		vi.mocked(generateSlug).mockReturnValue(slug);
		vi.mocked(db.execute).mockResolvedValue({} as any);

		const request = new Request('https://example.com', {
			method: 'POST',
			body: text
		});

		const response = await POST({ request, url: mockUrl } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.slug).toBe(slug);
		expect(data.url).toBe(`https://example.com/${slug}`);
		expect(db.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				args: [slug, text, 'typescript']
			})
		);
	});

	it('returns 400 if the text is empty', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			body: '   '
		});

		const response = await POST({ request, url: mockUrl } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('non-empty text');
	});

	it('returns 413 if the text exceeds MAX_BYTES', async () => {
		const bigText = 'a'.repeat(200_001);
		const request = new Request('https://example.com', {
			method: 'POST',
			body: bigText
		});

		const response = await POST({ request, url: mockUrl } as any);

		expect(response.status).toBe(413);
	});

	it('retries if a slug collision occurs (UNIQUE constraint error)', async () => {
		vi.mocked(generateSlug).mockReturnValue('collision');

		vi.mocked(db.execute)
			.mockRejectedValueOnce(new Error('UNIQUE constraint failed'))
			.mockResolvedValueOnce({} as any);

		const request = new Request('https://example.com', {
			method: 'POST',
			body: 'some text'
		});

		const response = await POST({ request, url: mockUrl } as any);

		expect(response.status).toBe(201);
		expect(db.execute).toHaveBeenCalledTimes(2);
	});

	it('returns 500 if all 5 slug attempts fail', async () => {
		vi.mocked(db.execute).mockRejectedValue(new Error('UNIQUE constraint failed'));

		const request = new Request('https://example.com', {
			method: 'POST',
			body: 'some text'
		});

		const response = await POST({ request, url: mockUrl } as any);

		expect(response.status).toBe(500);
		expect(db.execute).toHaveBeenCalledTimes(5);
	});
});
