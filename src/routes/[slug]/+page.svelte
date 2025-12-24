<!-- TODO - refactor opportunity / stylesheet and add editable text?-->
<script lang="ts">
	import 'highlight.js/styles/github-dark.css';
	import type { DataRow } from '$types/data';
	import board from '$lib/assets/bulletin-board.svg';

	export let data: { rows: DataRow[]; primarySlug: string };
</script>

<svelte:head>
	<title>Luther/{data.primarySlug}</title>
	<link rel="icon" href={board} />
</svelte:head>

<div class="body">
	<header class="hdr">
		<div>{data.primarySlug}</div>
	</header>

	<div>
		{#each data.rows as row (row.slug)}
			<div class="file">
				<span>{row.slug} • lang: {row.language} • created at: {row.created_at}</span>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<pre><code>{@html row.content}</code></pre>
			</div>
		{/each}
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		background: #33573e;
		color: #a3f58d;
		padding-inline: 2rem;
	}
	pre {
		background: #49774c;
	}
	.file {
		margin-bottom: 2rem;
	}
	.hdr {
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
	}
	pre {
		margin: 0;
		padding: 20px;
		overflow: auto;
		line-height: 1.4;
	}
	code {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 14px;
		white-space: pre;
	}
</style>
