import type { Handle } from '@sveltejs/kit';
import { isRateLimited } from '$lib/server/middlewares/rate-limiting';
import { authenticate } from '$lib/server/middlewares/authentication';
import { getIsProtectedRoute } from '$lib/server/middlewares/protected-route';
import { setTestEnvironment } from '$lib/server/middlewares/set-test-environment';

export interface TruncatedResponse {
	status: number;
	message: string;
}

export const handle: Handle = async ({ event, resolve }) => {
	const isProtectedRoute = getIsProtectedRoute(event);
	const isInTestEnvironment = setTestEnvironment();

	if (isProtectedRoute) {
		const auth = authenticate(event.request);
		if (!auth.authenticated) return auth.response;
	}

	if (!isInTestEnvironment && isProtectedRoute) {
		const rateLimit = isRateLimited(event);
		if (rateLimit.limited) return rateLimit.response;
	}

	const response = await resolve(event);

	return response;
};
