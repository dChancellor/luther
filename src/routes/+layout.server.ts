import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, params }) => {
	const showScanLines =
		cookies.get('showScanLines') === 'true' || cookies.get('showScanLines') === undefined;

	const customColor = cookies.get('customColor') ?? '#a3f58d';

	const apiKey = cookies.get('apiKey');

	const isApiKeyValid = env.API_KEY === apiKey;

	return {
		showScanLines,
		customColor,
		apiKey,
		isApiKeyValid,
		slug: params.slug
	};
};
