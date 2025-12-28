import type { RequestHandler } from './$types';
import { duplicateGroup, getRows } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { generateSlug } from '$lib/server/slug';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ params, url }) => {
	const { slug } = params;

	// Get all rows in the group to know how many slugs to generate
	const rows = await getRows(slug);
	if (!rows || rows.length === 0) {
		error(404, 'Paste not found');
	}

	// Generate a new group ID
	const newGroupId = randomUUID();

	// Try up to 5 times to generate unique slugs for all rows
	for (let attempt = 0; attempt < 5; attempt++) {
		// Create a mapping of old slugs to new slugs
		const slugMap: Record<string, string> = {};
		for (const row of rows) {
			slugMap[String(row.slug)] = generateSlug(6);
		}

		try {
			const duplicated = await duplicateGroup(slug, newGroupId, slugMap);
			if (duplicated) {
				// Return the first new slug to navigate to
				const firstNewSlug = slugMap[String(rows[0].slug)];
				const base = url.origin;
				return new Response(
					JSON.stringify({
						slug: firstNewSlug,
						url: `${base}/${firstNewSlug}`
					}),
					{
						status: 201,
						headers: { 'content-type': 'application/json' }
					}
				);
			}
		} catch (err: unknown) {
			// If it's a unique constraint error, try again with new slugs
			const message = String(err);
			if (message.toLowerCase().includes('unique')) continue;
			throw err;
		}
	}

	error(500, 'Failed to duplicate bin');
};
