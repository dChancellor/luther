import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectLanguage } from './detect-language';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('detectLanguage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns detected language(typescript) when relevance is high enough', async () => {
		const tsExamplePath = resolve(process.cwd(), 'examples/example_inputs/ts.txt');
		const tsExampleCode = await readFile(tsExamplePath, 'utf8');

		const result = detectLanguage(tsExampleCode);
		expect(result).toBe('typescript');
	});

	it('returns detected language(javascript) when relevance is high enough', async () => {
		const jsExamplePath = resolve(process.cwd(), 'examples/example_inputs/ts.txt');
		const jsExampleCode = await readFile(jsExamplePath, 'utf8');

		const result = detectLanguage(jsExampleCode);
		expect(result).toBe('typescript');
	});
	it('returns "text" when no language is detected', () => {
		const result = detectLanguage('some random text');

		expect(result).toBe('text');
	});

	it('returns "text" when relevance is below threshold', () => {
		const result = detectLanguage('maybe code?');

		expect(result).toBe('text');
	});

	it('returns "text" when both language is missing and relevance is low', () => {
		const result = detectLanguage('???');

		expect(result).toBe('text');
	});
});
