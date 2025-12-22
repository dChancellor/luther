// TODO - refactor opportunity - reuse things from other tests. Remove magic numbers (ex: rate limit number)
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

	it('rate limits POST /api/paste per client IP from x-forwarded-for', async () => {
		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		const mkEvent = () =>
			({
				request: new Request('http://localhost/api/paste', {
					method: 'POST',
					headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
				}),
				url: new URL('http://localhost/api/paste'),
				getClientAddress: () => '9.9.9.9'
			}) as unknown as MockEvent;

		let last: Response | undefined;

		// If your limiter is maxRequests = 30, the 31st request should be blocked.
		for (let i = 0; i < 6; i++) {
			last = await handle({ event: mkEvent(), resolve } as HandleArg);
		}

		expect(last!.status).toBe(429);
		expect(last!.headers.get('content-type')).toContain('application/json');
		expect(last!.headers.get('retry-after')).toBeTruthy();

		const body = await last!.json();
		expect(body).toEqual({ error: 'Rate limit exceeded. Please try again soon.' });

		// Allowed requests should have reached resolve
		expect((resolve as any).mock.calls.length).toBe(5);
	});

	it('rate limits POST /api/paste using getClientAddress when proxy headers are absent', async () => {
		const { handle } = await import('./hooks.server');

		type HandleArg = Parameters<typeof handle>[0];
		type MockEvent = HandleArg['event'];

		vi.spyOn(Date, 'now').mockReturnValue(2_000_000);

		const resolve = makeResolve() as unknown as HandleArg['resolve'];

		const mkEvent = () =>
			({
				request: new Request('http://localhost/api/paste', { method: 'POST' }),
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
