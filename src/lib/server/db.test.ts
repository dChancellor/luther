import { describe, it, expect, vi, beforeEach } from 'vitest';

const envState = vi.hoisted(() => ({
	DATABASE_URL: 'file:./dev.db',
	AUTH_TOKEN: 'test-token'
}));

vi.mock('$env/dynamic/private', () => ({
	env: envState
}));

const executeMock = vi.fn();
const createClientMock = vi.fn(() => ({
	execute: executeMock
}));

vi.mock('@libsql/client', () => ({
	createClient: createClientMock
}));

async function importFreshDb() {
	vi.resetModules();
	return import('./db');
}

describe('db + getRow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		executeMock.mockReset();

		envState.DATABASE_URL = 'file:./dev.db';
		envState.AUTH_TOKEN = 'test-token';
	});

	it('creates a client with authToken undefined when DATABASE_URL starts with file:', async () => {
		await importFreshDb();

		expect(createClientMock).toHaveBeenCalledTimes(1);
		expect(createClientMock).toHaveBeenCalledWith({
			url: 'file:./dev.db',
			authToken: undefined
		});
	});

	it('creates a client with authToken set when DATABASE_URL is not file:', async () => {
		envState.DATABASE_URL = 'libsql://example.turso.io';
		envState.AUTH_TOKEN = 'secret-token';

		await importFreshDb();

		expect(createClientMock).toHaveBeenCalledTimes(1);
		expect(createClientMock).toHaveBeenCalledWith({
			url: 'libsql://example.turso.io',
			authToken: 'secret-token'
		});
	});

	it('getRow executes the expected query and returns rows[0]', async () => {
		const mod = await importFreshDb();

		const fakeRow = {
			slug: 'abc123',
			content: 'hello',
			created_at: '2025-12-21T00:00:00Z',
			language: 'plaintext'
		};

		executeMock.mockResolvedValueOnce({ rows: [fakeRow] });

		const result = await mod.getRow('abc123');

		expect(executeMock).toHaveBeenCalledTimes(1);

		const callArg = executeMock.mock.calls[0]?.[0];
		expect(callArg.args).toEqual(['abc123']);

		const sql = String(callArg.sql).replace(/\s+/g, ' ').trim();
		expect(sql).toContain(
			'SELECT slug, content, created_at, language FROM pastes WHERE slug = ? AND deleted_at IS NULL'
		);

		expect(result).toEqual(fakeRow);
	});

	it('getRow returns undefined when no rows are returned', async () => {
		const mod = await importFreshDb();

		executeMock.mockResolvedValueOnce({ rows: [] });

		const result = await mod.getRow('missing');
		expect(result).toBeUndefined();
	});
});
