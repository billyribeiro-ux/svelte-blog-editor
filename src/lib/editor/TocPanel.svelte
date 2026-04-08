<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { TocItem } from './types.js';

	let {
		items = [],
		open = $bindable(false),
		scrollContainer
	}: {
		items: TocItem[];
		open: boolean;
		scrollContainer?: HTMLElement | null;
	} = $props();

	/* ─── Reading Progress ──────────────────────────────────────── */

	let readingProgress = $state(0);

	function updateProgress(): void {
		const el = scrollContainer;
		if (!el) return;
		const { scrollTop, scrollHeight, clientHeight } = el;
		const max = scrollHeight - clientHeight;
		readingProgress = max > 0 ? Math.round((scrollTop / max) * 100) : 0;
	}

	$effect(() => {
		const el = scrollContainer;
		if (!el || !browser) return;
		el.addEventListener('scroll', updateProgress, { passive: true });
		updateProgress();
		return () => el.removeEventListener('scroll', updateProgress);
	});

	/* ─── Active heading via IntersectionObserver ───────────────── */

	let activeId = $state('');
	let observer: IntersectionObserver | null = null;
	let observed = new Set<string>();

	function observeHeadings(): void {
		if (!browser || !scrollContainer) return;

		observer?.disconnect();
		observed.clear();

		observer = new IntersectionObserver(
			(entries) => {
				/* Pick the topmost intersecting heading */
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

				if (visible.length > 0) {
					activeId = visible[0].target.id;
				}
			},
			{
				root: scrollContainer,
				rootMargin: '-8% 0px -75% 0px',
				threshold: 0
			}
		);

		/* Observe every heading that has an id assigned by TipTap TOC extension */
		const headings = scrollContainer.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id]');
		for (const h of headings) {
			if (h.id && !observed.has(h.id)) {
				observer.observe(h);
				observed.add(h.id);
			}
		}
	}

	/* Re-observe whenever items list changes (new headings added) */
	$effect(() => {
		void items;
		if (browser) {
			/* Small delay to let TipTap assign IDs to the DOM */
			const id = setTimeout(observeHeadings, 80);
			return () => clearTimeout(id);
		}
	});

	onDestroy(() => {
		observer?.disconnect();
	});

	/* ─── Scroll-to-heading ─────────────────────────────────────── */

	function scrollToHeading(item: TocItem): void {
		if (!scrollContainer) return;
		const target = scrollContainer.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`);
		if (target) {
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeId = item.id;
		}
	}

	/* ─── Keyboard navigation ───────────────────────────────────── */

	let focusedIndex = $state(-1);
	let listEl = $state<HTMLOListElement>();

	function handleKeydown(e: KeyboardEvent): void {
		if (!open) return;

		if (e.key === 'Escape') {
			open = false;
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
			getFocusEl(focusedIndex)?.focus();
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedIndex = Math.max(focusedIndex - 1, 0);
			getFocusEl(focusedIndex)?.focus();
			return;
		}

		if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < items.length) {
			e.preventDefault();
			scrollToHeading(items[focusedIndex]);
		}
	}

	function getFocusEl(index: number): HTMLButtonElement | null {
		return listEl?.querySelectorAll<HTMLButtonElement>('.toc-item-btn')[index] ?? null;
	}

	/* ─── Level indentation map ─────────────────────────────────── */

	const INDENT: Record<number, string> = {
		1: '0px',
		2: '12px',
		3: '24px',
		4: '36px',
		5: '44px',
		6: '52px'
	};

	const LEVEL_ICON: Record<number, string> = {
		1: 'ph:text-h-one',
		2: 'ph:text-h-two',
		3: 'ph:text-h-three',
		4: 'ph:text-h-four',
		5: 'ph:text-h',
		6: 'ph:text-h'
	};

	/* ─── Computed stats ────────────────────────────────────────── */

	let h1Count = $derived(items.filter((i) => i.level === 1).length);
	let totalCount = $derived(items.length);
	let activeIndex = $derived(items.findIndex((i) => i.id === activeId));
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Toggle Button -->
<button
	class="toc-toggle"
	class:open
	type="button"
	aria-label={open ? 'Close table of contents' : 'Open table of contents'}
	aria-expanded={open}
	onclick={() => {
		open = !open;
		focusedIndex = -1;
	}}
	title="Table of Contents"
>
	<Icon name="ph:list-bullets" size={20} />
	{#if totalCount > 0}
		<span class="toc-badge">{totalCount}</span>
	{/if}
</button>

<!-- Panel -->
{#if open}
	<aside class="toc-panel" role="complementary" aria-label="Table of contents">
		<!-- Header -->
		<div class="toc-header">
			<div class="toc-header-left">
				<Icon name="ph:list-bullets" size={16} />
				<span class="toc-title">Contents</span>
				{#if totalCount > 0}
					<span class="toc-count">{totalCount} heading{totalCount !== 1 ? 's' : ''}</span>
				{/if}
			</div>
			<button
				class="toc-close"
				type="button"
				aria-label="Close table of contents"
				onclick={() => {
					open = false;
				}}
			>
				<Icon name="ph:x" size={16} />
			</button>
		</div>

		<!-- Reading progress bar -->
		<div class="toc-progress-track" aria-hidden="true">
			<div class="toc-progress-fill" style:inline-size="{readingProgress}%"></div>
		</div>
		<div class="toc-progress-label" aria-live="polite">
			<span>{readingProgress}% read</span>
			{#if activeIndex >= 0}
				<span>{activeIndex + 1} / {totalCount}</span>
			{/if}
		</div>

		<!-- Heading list -->
		{#if totalCount === 0}
			<div class="toc-empty">
				<Icon name="ph:file-text" size={32} />
				<p class="toc-empty-title">No headings yet</p>
				<p class="toc-empty-hint">Add H1–H4 headings to build a table of contents.</p>
			</div>
		{:else}
			<ol class="toc-list" bind:this={listEl} role="list">
				{#each items as item, i (item.id)}
					<li
						class="toc-item"
						class:is-active={item.id === activeId}
						class:is-scrolled-over={item.isScrolledOver}
						style:padding-inline-start={INDENT[item.level] ?? '0px'}
					>
						<button
							class="toc-item-btn"
							type="button"
							tabindex={open ? 0 : -1}
							aria-current={item.id === activeId ? 'location' : undefined}
							onclick={() => {
								focusedIndex = i;
								scrollToHeading(item);
							}}
							onfocus={() => {
								focusedIndex = i;
							}}
						>
							<span class="toc-item-icon" aria-hidden="true">
								<Icon name={LEVEL_ICON[item.level] ?? 'ph:text-h'} size={12} />
							</span>
							<span class="toc-item-text">{item.textContent || 'Untitled heading'}</span>
							{#if item.id === activeId}
								<span class="toc-item-dot" aria-hidden="true"></span>
							{/if}
						</button>
					</li>
				{/each}
			</ol>

			<!-- Mini stat row -->
			<div class="toc-stats">
				{#if h1Count > 0}
					<span class="toc-stat">
						<Icon name="ph:text-h-one" size={12} />
						{h1Count} section{h1Count !== 1 ? 's' : ''}
					</span>
				{/if}
				<span class="toc-stat">
					<Icon name="ph:clock" size={12} />
					~{Math.max(1, Math.ceil(totalCount * 0.8))} min read
				</span>
			</div>
		{/if}
	</aside>
{/if}

<style>
	@layer components {
		/* ─── Toggle button ──────────────────────────────────────── */

		.toc-toggle {
			position: fixed;
			inset-inline-end: 360px;
			inset-block-start: 70px;
			z-index: 300;
			display: inline-flex;
			align-items: center;
			gap: 4px;
			padding-block: 7px;
			padding-inline: 10px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 8px;
			background: var(--color-surface, oklch(0.16 0.01 260));
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			cursor: pointer;
			box-shadow: 0 2px 8px oklch(0 0 0 / 0.25);
			transition:
				background 0.15s ease,
				color 0.15s ease,
				border-color 0.15s ease,
				box-shadow 0.15s ease;

			&:hover {
				color: var(--color-text, oklch(0.95 0 0));
				border-color: var(--color-accent, oklch(0.7 0.15 250));
				box-shadow: 0 4px 16px oklch(0 0 0 / 0.35);
			}

			&.open {
				background: oklch(0.7 0.15 250 / 0.12);
				color: var(--color-accent, oklch(0.7 0.15 250));
				border-color: var(--color-accent, oklch(0.7 0.15 250));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 2px;
			}

			@media (max-width: 900px) {
				inset-inline-end: 12px;
			}
		}

		.toc-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-inline-size: 18px;
			block-size: 18px;
			padding-inline: 4px;
			border-radius: 9px;
			background: var(--color-accent, oklch(0.7 0.15 250));
			color: oklch(0.1 0 0);
			font-size: 0.65rem;
			font-weight: 700;
			line-height: 1;
		}

		/* ─── Panel ──────────────────────────────────────────────── */

		.toc-panel {
			position: fixed;
			inset-block-start: 56px;
			inset-inline-end: 320px;
			inset-block-end: 0;
			z-index: 250;
			inline-size: 260px;
			background: var(--color-surface, oklch(0.14 0.01 260));
			border-inline-start: 1px solid var(--color-border, oklch(0.25 0.02 260));
			border-inline-end: 1px solid var(--color-border, oklch(0.25 0.02 260));
			display: flex;
			flex-direction: column;
			overflow: hidden;
			animation: toc-slide-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
			box-shadow: 4px 0 24px oklch(0 0 0 / 0.18);

			@media (max-width: 900px) {
				inset-inline-end: 0;
				inline-size: min(280px, 90dvw);
				border-inline-end: none;
				box-shadow: -4px 0 32px oklch(0 0 0 / 0.4);
			}
		}

		@keyframes toc-slide-in {
			from {
				opacity: 0;
				translate: 20px 0;
			}
			to {
				opacity: 1;
				translate: 0 0;
			}
		}

		/* ─── Header ─────────────────────────────────────────────── */

		.toc-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-block: 12px;
			padding-inline: 14px;
			border-block-end: 1px solid var(--color-border, oklch(0.22 0.015 260));
			background: var(--color-surface, oklch(0.12 0.005 260));
			flex-shrink: 0;
		}

		.toc-header-left {
			display: flex;
			align-items: center;
			gap: 6px;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
		}

		.toc-title {
			font-size: 0.78rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: var(--color-text, oklch(0.9 0 0));
		}

		.toc-count {
			font-size: 0.68rem;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
			background: oklch(0.25 0.01 260);
			padding-block: 1px;
			padding-inline: 6px;
			border-radius: 8px;
		}

		.toc-close {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 4px;
			border: none;
			border-radius: 6px;
			background: transparent;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			cursor: pointer;
			transition:
				background 0.12s ease,
				color 0.12s ease;

			&:hover {
				background: var(--color-hover, oklch(0.22 0.02 260));
				color: var(--color-text, oklch(0.95 0 0));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 1px;
			}
		}

		/* ─── Progress bar ───────────────────────────────────────── */

		.toc-progress-track {
			block-size: 3px;
			background: oklch(0.22 0.01 260);
			flex-shrink: 0;
		}

		.toc-progress-fill {
			block-size: 100%;
			background: linear-gradient(
				to right,
				oklch(0.7 0.15 250),
				oklch(0.65 0.2 300)
			);
			transition: inline-size 0.25s ease-out;
			border-radius: 0 2px 2px 0;
		}

		.toc-progress-label {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-block: 5px;
			padding-inline: 14px;
			font-size: 0.65rem;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
			border-block-end: 1px solid var(--color-border, oklch(0.2 0.01 260));
			flex-shrink: 0;
		}

		/* ─── Empty state ────────────────────────────────────────── */

		.toc-empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			flex: 1;
			padding-block: 40px;
			padding-inline: 20px;
			text-align: center;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
			gap: 8px;
		}

		.toc-empty-title {
			font-size: 0.875rem;
			font-weight: 600;
			color: var(--color-text-secondary, oklch(0.7 0.02 260));
			margin: 0;
		}

		.toc-empty-hint {
			font-size: 0.75rem;
			line-height: 1.5;
			margin: 0;
		}

		/* ─── List ───────────────────────────────────────────────── */

		.toc-list {
			flex: 1;
			overflow-y: auto;
			padding-block: 8px;
			margin: 0;
			list-style: none;
			padding-inline-start: 0;
			scroll-behavior: smooth;

			&::-webkit-scrollbar {
				inline-size: 4px;
			}

			&::-webkit-scrollbar-thumb {
				background: oklch(0.35 0.02 260);
				border-radius: 2px;
			}
		}

		/* ─── Item ───────────────────────────────────────────────── */

		.toc-item {
			transition: background 0.1s ease;
		}

		.toc-item-btn {
			display: flex;
			align-items: center;
			gap: 6px;
			inline-size: 100%;
			padding-block: 6px;
			padding-inline-end: 14px;
			padding-inline-start: 0;
			background: transparent;
			border: none;
			border-inline-start: 2px solid transparent;
			color: var(--color-text-muted, oklch(0.58 0.02 260));
			font-size: 0.78rem;
			line-height: 1.4;
			text-align: start;
			cursor: pointer;
			transition:
				color 0.12s ease,
				border-color 0.12s ease,
				background 0.12s ease;

			&:hover {
				color: var(--color-text, oklch(0.9 0 0));
				background: oklch(0.7 0.15 250 / 0.06);
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: -2px;
			}
		}

		.toc-item.is-active > .toc-item-btn {
			color: var(--color-accent, oklch(0.7 0.15 250));
			border-inline-start-color: var(--color-accent, oklch(0.7 0.15 250));
			background: oklch(0.7 0.15 250 / 0.08);
			font-weight: 600;
		}

		.toc-item.is-scrolled-over > .toc-item-btn {
			color: var(--color-text-secondary, oklch(0.72 0.02 260));
		}

		.toc-item-icon {
			flex-shrink: 0;
			opacity: 0.55;
		}

		.toc-item.is-active > .toc-item-btn .toc-item-icon {
			opacity: 1;
		}

		.toc-item-text {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.toc-item-dot {
			flex-shrink: 0;
			inline-size: 6px;
			block-size: 6px;
			border-radius: 50%;
			background: var(--color-accent, oklch(0.7 0.15 250));
			animation: toc-dot-pulse 2s ease-in-out infinite;
		}

		@keyframes toc-dot-pulse {
			0%, 100% { opacity: 1; scale: 1; }
			50% { opacity: 0.5; scale: 0.8; }
		}

		/* ─── Stats footer ───────────────────────────────────────── */

		.toc-stats {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-block: 8px;
			padding-inline: 14px;
			border-block-start: 1px solid var(--color-border, oklch(0.2 0.01 260));
			flex-shrink: 0;
			gap: 8px;
		}

		.toc-stat {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			font-size: 0.68rem;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
		}
	}
</style>
