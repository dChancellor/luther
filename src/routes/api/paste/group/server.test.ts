/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { createRowInGroup } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';

vi.mock('$lib/server/db', () => ({
	createRowInGroup: vi.fn()
}));

vi.mock('$lib/server/slug', () => ({
	generateSlug: vi.fn()
}));

vi.mock('$lib/server/detect-language', () => ({
	detectLanguage: vi.fn(() => 'javascript')
}));

vi.mock('$lib/server/error', () => ({
	getErrorMessage: vi.fn((err) => err.message)
}));

describe('POST /api/paste/group', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockUrl = new URL('https://example.com');

	it('returns 201 and the slug on success', async () => {
		const text = 'console.log("hello")';
		const groupId = 'test-group-id';
		const slug = 'test12';

		vi.mocked(generateSlug).mockReturnValue(slug);
		vi.mocked(createRowInGroup).mockResolvedValue(true);

		const request = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ text, groupId }),
			headers: {
				'content-type': 'application/json',
				'x-internal-test-bypass': '1'
			}
		});

		const response = await POST({ request, url: mockUrl } as any);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.slug).toBe(slug);
		expect(data.url).toBe(`https://example.com/${slug}`);
		expect(createRowInGroup).toHaveBeenCalledWith(slug, text, 'javascript', groupId);
	});

	it('returns 400 if the text is empty', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ text: '   ', groupId: 'test-group' }),
			headers: {
				'content-type': 'application/json',
				'x-internal-test-bypass': '1'
			}
		});

		const response = await POST({ request, url: mockUrl } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('non-empty text');
	});

	it('returns 400 if groupId is missing', async () => {
		const request = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ text: 'some text' }),
			headers: {
				'content-type': 'application/json',
				'x-internal-test-bypass': '1'
			}
		});

		const response = await POST({ request, url: mockUrl } as any);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('groupId is required');
	});

	it('returns 413 if the text exceeds MAX_BYTES', async () => {
		const bigText = 'a'.repeat(200_001);
		const request = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ text: bigText, groupId: 'test-group' }),
			headers: {
				'content-type': 'application/json',
				'x-internal-test-bypass': '1'
			}
		});

		const response = await POST({ request, url: mockUrl } as any);

		expect(response.status).toBe(413);
	});

	it('retries if slug creation fails initially', async () => {
		vi.mocked(generateSlug).mockReturnValue('collision');

		vi.mocked(createRowInGroup).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

		const request = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ text: 'some text', groupId: 'test-group' }),
			headers: {
				'content-type': 'application/json',
				'x-internal-test-bypass': '1'
			}
		});

		const response = await POST({ request, url: mockUrl } as any);

		expect(response.status).toBe(201);
		expect(createRowInGroup).toHaveBeenCalledTimes(2);
	});

	it('returns 500 if all 5 slug attempts fail', async () => {
		vi.mocked(createRowInGroup).mockResolvedValue(false);

		const request = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ text: 'some text', groupId: 'test-group' }),
			headers: {
				'content-type': 'application/json',
				'x-internal-test-bypass': '1'
			}
		});

		const response = await POST({ request, url: mockUrl } as any);

		expect(response.status).toBe(500);
		expect(createRowInGroup).toHaveBeenCalledTimes(5);
	});
});
