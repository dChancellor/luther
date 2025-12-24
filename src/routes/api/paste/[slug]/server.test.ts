/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './+server';
import { deleteRow } from '$lib/server/db';

vi.mock('$lib/server/db', () => ({
	deleteRow: vi.fn()
}));

describe('DELETE /api/paste/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 and success true when paste is deleted', async () => {
		vi.mocked(deleteRow).mockResolvedValue(true);

		const response = await DELETE({
			params: { slug: 'abc123' }
		} as any);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(deleteRow).toHaveBeenCalledWith('abc123');
	});

	it('throws 404 error when paste is not found', async () => {
		vi.mocked(deleteRow).mockResolvedValue(false);

		await expect(
			DELETE({
				params: { slug: 'nonexistent' }
			} as any)
		).rejects.toThrow();
	});
});
