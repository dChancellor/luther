import hljs from 'highlight.js';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getRow } from '$lib/server/db';
import { dataRowSchema, type DataRow } from '$types/data';

export const ssr = false;

export const load: PageServerLoad = async ({ params }): Promise<DataRow> => {
	const rawRow = await getRow(params.slug);
	if (!rawRow) throw error(404, 'Not found');

	const data: DataRow = dataRowSchema.parse(rawRow);

	const highlighted =
		String(data.language) !== 'text'
			? hljs.highlight(data.content, { language: data.language }).value
			: hljs.highlight(data.content, { language: 'plaintext' }).value;

	return {
		slug: params.slug,
		content: String(highlighted),
		created_at: String(data.created_at),
		language: String(data.language)
	};
};
