<!-- TODO - refactor opportunity / stylesheet and add editable text?-->
<script lang="ts">
	/* eslint-disable svelte/no-at-html-tags */
	import 'highlight.js/styles/github-dark.css';
	import { resolve } from '$app/paths';
	import type { DataRow } from '$types/data';
	import board from '$lib/assets/bulletin-board.svg';

	export let data: DataRow;
</script>

<svelte:head>
	<title>Luther/{data.slug}</title>
	<link rel="icon" href={board} />
</svelte:head>

<header class="hdr">
	<div>
		<div class="meta">
			Created {data.created_at} • lang: {data.language} •
			<a href={resolve('/raw/[slug]', { slug: data.slug })}>raw</a>
		</div>
		<div></div>
	</div>
</header>

<pre><code>{@html data.content}</code></pre>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		background: #0b0f17;
		color: #e7eefc;
	}
	a {
		color: #8ab4ff;
		text-decoration: none;
	}
	.hdr {
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
	}
	.meta {
		opacity: 0.8;
		font-size: 13px;
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
