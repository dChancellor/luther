import { describe, it, expect } from 'vitest';
import { detectLanguage } from './detect-language';
import { readExampleFile } from '../../test/utils';

describe('detectLanguage', () => {
	it('returns detected language(typescript) when relevance is high enough', async () => {
		const example = await readExampleFile('ts.txt');
		const result = detectLanguage(example);
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
