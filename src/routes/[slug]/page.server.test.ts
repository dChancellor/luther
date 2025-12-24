// TODO - refactor opportunity - reuse things from other tests
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';
import { getRows } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import hljs from 'highlight.js';
import type { DataRow } from '$types/data';

vi.mock('$lib/server/db', () => ({
	getRow: vi.fn(),
	getRows: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status, message) => ({ status, message }))
}));

vi.mock('highlight.js', () => ({
	default: {
		highlight: vi.fn()
	}
}));

describe('PageServerLoad', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return highlighted data when a valid row is found', async () => {
		const mockRow = [
			{
				slug: 'test-slug',
				content: 'console.log("hello")',
				created_at: '2023-01-01',
				language: 'javascript',
				length: 1
			}
		];

		// Setup mocks
		vi.mocked(getRows).mockResolvedValue(mockRow);
		vi.mocked(hljs.highlight).mockReturnValue({ value: '<span class="code">...</span>' } as any);

		const result = (await load({ params: { slug: 'test-slug' } } as any)) as { rows: DataRow[] };

		expect(getRows).toHaveBeenCalledWith('test-slug');
		expect(hljs.highlight).toHaveBeenCalledWith(mockRow[0].content, { language: 'javascript' });
		expect(result.rows[0].content).toBe('<span class="code">...</span>');
		expect(result.rows[0].slug).toBe('test-slug');
	});

	it('should throw a 404 error if no row is returned from the DB', async () => {
		vi.mocked(getRows).mockResolvedValue(null);

		try {
			(await load({ params: { slug: 'missing' } } as any)) as DataRow;
		} catch {
			expect(error).toHaveBeenCalledWith(404, 'Not found');
		}
	});
});
