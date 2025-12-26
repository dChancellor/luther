import type { RequestEvent } from '@sveltejs/kit';

export function getIsProtectedRoute(event: RequestEvent): boolean {
	const isApiPathName = event.url.pathname.startsWith('/api');
	const isApiPasteWrite = event.request.method === 'POST' && isApiPathName;
	return isApiPasteWrite;
}
