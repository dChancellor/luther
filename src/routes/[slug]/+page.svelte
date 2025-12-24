<!-- TODO - refactor opportunity / stylesheet and add editable text?-->
<script lang="ts">
	import 'highlight.js/styles/github-dark.css';
	import board from '$lib/assets/bulletin-board.svg';
	import type { PageProps } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let rows = $state(data.rows);
	let editingSlug = $state<string | null>(null);
	let editContent = $state<string>('');
	let errorMessage = $state<string | null>(null);

	async function onDeleteClick(slug: string): Promise<void> {
		rows = rows.filter((row) => row.slug !== slug);
		await fetch(`/api/paste/${slug}`, {
			method: 'DELETE'
		});
		await invalidateAll();
	}

	async function onEditClick(slug: string): Promise<void> {
		editingSlug = slug;
		errorMessage = null;
		// We need to fetch the raw content, not the highlighted version
		try {
			const response = await fetch(`/raw/${slug}`);
			if (!response.ok) {
				errorMessage = 'Failed to load paste content';
				editingSlug = null;
				return;
			}
			editContent = await response.text();
		} catch {
			errorMessage = 'Failed to load paste content';
			editingSlug = null;
		}
	}

	async function onSaveClick(slug: string): Promise<void> {
		errorMessage = null;
		try {
			const response = await fetch(`/api/paste/${slug}`, {
				method: 'PUT',
				body: editContent
			});

			if (response.ok) {
				editingSlug = null;
				editContent = '';
				await invalidateAll();
			} else {
				const data = await response.json();
				errorMessage = data.error || 'Failed to save changes';
			}
		} catch {
			errorMessage = 'Failed to save changes';
		}
	}

	function onCancelClick(): void {
		editingSlug = null;
		editContent = '';
		errorMessage = null;
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

	{#if errorMessage}
		<div class="error-message">{errorMessage}</div>
	{/if}

	<div>
		{#each rows as row (row.slug)}
			<div class="file">
				<div class="bar">
					<span>{row.slug} • lang: {row.language} • created at: {row.created_at}</span>
					<div>
						<button onclick={() => onEditClick(row.slug)}>edit</button>
						<button class="delete" onclick={() => onDeleteClick(row.slug)}>delete</button>
					</div>
				</div>
				{#if editingSlug === row.slug}
					<div class="edit-container">
						<textarea bind:value={editContent} class="edit-textarea"></textarea>
						<div class="edit-actions">
							<button onclick={() => onSaveClick(row.slug)}>save</button>
							<button onclick={onCancelClick}>cancel</button>
						</div>
					</div>
				{:else}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<pre><code>{@html row.content}</code></pre>
				{/if}
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
	.error-message {
		background-color: #8b2020;
		color: #ffcccc;
		padding: 12px 20px;
		margin: 12px 0;
		border-radius: 4px;
		border-left: 4px solid #d32f2f;
	}
	.edit-container {
		background: #49774c;
		padding: 20px;
	}
	.edit-textarea {
		width: 100%;
		min-height: 300px;
		background: #33573e;
		color: #a3f58d;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 12px;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 14px;
		line-height: 1.4;
		resize: vertical;
	}
	.edit-actions {
		margin-top: 12px;
		display: flex;
		gap: 8px;
	}
</style>
