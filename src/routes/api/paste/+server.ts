import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';
import { detectLanguage } from '$lib/server/detect-language';
import { getErrorMessage } from '$lib/server/error';

const MAX_BYTES = 200_000;

export const POST: RequestHandler = async ({ request, url }) => {
	const text = await request.text();

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

	for (let i = 0; i < 5; i++) {
		const slug = generateSlug(6);
		try {
			await db.execute({
				sql: 'INSERT INTO pastes (slug, content, language) VALUES (?, ?, ?)',
				args: [slug, text, language]
			});

			const base = url.origin;
			return new Response(
				JSON.stringify({
					slug,
					url: `${base}/${slug}`,
					language
				}),
				{ status: 201, headers: { 'content-type': 'application/json' } }
			);
		} catch (err: unknown) {
			const message = getErrorMessage(err);

			if (message.toLowerCase().includes('unique')) continue;
			throw err;
		}
	}

	return new Response(JSON.stringify({ error: 'Failed to generate unique slug.' }), {
		status: 500,
		headers: { 'content-type': 'application/json' }
	});
};
