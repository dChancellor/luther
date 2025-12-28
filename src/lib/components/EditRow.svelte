<script lang="ts">
	let { content = $bindable() } = $props();
</script>

<div id="editing">
	<textarea bind:value={content}></textarea>
</div>

<style>
	#editing {
		background: #49774c;
		padding: 0.5rem;
		margin-inline: 2rem;
	}
	textarea {
		width: 100%;
		min-height: 300px;
		background: var(--bg-color);
		color: #a3f58d;
		border: 1px solid rgba(255, 255, 255, 0.2);
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
			monospace;
		font-size: 14px;
		line-height: 1.4;
		resize: vertical;
	}
</style>
