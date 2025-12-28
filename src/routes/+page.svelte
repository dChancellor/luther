<script lang="ts">
	import NewRow from '$lib/components/NewRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1>Hello.</h1>
<h2>Either enter an API key to create new pastes, or head to an existing slug</h2>
{#if data.isApiKeyValid}
	<NewRow groupId={data.newGroupId} apiKey={data.apiKey} />
{/if}

<style>
	h1,
	h2 {
		margin: 0;
		align-self: center;
	}
	h2 {
		margin-bottom: 2rem;
	}
</style>
