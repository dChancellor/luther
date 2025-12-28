import type { RequestHandler } from './$types';
import { duplicateRow } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { generateSlug } from '$lib/server/slug';

export const POST: RequestHandler = async ({ params, url }) => {
	const { slug } = params;

	// Generate a new slug for the duplicate
	let newSlug = '';
	let duplicated = false;

	// Try up to 5 times to generate a unique slug
	for (let i = 0; i < 5; i++) {
		newSlug = generateSlug(6);
		try {
			duplicated = await duplicateRow(slug, newSlug);
			if (duplicated) break;
		} catch (err: unknown) {
			// If it's a unique constraint error, try again with a new slug
			const message = String(err);
			if (message.toLowerCase().includes('unique')) continue;
			throw err;
		}
	}

	if (!duplicated) {
		error(500, 'Failed to duplicate paste');
	}

	const base = url.origin;
	return new Response(
		JSON.stringify({
			slug: newSlug,
			url: `${base}/${newSlug}`
		}),
		{
			status: 201,
			headers: { 'content-type': 'application/json' }
		}
	);
};
