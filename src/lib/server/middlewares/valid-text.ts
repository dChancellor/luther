export const MAX_BYTES = 200_000;

type ValidTextResponse =
	| {
			valid: false;
			response: Response;
	  }
	| { valid: true };

export function isValidText(content: string): ValidTextResponse {
	if (!content.trim()) {
		return {
			valid: false,
			response: new Response(JSON.stringify({ error: 'Content must be non-empty text.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' }
			})
		};
	}

	if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) {
		return {
			valid: false,
			response: new Response(
				JSON.stringify({ error: `Paste too large (max ${MAX_BYTES} bytes).` }),
				{
					status: 413,
					headers: { 'content-type': 'application/json' }
				}
			)
		};
	}

	return { valid: true };
}
