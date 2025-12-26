import type { RequestHandler } from './$types';
import { createGroup } from '$lib/server/db';
import { generateSlug } from '$lib/server/slug';
import { detectLanguage } from '$lib/server/detect-language';
import { getErrorMessage } from '$lib/server/error';
import { randomUUID } from 'crypto';
import { isValidText } from '$lib/server/middlewares/valid-text';
import { insertPacketsSchema, type InsertPacket } from '$types/data';

type RequireOnly<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export const POST: RequestHandler = async ({ request, url }) => {
	const contentType = request.headers.get('content-type');

	const inputPackets: RequireOnly<InsertPacket, 'content'>[] = [];

	if (contentType?.includes('text/')) {
		const content = await request.text();
		inputPackets.push({ content });
	} else if (contentType?.includes('application/json')) {
		const json = await request.json();
		if (Array.isArray(json.texts)) {
			for (const content of json.texts) {
				inputPackets.push({ content });
			}
		} else {
			inputPackets.push(json);
		}
	}

	const groupId = inputPackets.find((packet) => packet.groupId)?.groupId || randomUUID();

	for (const packet of inputPackets) {
		const isValid = isValidText(packet.content);
		if (!isValid.valid) return isValid.response;

		packet.language = detectLanguage(packet.content);
		packet.groupId = groupId;
		packet.slug = '';
	}

	const validatedPackets = insertPacketsSchema.parse(inputPackets);

	for (let i = 0; i < 5; i++) {
		for (const packet of validatedPackets) {
			packet.slug = generateSlug(6);
		}
		try {
			await createGroup(validatedPackets, groupId);

			const base = url.origin;
			return new Response(
				JSON.stringify({
					slug: validatedPackets[0].slug,
					url: `${base}/${validatedPackets[0].slug}`
				}),
				{ status: 201, headers: { 'content-type': 'application/json' } }
			);
		} catch (err: unknown) {
			console.log(err);
			const message = getErrorMessage(err);

			if (message?.toLowerCase().includes('unique')) continue;
			throw err;
		}
	}

	return new Response(JSON.stringify({ error: 'Something went wrong when generating slugs' }), {
		status: 500,
		headers: { 'content-type': 'application/json' }
	});
};
