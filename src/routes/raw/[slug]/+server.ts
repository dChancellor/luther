import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getRow } from '$lib/server/db';
import { type DataRow, dataRowSchema } from '$types/data';

export const GET: RequestHandler = async ({ params }) => {
	const rawRow = await getRow(params.slug);
	if (!rawRow) throw error(404, 'Not found');

	const data: DataRow = dataRowSchema.parse(rawRow);

	return new Response(String(data.content), {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
};
