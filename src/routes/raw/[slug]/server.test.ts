// TODO - refactor opportunity - reuse things from other tests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import { getRow } from '$lib/server/db';
import { error } from '@sveltejs/kit';

vi.mock('$lib/server/db', () => ({
	getRow: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status, message) => ({ status, message }))
}));

describe('GET /api/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the content as text/plain on success', async () => {
		const mockData = {
			slug: 'test-slug',
			content: 'Hello, this is a test paste!',
			language: 'text',
			created_at: '1'
		};

		vi.mocked(getRow).mockResolvedValue(mockData);

		const params = { slug: 'test-slug' };

		const response = await GET({ params } as any);

		expect(getRow).toHaveBeenCalledWith('test-slug');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');

		const text = await response.text();
		expect(text).toBe(mockData.content);
	});

	it('throws a 404 error if the row is not found', async () => {
		vi.mocked(getRow).mockResolvedValue(null);

		const params = { slug: 'non-existent' };

		try {
			await GET({ params } as any);
		} catch (err: any) {
			expect(err.status).toBe(404);
			expect(err.message).toBe('Not found');
			expect(error).toHaveBeenCalledWith(404, 'Not found');
		}
	});

	it('fails if the data does not match the schema', async () => {
		vi.mocked(getRow).mockResolvedValue({ slug: 'bad-data' });

		const params = { slug: 'bad-data' };

		await expect(GET({ params } as any)).rejects.toThrow();
	});
});
