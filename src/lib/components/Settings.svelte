<script>
	let {
		showScanLines = $bindable(),
		customColor = $bindable(),
		apiKey = $bindable(),
		saveApiKey
	} = $props();
</script>

<div class="settings">
	<label>
		scanlines:
		<input type="checkbox" bind:checked={showScanLines} />
	</label>
	<label>
		color:
		<input type="color" bind:value={customColor} />
	</label>
	<label>
		API key:
		<input type="text" bind:value={apiKey} onblur={saveApiKey} />
	</label>
</div>

<style>
	.settings {
		margin-right: 2rem;
		display: flex;
		flex-flow: column;
	}
</style>
