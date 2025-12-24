import type { RequestHandler } from './$types';
import { deleteRow } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ params }) => {
	const { slug } = params;

	if (!slug) {
		return new Response(JSON.stringify({ error: 'Slug is required' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	const deleted = await deleteRow(slug);

	if (!deleted) {
		error(404, 'Paste not found');
	}

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
};
