/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { duplicateRow } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';

vi.mock('$lib/server/db', () => ({
	duplicateRow: vi.fn()
}));

vi.mock('$lib/server/slug', () => ({
	generateSlug: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status, message) => {
		throw new Error(`${status}: ${message}`);
	})
}));

describe('POST /api/[slug]/duplicate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('successfully duplicates a row and returns the new slug', async () => {
		const mockSlug = 'original-slug';
		const mockNewSlug = 'new-slug-123';

		vi.mocked(generateSlug).mockReturnValue(mockNewSlug);
		vi.mocked(duplicateRow).mockResolvedValue(true);

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		const response = await POST(mockRequest);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			slug: mockNewSlug,
			url: `http://localhost:3000/${mockNewSlug}`
		});
		expect(duplicateRow).toHaveBeenCalledWith(mockSlug, mockNewSlug);
	});

	it('retries with new slugs on unique constraint violation', async () => {
		const mockSlug = 'original-slug';
		const mockNewSlug1 = 'new-slug-1';
		const mockNewSlug2 = 'new-slug-2';

		vi.mocked(generateSlug).mockReturnValueOnce(mockNewSlug1).mockReturnValueOnce(mockNewSlug2);

		vi.mocked(duplicateRow)
			.mockRejectedValueOnce(new Error('UNIQUE constraint failed'))
			.mockResolvedValueOnce(true);

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		const response = await POST(mockRequest);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			slug: mockNewSlug2,
			url: `http://localhost:3000/${mockNewSlug2}`
		});
		expect(duplicateRow).toHaveBeenCalledTimes(2);
	});

	it('throws error when duplication fails after retries', async () => {
		const mockSlug = 'original-slug';

		vi.mocked(generateSlug).mockReturnValue('new-slug-123');
		vi.mocked(duplicateRow).mockResolvedValue(false);

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		await expect(POST(mockRequest)).rejects.toThrow('500: Failed to duplicate paste');
	});

	it('throws error when a non-unique error occurs', async () => {
		const mockSlug = 'original-slug';

		vi.mocked(generateSlug).mockReturnValue('new-slug-123');
		vi.mocked(duplicateRow).mockRejectedValue(new Error('Database connection failed'));

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		await expect(POST(mockRequest)).rejects.toThrow('Database connection failed');
	});
});
