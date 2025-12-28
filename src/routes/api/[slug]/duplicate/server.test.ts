/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { duplicateGroup, getRows } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';

vi.mock('$lib/server/db', () => ({
	duplicateGroup: vi.fn(),
	getRows: vi.fn()
}));

vi.mock('$lib/server/slug', () => ({
	generateSlug: vi.fn()
}));

vi.mock('crypto', () => ({
	randomUUID: vi.fn(() => 'test-group-id')
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

	it('successfully duplicates a bin with multiple rows and returns the first new slug', async () => {
		const mockSlug = 'original-slug';
		const mockNewSlug1 = 'new-slug-1';
		const mockNewSlug2 = 'new-slug-2';

		const mockRows: any = [
			{
				slug: 'original-slug',
				content: 'content1',
				language: 'js',
				group_id: 'old-group',
				length: 4
			},
			{
				slug: 'another-slug',
				content: 'content2',
				language: 'py',
				group_id: 'old-group',
				length: 4
			}
		];

		vi.mocked(getRows).mockResolvedValue(mockRows);
		vi.mocked(generateSlug).mockReturnValueOnce(mockNewSlug1).mockReturnValueOnce(mockNewSlug2);
		vi.mocked(duplicateGroup).mockResolvedValue(true);

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		const response = await POST(mockRequest);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			slug: mockNewSlug1,
			url: `http://localhost:3000/${mockNewSlug1}`
		});
		expect(duplicateGroup).toHaveBeenCalled();
	});

	it('retries with new slugs on unique constraint violation', async () => {
		const mockSlug = 'original-slug';
		const mockRows: any = [
			{ slug: 'original-slug', content: 'content', language: 'js', group_id: 'group', length: 4 }
		];

		vi.mocked(getRows).mockResolvedValue(mockRows);
		vi.mocked(generateSlug).mockReturnValue('new-slug');

		vi.mocked(duplicateGroup)
			.mockRejectedValueOnce(new Error('UNIQUE constraint failed'))
			.mockResolvedValueOnce(true);

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		const response = await POST(mockRequest);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body.slug).toBe('new-slug');
		expect(duplicateGroup).toHaveBeenCalledTimes(2);
	});

	it('throws error when bin is not found', async () => {
		const mockSlug = 'missing-slug';

		vi.mocked(getRows).mockResolvedValue(null);

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		await expect(POST(mockRequest)).rejects.toThrow('404: Paste not found');
	});

	it('throws error when duplication fails after retries', async () => {
		const mockSlug = 'original-slug';
		const mockRows: any = [
			{ slug: 'original-slug', content: 'content', language: 'js', group_id: 'group', length: 4 }
		];

		vi.mocked(getRows).mockResolvedValue(mockRows);
		vi.mocked(generateSlug).mockReturnValue('new-slug');
		vi.mocked(duplicateGroup).mockResolvedValue(false);

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		await expect(POST(mockRequest)).rejects.toThrow('500: Failed to duplicate bin');
	});

	it('throws error when a non-unique error occurs', async () => {
		const mockSlug = 'original-slug';
		const mockRows: any = [
			{ slug: 'original-slug', content: 'content', language: 'js', group_id: 'group', length: 4 }
		];

		vi.mocked(getRows).mockResolvedValue(mockRows);
		vi.mocked(generateSlug).mockReturnValue('new-slug');
		vi.mocked(duplicateGroup).mockRejectedValue(new Error('Database connection failed'));

		const mockRequest: any = {
			params: { slug: mockSlug },
			url: new URL('http://localhost:3000')
		};

		await expect(POST(mockRequest)).rejects.toThrow('Database connection failed');
	});
});
