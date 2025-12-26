import { describe, it, expect } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { getIsProtectedRoute } from './protected-route';

function createEvent(method: string, path: string): RequestEvent {
	return {
		request: new Request(`http://localhost${path}`, { method }),
		url: new URL(`http://localhost${path}`)
	} as unknown as RequestEvent;
}

describe('getIsProtectedRoute for /api/paste', () => {
	it.each([
		['GET', '/api/paste', false],
		['POST', '/api/paste', true],
		['PUT', '/api/paste', false],
		['DELETE', '/api/paste', false]
	])('%s on %s → %s', (method, path, expected) => {
		const event = createEvent(method, path);
		expect(getIsProtectedRoute(event)).toBe(expected);
	});
});

describe('getIsProtectedRoute for /api/[slug]', () => {
	it.each([
		['GET', '/api/abc123', false],
		['POST', '/api/abc123', true],
		['PUT', '/api/abc123', false],
		['DELETE', '/api/abc123', false]
	])('%s on %s → %s', (method, path, expected) => {
		const event = createEvent(method, path);
		expect(getIsProtectedRoute(event)).toBe(expected);
	});
});

describe('getIsProtectedRoute for /[slug]', () => {
	it.each([
		['GET', '/abc123', false],
		['POST', '/abc123', false],
		['PUT', '/abc123', false],
		['DELETE', '/abc123', false]
	])('%s on %s → %s', (method, path, expected) => {
		const event = createEvent(method, path);
		expect(getIsProtectedRoute(event)).toBe(expected);
	});
});
