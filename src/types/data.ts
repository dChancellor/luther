import { z } from 'zod';

export const dataRowSchema = z.object({
	slug: z.string(),
	content: z.string(),
	language: z.string(),
	created_at: z.string(),
	group_id: z.string().nullable().optional()
});

export type DataRow = z.infer<typeof dataRowSchema>;

export const insertPacketSchema = z.object({
	slug: z.string(),
	content: z.string(),
	language: z.string(),
	groupId: z.string()
});

export const insertPacketsSchema = z.array(insertPacketSchema);

export type InsertPacket = z.infer<typeof insertPacketSchema>;
