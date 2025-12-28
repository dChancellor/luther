<script lang="ts">
	import 'highlight.js/styles/github-dark.css';
	import type { PageProps } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import EditRow from '$lib/components/EditRow.svelte';
	import ViewRow from '$lib/components/ViewRow.svelte';
	import RowTopBar from '$lib/components/RowTopBar.svelte';
	import { resolve } from '$app/paths';
	import NewRow from '$lib/components/NewRow.svelte';

	let { data }: PageProps = $props();

	let rows = $derived(data.rows);
	let editingSlug = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	async function onEditClick(slug: string): Promise<void> {
		editingSlug = slug;
		errorMessage = null;
	}

	async function onDeleteClick(slug: string): Promise<void> {
		const res = await fetch(`/api/${slug}`, {
			method: 'DELETE'
		});
		if (!res.ok) return;
		rows = rows.filter((row) => row.slug !== slug);
		if (rows.length > 0) {
			goto(resolve(`/${rows[0].slug}`));
		} else {
			goto(resolve('/'));
		}
	}

	async function onSaveClick(slug: string): Promise<void> {
		const row = rows.filter((row) => row.slug === slug)[0];
		errorMessage = null;
		if (!row) errorMessage = 'Failed to save changes - slug not found';
		try {
			const response = await fetch(`/api/${slug}`, {
				method: 'PUT',
				body: row.raw
			});

			if (response.ok) {
				editingSlug = null;
				await invalidateAll();
			} else {
				const data = await response.json();
				errorMessage = data.error || 'Failed to save changes - database response not ok';
			}
		} catch {
			errorMessage = 'Failed to save changes';
		}
	}

	function onCancelClick(): void {
		editingSlug = null;
		errorMessage = null;
	}

	function onCopyClick(slug: string): void {
		const { raw } = rows.filter((row) => row.slug === slug)[0];
		navigator.clipboard.writeText(raw);
	}

	async function onDuplicateClick(slug: string): Promise<void> {
		errorMessage = null;
		try {
			const response = await fetch(`/api/${slug}/duplicate`, {
				method: 'POST'
			});

			if (response.ok) {
				const data = await response.json();
				const newSlug = data.slug;
				// Navigate to the new slug
				goto(resolve(`/${newSlug}`));
			} else {
				const data = await response.json();
				errorMessage = data.error || 'Failed to duplicate bin';
			}
		} catch {
			errorMessage = 'Failed to duplicate bin';
		}
	}
</script>

<svelte:head>
	<title>Luther/{data.primarySlug}</title>
</svelte:head>

{#if errorMessage}
	<div class="error-message">
		<span> {errorMessage}</span><button
			type="button"
			class="close"
			onclick={() => (errorMessage = null)}>X</button
		>
	</div>
{/if}
{#each rows as row (row.slug)}
	{#if (Boolean(editingSlug) && editingSlug === row.slug) || !editingSlug}
		<RowTopBar
			editing={Boolean(editingSlug)}
			{row}
			{onDeleteClick}
			{onEditClick}
			{onCancelClick}
			{onSaveClick}
			{onDuplicateClick}
		/>
	{/if}
	{#if editingSlug === row.slug}
		<EditRow bind:content={row.raw} />
	{:else}
		<ViewRow content={row.content} {onCopyClick} slug={row.slug} />
	{/if}
{/each}

{#if data.isApiKeyValid && !editingSlug}
	<NewRow groupId={rows[0].group_id} apiKey={data.apiKey} />
{/if}
<footer class="light-glow">
	<span>`ITEMS: {rows.length}`</span><span>|</span><span>Group: "{rows[0].group_id}"</span>
</footer>

<style>
	.error-message {
		position: fixed;
		top: 2rem;
		left: 0;
		right: 0;
		z-index: 1000;
		background-color: #8b2020;
		color: #ffcccc;
		padding: 12px 20px;
		border-radius: 4px;
		border-left: 4px solid #d32f2f;
		display: flex;
		justify-content: space-between;
	}
	.close {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 18px;
	}
	.close:hover {
		filter: brightness(150%);
	}

	footer {
		display: flex;
		width: 100%;
		border-top: 2px solid var(--green-color);
		margin-top: 1rem;
		justify-content: end;
	}
	footer * {
		margin: 1rem;
	}
</style>
