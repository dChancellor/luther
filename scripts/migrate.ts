import { readFileSync, readdirSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

loadEnvFile();

const url = process.env.DATABASE_URL;
const authToken = process.env.AUTH_TOKEN;

if (!url) throw new Error('Missing DATABASE_URL');

const client = createClient({
	url,
	authToken: url.startsWith('file:') ? undefined : authToken
});

const migrationsDir = join(process.cwd(), 'migrations');
const files = readdirSync(migrationsDir)
	.filter((f) => f.endsWith('.sql'))
	.sort();

for (const file of files) {
	const sql = readFileSync(join(migrationsDir, file), 'utf8').trim();
	if (!sql) continue;

	console.log(`Applying ${file}...`);
	await client.execute(sql);
}

console.log('Done.');
