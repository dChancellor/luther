import { describe, it, expect, vi } from 'vitest';
import { fakeRow } from '../../test/constants';

const envState = vi.hoisted(() => ({
	DATABASE_URL: 'file:./dev.db',
	AUTH_TOKEN: 'test-token'
}));

vi.mock('$env/dynamic/private', () => ({
	env: envState
}));

const executeMock = vi.fn();
const batchMock = vi.fn();
const createClientMock = vi.fn(() => ({
	execute: executeMock,
	batch: batchMock
}));

vi.mock('@libsql/client', () => ({
	createClient: createClientMock
}));

async function importFreshDb() {
	vi.resetModules();
	return import('./db');
}

describe('Database setup', () => {
	it('creates a client with authToken undefined when DATABASE_URL starts with file:', async () => {
		await importFreshDb();

		expect(createClientMock).toHaveBeenCalledWith({
			url: 'file:./dev.db',
			authToken: undefined
		});
	});

	it('creates a client with authToken set when DATABASE_URL is not file:', async () => {
		envState.DATABASE_URL = 'libsql://example.turso.io';

		await importFreshDb();

		expect(createClientMock).toHaveBeenCalledWith({
			url: envState.DATABASE_URL,
			authToken: envState.AUTH_TOKEN
		});
	});
});

describe('Database CREATE functions', () => {
	it('createRow executes the expected query and returns the row', async () => {
		const { createRow } = await importFreshDb();
		executeMock.mockResolvedValueOnce({ ...fakeRow });

		const result = await createRow({ ...fakeRow });

		expect(result).toEqual(fakeRow);
	});

	it('createRow returns null when no rows are returned', async () => {
		const { createRow } = await importFreshDb();

		executeMock.mockResolvedValueOnce(null);

		const result = await createRow({ ...fakeRow });
		expect(result).toBeNull();
	});

	it('createGroup executes the expected query and returns the rows', async () => {
		const { createGroup } = await importFreshDb();
		batchMock.mockResolvedValueOnce({ ...fakeRow });

		const result = await createGroup([{ ...fakeRow }], 'group123');

		expect(result).toEqual(fakeRow);
	});

	it('createGroup returns null when no rows are returned', async () => {
		const { createGroup } = await importFreshDb();

		batchMock.mockResolvedValueOnce(null);

		const result = await createGroup([{ ...fakeRow }], 'group_id');
		expect(result).toBeNull();
	});
});

describe('Database READ functions', () => {
	it('getRow executes the expected query and returns the row', async () => {
		const { getRow } = await importFreshDb();
		executeMock.mockResolvedValueOnce({ rows: [fakeRow] });

		const result = await getRow(fakeRow.slug);

		expect(result).toEqual(fakeRow);
	});

	it('getRow returns undefined when no rows are returned', async () => {
		const { getRow } = await importFreshDb();

		executeMock.mockResolvedValueOnce({ rows: [] });

		const result = await getRow('missing');
		expect(result).toBeUndefined();
	});

	it('getRows returns the correct rows associated by group_id', async () => {
		const { getRows } = await importFreshDb();

		const fakeRow2 = { ...fakeRow, slug: 'new-row' };
		executeMock.mockResolvedValueOnce({ rows: [fakeRow, fakeRow2] });

		const result = await getRows(fakeRow.slug);

		expect(result?.length).toEqual(2);
	});

	it('getRows returns undefined when no rows are associated by group_id', async () => {
		const { getRows } = await importFreshDb();
		executeMock.mockResolvedValueOnce({ rows: [fakeRow, fakeRow] });

		const result = await getRows('missing');

		expect(result?.length).toEqual(2);
	});
});

describe('Database UPDATE functions', () => {
	it('updateRow is called and returns true', async () => {
		const { updateRow } = await importFreshDb();
		executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

		const result = await updateRow(fakeRow.slug, 'new content');
		expect(result).toBeTruthy();
	});

	it('updateRow returns undefined when no rows have been updated', async () => {
		const { getRow } = await importFreshDb();

		executeMock.mockResolvedValueOnce({ rows: [] });

		const result = await getRow('missing');
		expect(result).toBeUndefined();
	});
});

describe('Database DELETE functions', () => {
	it('deleteRow is called and returns true', async () => {
		const { deleteRow } = await importFreshDb();
		executeMock.mockResolvedValueOnce({ rowsAffected: 1 });

		const result = await deleteRow(fakeRow.slug);

		expect(result).toEqual(true);
	});

	it('deleteRow returns false when no rows have been deleted', async () => {
		const { deleteRow } = await importFreshDb();

		executeMock.mockResolvedValueOnce({ rowsAffected: 0 });

		const result = await deleteRow(fakeRow.slug);
		expect(result).toEqual(false);
	});
});
