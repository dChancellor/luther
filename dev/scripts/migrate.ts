import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

if (existsSync('.env')) {
	loadEnvFile('.env');
}

const url = process.env.DATABASE_URL;
const authToken = process.env.AUTH_TOKEN;

if (!url) throw new Error('Missing DATABASE_URL');

const client = createClient({
	url,
	authToken: url.startsWith('file:') ? undefined : authToken
});

function stripComments(sql: string) {
	// remove /* ... */ blocks
	sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
	// remove -- ... to end of line
	sql = sql.replace(/--.*$/gm, '');
	return sql;
}

function splitStatements(sql: string): string[] {
	const out: string[] = [];
	let cur = '';
	let inSingle = false;
	let inDouble = false;

	for (let i = 0; i < sql.length; i++) {
		const ch = sql[i];
		const prev = i > 0 ? sql[i - 1] : '';

		if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
		if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;

		if (ch === ';' && !inSingle && !inDouble) {
			const stmt = cur.trim();
			if (stmt) out.push(stmt);
			cur = '';
			continue;
		}

		cur += ch;
	}

	const tail = cur.trim();
	if (tail) out.push(tail);
	return out;
}

const migrationsDir = join(process.cwd(), 'migrations');
const files = readdirSync(migrationsDir)
	.filter((f) => f.endsWith('.sql'))
	.sort();

for (const file of files) {
	const raw = readFileSync(join(migrationsDir, file), 'utf8');
	const sql = stripComments(raw).trim();
	if (!sql) continue;

	const statements = splitStatements(sql);
	if (statements.length === 0) continue;

	console.log(`Applying ${file} (${statements.length} statements)...`);

	await client.execute('BEGIN');
	try {
		for (let idx = 0; idx < statements.length; idx++) {
			const stmt = statements[idx];
			try {
				await client.execute(stmt);
			} catch (e) {
				console.error(
					`\nFailed in ${file} (statement ${idx + 1}/${statements.length}):\n${stmt}\n`
				);
				throw e;
			}
		}
		await client.execute('COMMIT');
	} catch (e) {
		await client.execute('ROLLBACK');
		throw e;
	}
}

console.log('Done.');
