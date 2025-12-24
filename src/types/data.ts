import { z } from 'zod';

export const dataRowSchema = z.object({
	slug: z.string(),
	content: z.string(),
	language: z.string(),
	created_at: z.string(),
	group_id: z.string().nullable().optional()
});

export type DataRow = z.infer<typeof dataRowSchema>;
