// TODO: refactor this
import { env } from '$env/dynamic/private';
import type { Handle, RequestEvent } from '@sveltejs/kit';

type RateLimitedResponse =
	| {
			limited: true;
			response: Response;
	  }
	| { limited: false };

const RATE_LIMIT = {
	windowMs: Number(env.REQUEST_WINDOW) || 60000, // 1 minute
	maxRequests: Number(env.MAX_REQUESTS) || 10
};

type Bucket = { resetAt: number; count: number };
const buckets = new Map<string, Bucket>();

function getClientIp(event: Parameters<Handle>[0]['event']): string {
	const xff = event.request.headers.get('x-forwarded-for');
	if (xff) return xff.split(',')[0].trim();
	return event.getClientAddress();
}

export function temporaryName(
	key: string,
	now: number
): { limited: boolean; retryAfterSec?: number } {
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

export function pruneBuckets(now: number) {
	if (buckets.size < 5_000) return;

	for (const [k, b] of buckets) {
		if (now >= b.resetAt) buckets.delete(k);
	}
}

export function isRateLimited(event: RequestEvent): RateLimitedResponse {
	const now = Date.now();
	const ip = getClientIp(event);
	const key = `paste:${ip}`;
	const { limited, retryAfterSec } = temporaryName(key, now);

	if (limited) {
		return {
			limited: true,
			response: new Response(
				JSON.stringify({ error: 'Rate limit exceeded. Please try again soon.' }),
				{
					status: 429,
					headers: {
						'content-type': 'application/json',
						'retry-after': String(retryAfterSec ?? 60)
					}
				}
			)
		};
	}

	pruneBuckets(now);
	return { limited: false };
}
