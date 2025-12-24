<!-- TODO - refactor opportunity / stylesheet and add editable text?-->
<script lang="ts">
	import 'highlight.js/styles/github-dark.css';
	import board from '$lib/assets/bulletin-board.svg';
	import type { PageProps } from './$types';
	import { invalidateAll } from '$app/navigation';

	let { data }: PageProps = $props();

	let rows = $derived(data.rows);
	let editingSlug = $state<string | null>(null);
	let editContent = $state<string>('');
	let errorMessage = $state<string | null>(null);
	let isCreatingNew = $state<boolean>(false);
	let newContent = $state<string>('');

	async function onDeleteClick(slug: string): Promise<void> {
		rows = rows.filter((row) => row.slug !== slug);
		await fetch(`/api/paste/${slug}`, {
			method: 'DELETE'
		});
		await invalidateAll();
	}

	async function onEditClick(slug: string, raw: string): Promise<void> {
		editingSlug = slug;
		errorMessage = null;
		editContent = raw;
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

	function onNewClick(): void {
		isCreatingNew = true;
		errorMessage = null;
		newContent = '';
	}

	async function onSaveNewClick(): Promise<void> {
		errorMessage = null;
		try {
			if (rows.length === 0) {
				errorMessage = 'No pastes found on this page';
				return;
			}

			const groupId = rows[0]?.group_id;
			if (!groupId) {
				errorMessage = 'Unable to determine group for this paste';
				return;
			}

			const response = await fetch('/api/paste/group', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: newContent,
					groupId
				})
			});

			if (response.ok) {
				isCreatingNew = false;
				newContent = '';
				await invalidateAll();
			} else {
				const data = await response.json();
				errorMessage = data.error || 'Failed to create new paste';
			}
		} catch {
			errorMessage = 'Failed to create new paste';
		}
	}

	function onCancelNewClick(): void {
		isCreatingNew = false;
		newContent = '';
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
						{#if editingSlug === row.slug}
							<button class="tertiary" onclick={() => onSaveClick(row.slug)}>save</button>
							<button class="tertiary" onclick={() => onCancelClick()}>cancel</button>
						{:else}
							<button class="tertiary" onclick={() => onEditClick(row.slug, row.raw)}>edit</button>
						{/if}
						<button class="tertiary" onclick={() => onDeleteClick(row.slug)}>delete</button>
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

		{#if isCreatingNew}
			<div class="file">
				<div class="bar">
					<span>New paste</span>
					<div>
						<button class="tertiary" onclick={() => onSaveNewClick()}>save</button>
						<button class="tertiary" onclick={() => onCancelNewClick()}>cancel</button>
					</div>
				</div>
				<div class="edit-container">
					<textarea bind:value={newContent} class="edit-textarea"></textarea>
					<div class="edit-actions">
						<button onclick={() => onSaveNewClick()}>save</button>
						<button onclick={onCancelNewClick}>cancel</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="new-button-container">
				<button class="new-button" onclick={onNewClick}>+ new</button>
			</div>
		{/if}
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
	.tertiary {
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
	.new-button-container {
		margin: 2rem 0;
		display: flex;
		justify-content: center;
	}
	.new-button {
		background-color: #49774c;
		color: #a3f58d;
		border: 1px solid #a3f58d;
		padding: 12px 24px;
		cursor: pointer;
		font-size: 1rem;
		border-radius: 4px;
		transition: background-color 0.2s;
	}
	.new-button:hover {
		background-color: #5a8a5d;
	}
</style>
