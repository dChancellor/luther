import { randomUUID } from 'crypto';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const newGroupId = randomUUID();
	return { newGroupId };
};
