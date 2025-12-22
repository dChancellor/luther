import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './error';

describe('getErrorMessage', () => {
	it('returns message from Error instance', () => {
		const err = new Error('Something went wrong');

		const result = getErrorMessage(err);

		expect(result).toBe('Something went wrong');
	});

	it('returns string directly when err is a string', () => {
		const err = 'Plain string error';

		const result = getErrorMessage(err);

		expect(result).toBe('Plain string error');
	});

	it('returns JSON stringified value for plain objects', () => {
		const err = { code: 500, message: 'Server error' };

		const result = getErrorMessage(err);

		expect(result).toBe(JSON.stringify(err));
	});

	it('returns stringified value for arrays', () => {
		const err = ['error', 123];

		const result = getErrorMessage(err);

		expect(result).toBe(JSON.stringify(err));
	});

	it('handles null', () => {
		const result = getErrorMessage(null);

		expect(result).toBe('null');
	});

	it('handles undefined', () => {
		const result = getErrorMessage(undefined);

		expect(result).toBe(undefined);
	});
});
