import { createClient, type ResultSet, type Row } from '@libsql/client';
import { env } from '$env/dynamic/private';
import type { InsertPacket } from '$types/data';

const DATABASE_URL = env.DATABASE_URL ?? '';
const AUTH_TOKEN = env.AUTH_TOKEN ?? '';

const isFile = DATABASE_URL.startsWith('file:');

export const db = createClient({
	url: DATABASE_URL,
	authToken: isFile ? undefined : AUTH_TOKEN
});

export async function getRow(slug: string): Promise<Row | null> {
	const res = await db.execute({
		sql: `
    SELECT slug, content, created_at, language, group_id
    FROM pastes
    WHERE slug = ?
      AND deleted_at IS NULL
  `,
		args: [slug]
	});

	return res.rows[0];
}

export async function getRows(slug: string): Promise<Row[] | null> {
	const res = await db.execute({
		sql: `
    SELECT *
    FROM pastes
    WHERE group_id = (SELECT group_id FROM pastes WHERE slug = ?)
      AND deleted_at IS NULL
    ORDER BY created_at;
  `,
		args: [slug]
	});

	return res.rows;
}

export async function updateRow(slug: string, content: string, lang: string): Promise<boolean> {
	const res = await db.execute({
		sql: `
    UPDATE pastes
    SET content = ?, language = ?
    WHERE slug = ?
      AND deleted_at IS NULL
  `,
		args: [content, lang, slug]
	});

	return res.rowsAffected > 0 ? true : false;
}

export async function deleteRow(slug: string): Promise<boolean> {
	const res = await db.execute({
		sql: `
    UPDATE pastes
    SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE slug = ?
      AND deleted_at IS NULL
  `,
		args: [slug]
	});

	return (res.rowsAffected ?? 0) > 0;
}

export async function createRow({
	slug,
	content,
	language,
	groupId
}: InsertPacket): Promise<ResultSet | null> {
	const row = await db.execute({
		sql: `
      INSERT INTO pastes (slug, content, language, group_id)
      VALUES (?, ?, ?, ?)
    `,
		args: [slug, content, language, groupId]
	});
	return row;
}

export async function createGroup(
	packets: InsertPacket[],
	groupId: string
): Promise<ResultSet[] | null> {
	const rows = await db.batch([
		{ sql: 'INSERT OR IGNORE INTO paste_groups (id) VALUES (?)', args: [groupId] },
		...packets.map((packet) => ({
			sql: 'INSERT INTO pastes (slug, content, language, group_id) VALUES (?, ?, ?, ?)',
			args: [packet.slug, packet.content, packet.language, groupId]
		}))
	]);
	return rows;
}

export async function duplicateGroup(
	slug: string,
	newGroupId: string,
	slugMap: Record<string, string>
): Promise<boolean> {
	// Get all rows in the group
	const rows = await getRows(slug);
	if (!rows || rows.length === 0) return false;

	// Create the new group and insert all duplicated rows
	const insertStatements = [
		{ sql: 'INSERT OR IGNORE INTO paste_groups (id) VALUES (?)', args: [newGroupId] },
		...rows.map((row) => ({
			sql: 'INSERT INTO pastes (slug, content, language, group_id) VALUES (?, ?, ?, ?)',
			args: [slugMap[String(row.slug)], row.content, row.language, newGroupId]
		}))
	];

	const result = await db.batch(insertStatements);
	return result !== null && result.length > 0;
}
