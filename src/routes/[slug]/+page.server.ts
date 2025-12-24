import hljs from 'highlight.js';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getRows } from '$lib/server/db';
import { dataRowSchema, type DataRow } from '$types/data';

export const ssr = false;

export type DisplayData = DataRow & { raw: string; normalizedDate: string };

export const load: PageServerLoad = async ({
	params
}): Promise<{ rows: DisplayData[]; primarySlug: string }> => {
	const rawRows = await getRows(params.slug);

	if (!rawRows) throw error(404, 'Not found');

	const rows: DisplayData[] = [];

	for (const rawRow of rawRows) {
		const row = dataRowSchema.parse(rawRow);

		const manipulatedRow: DisplayData = { ...row, raw: '', normalizedDate: '' };

		const highlighted =
			String(row.language) !== 'text'
				? hljs.highlight(row.content, { language: row.language }).value
				: hljs.highlight(row.content, { language: 'plaintext' }).value;

		const date = new Date(row.created_at);

		manipulatedRow.normalizedDate = date.toLocaleDateString();
		manipulatedRow.content = highlighted;
		manipulatedRow.raw = row.content;
		rows.push(manipulatedRow);
	}
	if (!rows.find((row) => row.slug === params.slug)) throw error(404, 'Not found');

	return { rows, primarySlug: params.slug };
};
