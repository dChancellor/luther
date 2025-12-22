// TODO - refactor opportunity - reuse things from other tests. Remove magic numbers (ex: rate limit number)
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const envState = vi.hoisted(() => ({
	API_KEY: undefined as string | undefined
}));

vi.mock('$env/dynamic/private', () => ({
	env: envState
}));

function makeResolve() {
	return vi.fn(async () => {
		return new Response('ok', {
			status: 200,
			headers: {
				'content-type': 'text/plain',
				'x-existing': 'kept'
			}
		});
	});
}

describe('hooks.server.ts handle()', () => {
	beforeEach(() => {
		vi.resetModules();
		delete process.env.API_KEY;
		envState.API_KEY = undefined;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('adds security headers to responses', async () => {
		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		const event = {
			request: new Request('http://localhost/'),
			url: new URL('http://localhost/'),
			getClientAddress: () => '9.9.9.9'
		} as unknown as MockEvent;

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		const res = await handle({ event, resolve } as HandleArg);

		expect(res.status).toBe(200);
		expect(res.headers.get('x-existing')).toBe('kept');

		const csp = res.headers.get('Content-Security-Policy');
		expect(csp).toBeTruthy();
		expect(csp!).toContain("default-src 'self'");
		expect(csp!).toContain("frame-ancestors 'none'");
		expect(csp!).toContain("object-src 'none'");

		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
		expect(res.headers.get('X-Frame-Options')).toBe('DENY');
		expect(res.headers.get('Permissions-Policy')).toContain('geolocation=()');
		expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=');
	});

	it('returns 500 for POST /api/paste when API_KEY is not configured', async () => {
		// Ensure API_KEY is not set
		envState.API_KEY = undefined;

		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		const event = {
			request: new Request('http://localhost/api/paste', { method: 'POST' }),
			url: new URL('http://localhost/api/paste'),
			getClientAddress: () => '1.2.3.4'
		} as unknown as MockEvent;

		const res = await handle({ event, resolve } as HandleArg);
		expect(res.status).toBe(500);
		expect(res.headers.get('content-type')).toContain('application/json');
		expect(await res.json()).toEqual({ error: 'Server not configured.' });

		expect((resolve as any).mock.calls.length).toBe(0);
	});

	it('returns 401 for POST /api/paste when x-api-key is missing or wrong', async () => {
		envState.API_KEY = 'secret';

		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		const eventMissing = {
			request: new Request('http://localhost/api/paste', { method: 'POST' }),
			url: new URL('http://localhost/api/paste'),
			getClientAddress: () => '1.2.3.4'
		} as unknown as MockEvent;

		const resMissing = await handle({ event: eventMissing, resolve } as HandleArg);
		expect(resMissing.status).toBe(401);
		expect(resMissing.headers.get('content-type')).toContain('application/json');
		expect(await resMissing.json()).toEqual({ error: 'Unauthorized' });

		const eventWrong = {
			request: new Request('http://localhost/api/paste', {
				method: 'POST',
				headers: { 'x-api-key': 'wrong' }
			}),
			url: new URL('http://localhost/api/paste'),
			getClientAddress: () => '1.2.3.4'
		} as unknown as MockEvent;

		const resWrong = await handle({ event: eventWrong, resolve } as HandleArg);
		expect(resWrong.status).toBe(401);
		expect(resWrong.headers.get('content-type')).toContain('application/json');
		expect(await resWrong.json()).toEqual({ error: 'Unauthorized' });

		expect((resolve as any).mock.calls.length).toBe(0);
	});

	it('rate limits authorized POST /api/paste per API key', async () => {
		process.env.NODE_ENV = 'rate-limit';
		envState.API_KEY = 'test';
		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		process.env.NODE_ENV = 'rate-limit';

		const mkEvent = () =>
			({
				request: new Request('http://localhost/api/paste', {
					method: 'POST',
					headers: { 'x-api-key': 'test' }
				}),
				url: new URL('http://localhost/api/paste'),
				getClientAddress: () => '9.9.9.9'
			}) as unknown as MockEvent;

		let last: Response | undefined;

		for (let i = 0; i < 6; i++) {
			last = await handle({ event: mkEvent(), resolve } as HandleArg);
		}

		expect(last!.status).toBe(429);
		expect(last!.headers.get('content-type')).toContain('application/json');
		expect(last!.headers.get('retry-after')).toBeTruthy();

		const body = await last!.json();
		expect(body).toEqual({ error: 'Rate limit exceeded. Please try again soon.' });

		expect((resolve as any).mock.calls.length).toBe(5);
	});

	it('rate limits POST /api/paste using getClientAddress when proxy headers are absent', async () => {
		process.env.NODE_ENV = 'rate-limit';
		envState.API_KEY = 'test';
		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		vi.spyOn(Date, 'now').mockReturnValue(2_000_000);

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		process.env.NODE_ENV = 'rate-limit';

		const mkEvent = () =>
			({
				request: new Request('http://localhost/api/paste', {
					method: 'POST',
					headers: { 'x-api-key': 'test' }
				}),
				url: new URL('http://localhost/api/paste'),
				getClientAddress: () => '7.7.7.7'
			}) as unknown as MockEvent;

		let last: Response | undefined;

		for (let i = 0; i < 6; i++) {
			last = await handle({ event: mkEvent(), resolve } as HandleArg);
		}

		expect(last!.status).toBe(429);
		expect((resolve as any).mock.calls.length).toBe(5);
	});

	it('does not rate limit other routes/methods', async () => {
		envState.API_KEY = 'secret';

		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		vi.spyOn(Date, 'now').mockReturnValue(3_000_000);

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		const event = {
			request: new Request('http://localhost/api/not-paste', { method: 'POST' }),
			url: new URL('http://localhost/api/not-paste'),
			getClientAddress: () => '1.2.3.4'
		} as unknown as MockEvent;

		const res = await handle({ event, resolve } as HandleArg);
		expect(res.status).toBe(200);
		expect((resolve as any).mock.calls.length).toBe(1);
	});
});
