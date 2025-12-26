import { readFile } from 'fs/promises';
import { resolve } from 'path';

export async function readExampleFile(fileName: string) {
	const path = resolve(process.cwd(), `dev/examples/example_inputs/${fileName}`);
	return await readFile(path, 'utf8');
}
