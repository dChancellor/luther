import type { RequestHandler } from './$types';
import { deleteRow, updateRow } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ params, request }) => {
	const { slug } = params;
	const content = await request.text();

	if (!content.trim()) {
		return new Response(JSON.stringify({ error: 'Content must be non-empty text.' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	const updated = await updateRow(slug, content);

	if (!updated) {
		error(404, 'Paste not found');
	}

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
};

export const DELETE: RequestHandler = async ({ params }) => {
	const { slug } = params;

	const deleted = await deleteRow(slug);

	if (!deleted) {
		error(404, 'Paste not found');
	}

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
};
