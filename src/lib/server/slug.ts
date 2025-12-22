import { randomBytes } from 'node:crypto';

export function base64Url(buf: Buffer) {
	return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateSlug(bytes = 6) {
	return base64Url(randomBytes(bytes));
}
