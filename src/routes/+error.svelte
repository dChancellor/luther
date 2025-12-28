<script>
	import { page } from '$app/state';
</script>

<h1>
	<span class="status">{page.status}</span> <span class="divider">|</span>
	<span class="message">{page.error?.message}</span>
</h1>

<style>
	h1 {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		align-self: center;
		line-height: 85dvh;
	}

	.status {
		font-weight: 400;
		font-size: 5rem;
	}

	.divider {
		font-size: 4rem;
	}
	.message {
		font-size: 2rem;
	}
</style>
