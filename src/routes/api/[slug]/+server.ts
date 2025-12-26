import type { RequestHandler } from './$types';
import { deleteRow, updateRow } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { isValidText } from '$lib/server/middlewares/valid-text';

export const PUT: RequestHandler = async ({ params, request }) => {
	const content = await request.text();

	const res = isValidText(content);
	if (!res.valid) return res.response;

	const updated = await updateRow(params.slug, content);

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
