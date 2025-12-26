import { API_KEY_HEADER } from '$lib/constants/constants';
import { describe, it, expect, vi } from 'vitest';
import { authenticate } from './authentication';
import { env } from '$env/dynamic/private';

vi.mock('$env/dynamic/private', () => ({
	env: {
		API_KEY: undefined
	}
}));

describe('authenticate', () => {
	it('returns 500 Response when API_KEY is not configured', async () => {
		const req = new Request('http://localhost/api/paste', {
			method: 'POST',
			headers: { [API_KEY_HEADER]: 'anything' }
		});

		const result = authenticate(req);

		expect(result.authenticated).toBe(false);
		if (result.authenticated) throw new Error('Expected unauthenticated result');
		expect(result.response.status).toBe(500);
	});

	it('returns false authentication when header is missing', async () => {
		env.API_KEY = 'expected-secret';

		const req = new Request('http://localhost/api/paste', { method: 'POST' });

		const result = authenticate(req);

		expect(result.authenticated).toBe(false);
		if (result.authenticated) throw new Error('Expected unauthenticated result');
		expect(result.response.status).toBe(401);
	});

	it('returns 401 Response when API key is wrong', async () => {
		env.API_KEY = 'expected-secret';

		const req = new Request('http://localhost/api/paste', {
			method: 'POST',
			headers: { [API_KEY_HEADER]: 'wrong-secret' }
		});

		const result = authenticate(req);

		expect(result.authenticated).toBe(false);
		if (result.authenticated) throw new Error('Expected unauthenticated result');
		expect(result.response.status).toBe(401);
	});

	it('returns authenticated: true when API key matches', () => {
		env.API_KEY = 'expected-secret';

		const req = new Request('http://localhost/api/paste', {
			method: 'POST',
			headers: { [API_KEY_HEADER]: 'expected-secret' }
		});

		const result = authenticate(req);
		expect(result).toEqual({ authenticated: true });
	});
});
