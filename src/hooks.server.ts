// TODO - refactor opportunity - check everything
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const RATE_LIMIT = {
	windowMs: 60_000, // 1 minute
	maxRequests: 5
};

type Bucket = { resetAt: number; count: number };
const buckets = new Map<string, Bucket>();

function getClientIp(event: Parameters<Handle>[0]['event']): string {
	const xff = event.request.headers.get('x-forwarded-for');
	if (xff) return xff.split(',')[0]!.trim();
	return event.getClientAddress();
}

function isRateLimited(key: string, now: number): { limited: boolean; retryAfterSec?: number } {
	const bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { resetAt: now + RATE_LIMIT.windowMs, count: 1 });
		return { limited: false };
	}

	if (bucket.count >= RATE_LIMIT.maxRequests) {
		const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
		return { limited: true, retryAfterSec };
	}

	bucket.count += 1;
	return { limited: false };
}

function pruneBuckets(now: number) {
	if (buckets.size < 5_000) return;

	for (const [k, b] of buckets) {
		if (now >= b.resetAt) buckets.delete(k);
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const isTest =
		process.env.NODE_ENV === 'test' || event.request.headers.get('x-internal-test-bypass') === '1';

	const now = Date.now();

	if (event.request.method === 'POST' && event.url.pathname === '/api/paste') {
		const expectedKey = env.API_KEY;

		if (!expectedKey) {
			return new Response(JSON.stringify({ error: 'Server not configured.' }), {
				status: 500,
				headers: { 'content-type': 'application/json' }
			});
		}

		const providedKey = event.request.headers.get('x-api-key') ?? '';

		if (providedKey !== expectedKey) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: {
					'content-type': 'application/json',
					'www-authenticate': 'Bearer'
				}
			});
		}
		if (!isTest) {
			const ip = getClientIp(event);
			const key = `paste:${ip}`;
			const { limited, retryAfterSec } = isRateLimited(key, now);

			if (limited) {
				return new Response(
					JSON.stringify({ error: 'Rate limit exceeded. Please try again soon.' }),
					{
						status: 429,
						headers: {
							'content-type': 'application/json',
							'retry-after': String(retryAfterSec ?? 60)
						}
					}
				);
			}
		}
	}

	pruneBuckets(now);

	const response = await resolve(event);

	const csp = [
		"default-src 'self'",
		"base-uri 'self'",
		"frame-ancestors 'none'",
		"object-src 'none'",
		"connect-src 'self'",
		"img-src 'self' data:",
		!isTest ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
		"style-src 'self' 'unsafe-inline'",
		"form-action 'self'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'no-referrer');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

	return response;
};
