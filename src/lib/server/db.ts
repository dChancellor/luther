import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

const DATABASE_URL = env.DATABASE_URL ?? '';
const AUTH_TOKEN = env.AUTH_TOKEN ?? '';

const isFile = DATABASE_URL.startsWith('file:');

export const db = createClient({
	url: DATABASE_URL,
	authToken: isFile ? undefined : AUTH_TOKEN
});

export async function getRow(slug: string): Promise<unknown> {
	const res = await db.execute({
		sql: `
    SELECT slug, content, created_at, language
    FROM pastes
    WHERE slug = ?
      AND deleted_at IS NULL
  `,
		args: [slug]
	});

	return res.rows[0];
}
