import hljs from 'highlight.js';

export function detectLanguage(code: string): string {
	const result = hljs.highlightAuto(code, [
		'html',
		'typescript',
		'javascript',
		'zig',
		'c',
		'autohotkey',
		'bash',
		'c#',
		'c++',
		'css',
		'curl',
		'docker',
		'diff',
		'dns',
		'godot',
		'go',
		'gradle',
		'graphql',
		'http',
		'excel',
		'elm',
		'elixir',
		'hlsl',
		'haskell',
		'iptables',
		'json',
		'java',
		'kotlin',
		'lang',
		'lua',
		'markdown',
		'nginx',
		'ocaml',
		'php',
		'text',
		'postgres',
		'powershell',
		'python',
		'r',
		'ruby',
		'rust',
		'sql',
		'svelte',
		'yaml'
	]);

	if (!result.language) return 'text';

	if (result.relevance < 10) return 'text';

	return result.language;
}
