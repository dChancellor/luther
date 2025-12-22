import { z } from 'zod';

export const dataRowSchema = z.object({
	slug: z.string(),
	content: z.string(),
	language: z.string(),
	created_at: z.string()
});

export type DataRow = z.infer<typeof dataRowSchema>;
