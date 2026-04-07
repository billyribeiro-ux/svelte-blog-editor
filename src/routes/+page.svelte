<script lang="ts">
	import { redirect } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/admin/posts');
	});
</script>

<svelte:head>
	<title>Blog Editor</title>
</svelte:head>

<div class="loading-page">
	<p>Redirecting to editor...</p>
</div>

<style>
	.loading-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-block-size: 100dvh;
		color: var(--color-text-muted, oklch(0.55 0.02 260));
	}
</style>
