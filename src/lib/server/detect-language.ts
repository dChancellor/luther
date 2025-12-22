import hljs from 'highlight.js';

export function detectLanguage(code: string): string {
	const result = hljs.highlightAuto(code);

	if (!result.language) return 'text';

	if (result.relevance < 10) return 'text';

	return result.language;
}
