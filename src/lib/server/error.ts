export function getErrorMessage(err: unknown): string | null {
	if (err instanceof Error) return err.message;
	if (typeof err === 'string') return err;
	if (!err) return null;
	try {
		return JSON.stringify(err);
	} catch {
		return String(err);
	}
}
