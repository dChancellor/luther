<script lang="ts">
	const { row, editing, onEditClick, onCancelClick, onDeleteClick, onSaveClick } = $props();

	const readableDate = new Date(row.created_at).toDateString();
</script>

<div class="bar">
	<div class="light-glow info">
		<span id="slug">{row.slug}</span><span>•</span><span>lang: {row.language}</span><span>•</span
		><span>created on {readableDate}</span>
	</div>
	<div>
		{#if editing}
			<button class="tertiary" onclick={() => onSaveClick(row.slug)}>save</button>
			<button class="tertiary" onclick={() => onCancelClick()}>cancel</button>
		{:else}
			<button class="tertiary" onclick={() => onEditClick(row.slug, row.raw)}>edit</button>
		{/if}
		<button class="tertiary" onclick={() => onDeleteClick(row.slug)}>delete</button>
	</div>
</div>

<style>
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
	.info span {
		margin-inline: 0.25rem;
	}
</style>
