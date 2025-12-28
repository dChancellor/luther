<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import EditRow from './EditRow.svelte';
	import { API_KEY_HEADER } from '$lib/constants/constants';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { groupId, errorMessage = $bindable(), apiKey } = $props();
	let newContent = $state<string | null>(null);

	async function onSaveNewClick(): Promise<void> {
		errorMessage = null;
		try {
			if (!groupId) {
				errorMessage = 'Unable to determine group for this paste';
				return;
			}

			const response = await fetch('/api/paste', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					[API_KEY_HEADER]: apiKey
				},
				body: JSON.stringify({
					content: newContent,
					groupId
				})
			});

			if (response.ok) {
				newContent = null;
				const json = await response.json();
				if (page.url.pathname === '/') {
					console.log(json.slug);
					await goto(resolve(`/${json.slug}`));
				}
				await invalidateAll();
			} else {
				const data = await response.json();
				errorMessage = data.error || 'Failed to create new paste';
			}
		} catch {
			errorMessage = 'Failed to create new paste';
		}
	}

	function addNew(): void {
		newContent = '';
		errorMessage = null;
	}
	function onCancelNewClick(): void {
		newContent = null;
		errorMessage = null;
	}
</script>

{#if newContent === null}
	<button class="new" onclick={addNew}><span class="light-glow"> Add New</span></button>
{:else}
	<div class="bar">
		<span>New paste</span>
		<div>
			<button class="tertiary" onclick={() => onSaveNewClick()}>save</button>
			<button class="tertiary" onclick={() => onCancelNewClick()}>cancel</button>
		</div>
	</div>
	<EditRow bind:content={newContent} />
{/if}

<style>
	.new {
		background: hsl(from var(--green-color) h calc(s + 20) calc(l - 60));
		border: var(--green-color) 2px solid;
		color: inherit;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 1.25rem;
		padding: 0.25rem 1rem;
		font-variant: small-caps;
		max-width: 8rem;
		align-self: center;
	}
	.new:hover {
		filter: brightness(120%);
	}
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-inline: 1rem;
	}
	.tertiary {
		background-color: transparent;
		border: none;
		color: hsl(from var(--green-color) calc(h + 290) s l);
		padding: 10px 15px;
		cursor: pointer;
		font-size: 1rem;
		text-decoration: none; /* Often appears as plain text or a link */
		display: inline-block;
	}
	.tertiary:hover {
		filter: brightness(150%);
	}
</style>
