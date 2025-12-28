<script lang="ts">
	import { resolve } from '$app/paths';
	import board from '$lib/assets/bulletin-board.svg';
	import NewNote from '$lib/assets/note-new.svelte';
	import DuplicateNote from '$lib/assets/note-duplicate.svelte';
	import SettingsIcon from '$lib/assets/settings.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import { invalidateAll } from '$app/navigation';

	let { children, data } = $props();

	let openSettings = $state(false);

	let showScanLines = $state(data.showScanLines);
	let customColor = $state(data.customColor);
	let apiKey = $state(data.apiKey);

	$effect(() => {
		document.body.style.setProperty('--green-color', customColor);
		document.cookie = `customColor=${encodeURIComponent(customColor)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
	});

	$effect(() => {
		document.cookie = `showScanLines=${showScanLines ? 'true' : 'false'}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
	});

	function saveApiKey() {
		document.cookie = `apiKey=${apiKey}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
		invalidateAll();
	}
</script>

<svelte:head>
	<link rel="icon" href={board} />
</svelte:head>

{#if showScanLines}
	<div class="scanlines"><div class="color"></div></div>
{/if}
<div class="content">
	<header>
		{#if openSettings}
			<Settings bind:customColor bind:showScanLines bind:apiKey {saveApiKey} />
		{/if}
		<div>
			<span class="glow">LUTHER</span>
			<div class="buttons">
				<a class="action-button" title="New" href={resolve('/')} aria-label="Make a brand new bin"
					><NewNote /></a
				>
				<button
					class="action-button"
					title="Duplicate Bin"
					disabled={!data.isApiKeyValid}
					onclick={() => {}}
					aria-label="Duplicate notes in a brand new bin"><DuplicateNote /></button
				>
				<button
					class="action-button"
					title="Settings"
					aria-label="Open settings"
					onclick={() => (openSettings = !openSettings)}><SettingsIcon /></button
				>
			</div>
		</div>
	</header>

	{@render children()}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Quantico:ital,wght@0,400;0,700;1,400;1,700&display=swap');

	:global(body) {
		--green-color: #a3f58d;
		--bg-color: #040705;
		font-family: system-ui, sans-serif;
		background: var(--bg-color);
		color: var(--green-color);
		min-height: 95vh;
		min-height: 95dvh;
		font-family: 'Quantico', sans-serif;
		position: relative;
		margin: 0;
		padding: 2rem;
		font-size: 1.25rem;
	}
	:global(.glow) {
		color: var(--green-color);
		text-shadow:
			0 0 2px var(--green-color),
			0 0 5px var(--green-color);
	}
	:global(.light-glow) {
		color: var(--green-color);
		text-shadow: 0 0 2px var(--green-color);
	}
	.content {
		border: var(--green-color) 2px solid;
		border-radius: 15px;
		display: flex;
		flex-flow: column;
		min-height: 95dvh;
	}
	header {
		border-bottom: 2px solid var(--green-color);
		padding-inline: 2rem;
		padding-block: 1rem;
		font-size: 1.5rem;
		font-weight: 700;
		display: flex;
		justify-content: flex-end;
	}
	.buttons {
		display: flex;
		gap: 4px;
		align-items: baseline;
	}
	button {
		background-color: transparent;
		border: none;
		cursor: pointer;
		width: 1.5rem;
		height: 1.5rem;
		color: var(--green-color);
		padding: 0;
	}
	button:hover {
		filter: brightness(200%);
	}
	button:disabled {
		filter: brightness(40%);
		cursor: not-allowed;
	}
	a {
		width: 1.5rem;
		height: 1.5rem;
		display: block;
		color: var(--green-color);
	}
	a:hover {
		filter: brightness(200%);
	}
	.scanlines {
		position: fixed;
		inset: 0;
		pointer-events: none;
		height: 100%;
		z-index: 9999;
	}
	.scanlines:after {
		display: block;
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		left: 0;
		bottom: 0;
		z-index: 9999;
		background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.3) 51%);
		background-size: 100% 4px;
	}
	.color {
		min-width: 100vw;
		min-height: 100vh;
		height: 100%;
		background-size: cover;
		background-color: hsla(from var(--green-color) h 50% 50% / 0.1);
		box-shadow: 0 0 500px rgba(0, 0, 0, 0.9) inset;
	}
</style>
