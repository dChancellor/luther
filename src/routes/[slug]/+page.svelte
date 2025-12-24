<!-- TODO - refactor opportunity / stylesheet and add editable text?-->
<script lang="ts">
	import 'highlight.js/styles/github-dark.css';
	import board from '$lib/assets/bulletin-board.svg';
	import type { PageProps } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.rows);

	async function onDeleteClick(slug: string): Promise<void> {
		rows = rows.filter((row) => row.slug !== slug);
		await fetch(`/api/paste/${slug}`, {
			method: 'DELETE'
		});
		await invalidateAll();
	}
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
		{#each rows as row (row.slug)}
			<div class="file">
				<div class="bar">
					<span>{row.slug} • lang: {row.language} • created at: {row.created_at}</span>
					<button class="delete" onclick={() => onDeleteClick(row.slug)}>delete</button>
				</div>
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
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
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
	button {
		background-color: transparent;
		border: none;
		color: #f5bb34;
		padding: 10px 15px;
		cursor: pointer;
		font-size: 1rem;
		text-decoration: none; /* Often appears as plain text or a link */
		display: inline-block;
	}
</style>
