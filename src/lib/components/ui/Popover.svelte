<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		trigger,
		content,
		align = 'start'
	}: {
		open: boolean;
		trigger: Snippet;
		content: Snippet;
		align?: 'start' | 'center' | 'end';
	} = $props();

	let containerEl = $state<HTMLDivElement>();
	let panelEl = $state<HTMLDivElement>();

	function toggle(): void {
		open = !open;
	}

	function handleClickOutside(e: MouseEvent): void {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			open = false;
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
		}
	}

	onMount(() => {
		if (!browser) return;
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (!browser) return;
		document.removeEventListener('mousedown', handleClickOutside);
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="popover" bind:this={containerEl}>
	<button
		class="popover-trigger"
		type="button"
		aria-expanded={open}
		aria-haspopup="true"
		onclick={toggle}
	>
		{@render trigger()}
	</button>

	{#if open}
		<div
			class="popover-panel"
			class:align-start={align === 'start'}
			class:align-center={align === 'center'}
			class:align-end={align === 'end'}
			bind:this={panelEl}
			role="dialog"
		>
			{@render content()}
		</div>
	{/if}
</div>

<style>
	@layer components {
		.popover {
			position: relative;
			display: inline-flex;
		}

		.popover-trigger {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: none;
			border: none;
			padding: 0;
			cursor: pointer;
			color: inherit;
			font: inherit;
		}

		.popover-panel {
			position: absolute;
			inset-block-start: calc(100% + 6px);
			z-index: 900;
			background: var(--color-surface, oklch(0.16 0.01 260));
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 8px;
			padding: 8px;
			box-shadow: 0 8px 24px oklch(0 0 0 / 0.3);
			min-inline-size: 180px;
			animation: popover-fade-in 0.15s ease-out;

			&.align-start {
				inset-inline-start: 0;
			}

			&.align-center {
				inset-inline-start: 50%;
				transform: translateX(-50%);
			}

			&.align-end {
				inset-inline-end: 0;
			}
		}

		@keyframes popover-fade-in {
			from {
				opacity: 0;
				transform: translateY(-4px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}
</style>
