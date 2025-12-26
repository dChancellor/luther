import { describe, it, expect } from 'vitest';
import { isValidText, MAX_BYTES } from './valid-text';

describe('isValidText', () => {
	it('returns 400 when content is empty', async () => {
		const result = isValidText('');

		expect(result.valid).toBe(false);
		if (result.valid) throw new Error('Expected invalid result');

		expect(result.response.status).toBe(400);
	});

	it('returns 400 when content is only whitespace', async () => {
		const result = isValidText('   \n\t  ');

		expect(result.valid).toBe(false);
		if (result.valid) throw new Error('Expected invalid result');

		expect(result.response.status).toBe(400);
	});

	it('returns 413 when content exceeds MAX_BYTES', async () => {
		const tooLarge = 'a'.repeat(MAX_BYTES + 1);

		const result = isValidText(tooLarge);

		expect(result.valid).toBe(false);
		if (result.valid) throw new Error('Expected invalid result');

		expect(result.response.status).toBe(413);
	});

	it('returns valid: true for normal text under MAX_BYTES', () => {
		const result = isValidText('Hello, world!');

		expect(result).toEqual({ valid: true });
	});
});
