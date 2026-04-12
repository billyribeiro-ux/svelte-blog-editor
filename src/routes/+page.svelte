<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/admin/posts', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Blog Editor</title>
</svelte:head>

<div class="loading-page">
	<div class="loading-spinner"></div>
	<p>Loading editor...</p>
</div>

<style>
	.loading-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		min-block-size: 100dvh;
		color: var(--color-text-muted, oklch(0.55 0.02 260));
	}

	.loading-spinner {
		inline-size: 32px;
		block-size: 32px;
		border: 3px solid var(--color-border, oklch(0.25 0.02 260));
		border-block-start-color: var(--color-accent, oklch(0.7 0.15 250));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
