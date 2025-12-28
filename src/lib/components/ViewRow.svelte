<script lang="ts">
	import Copy from '$lib/assets/copy.svelte';

	let { content, onCopyClick, slug } = $props();
</script>

<div style="position:relative;">
	<button class="copy" onclick={() => onCopyClick(slug)}><Copy /></button>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<pre><code>{@html content}</code></pre>
</div>

<style>
	pre {
		background: #1e3720;
		margin-inline: 1.5rem;
		padding: 1rem;
		line-height: 1.4;
		overflow: auto;
		border-radius: 8px;
	}
	code {
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 1.25rem;
	}
	.copy {
		position: absolute;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--green-color);
		top: 2rem;
		right: 2rem;
	}
	.copy:hover {
		filter: brightness(140%);
	}
</style>
