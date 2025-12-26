import { env } from '$env/dynamic/private';
import { API_KEY_HEADER } from '$lib/constants/constants';

type AuthenticatedResponse =
	| {
			authenticated: false;
			response: Response;
	  }
	| { authenticated: true };

export function authenticate(request: Request): AuthenticatedResponse {
	const expectedKey = env.API_KEY;

	if (!expectedKey) {
		return {
			authenticated: false,
			response: new Response(
				JSON.stringify({
					error: 'Server not configured: API_KEY environment variable is not set.'
				}),
				{
					status: 500,
					headers: { 'content-type': 'application/json' }
				}
			)
		};
	}

	const providedKey = request.headers.get(API_KEY_HEADER);

	if (providedKey !== expectedKey) {
		return {
			authenticated: false,
			response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: {
					'content-type': 'application/json'
				}
			})
		};
	}

	return { authenticated: true };
}
