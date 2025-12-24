import { randomUUID } from 'crypto';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';
import { detectLanguage } from '$lib/server/detect-language';
import { getErrorMessage } from '$lib/server/error';

const MAX_BYTES = 200_000;

interface InsertPacket {
	slug: string;
	text: string;
	language: string;
}

export const POST: RequestHandler = async ({ request, url }) => {
	const json = await request.json();

	if (!json || json.texts.length === 0) {
		return new Response(JSON.stringify({ error: 'Must contain at least 1 text' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	const packets: InsertPacket[] = [];

	for (const text of json.texts) {
		if (!text.trim()) {
			return new Response(JSON.stringify({ error: 'Body must be non-empty text.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' }
			});
		}

		if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) {
			return new Response(JSON.stringify({ error: `Paste too large (max ${MAX_BYTES} bytes).` }), {
				status: 413,
				headers: { 'content-type': 'application/json' }
			});
		}

		const language = detectLanguage(text);
		packets.push({ text, slug: '', language });
	}

	const groupId = randomUUID();

	for (let i = 0; i < 5; i++) {
		for (const packet of packets) {
			const slug = generateSlug(6);
			packet.slug = slug;
		}
		try {
			await db.batch([
				{ sql: 'INSERT INTO paste_groups (id) VALUES (?)', args: [groupId] },
				...packets.map((packet) => ({
					sql: 'INSERT INTO pastes (slug, content, language, group_id) VALUES (?, ?, ?, ?)',
					args: [packet.slug, packet.text, packet.language, groupId]
				}))
			]);

			const base = url.origin;
			const urls = packets.map((packet) => `${base}/${packet.slug}`);

			return new Response(
				JSON.stringify({
					urls
				}),
				{ status: 201, headers: { 'content-type': 'application/json' } }
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);
			if (message.toLowerCase().includes('unique')) continue;
			throw err;
		}
	}
	return new Response(JSON.stringify({ error: 'Something went wrong.' }), {
		status: 500,
		headers: { 'content-type': 'application/json' }
	});
};
