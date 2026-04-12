<script lang="ts" module>
	function truncate(text: string, max: number): string {
		return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
	}
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { TocItem } from './types.js';

	let {
		items = [],
		scrollContainer
	}: {
		items: TocItem[];
		scrollContainer?: HTMLElement | null;
	} = $props();

	/* ─── Expanded state ────────────────────────────────────────── */

	let expanded = $state(false);
	let wrapperEl = $state<HTMLDivElement>();

	function toggle(): void {
		expanded = !expanded;
		if (expanded) focusedIndex = -1;
	}

	/* Click-outside to collapse */
	function handleDocClick(e: MouseEvent): void {
		if (expanded && wrapperEl && !wrapperEl.contains(e.target as Node)) {
			expanded = false;
		}
	}

	/* ─── Reading progress ──────────────────────────────────────── */

	let readingProgress = $state(0);

	$effect(() => {
		const el = scrollContainer;
		if (!el || !browser) return;
		const update = (): void => {
			const { scrollTop, scrollHeight, clientHeight } = el;
			const max = scrollHeight - clientHeight;
			readingProgress = max > 0 ? Math.round((scrollTop / max) * 100) : 0;
		};
		el.addEventListener('scroll', update, { passive: true });
		update();
		return () => el.removeEventListener('scroll', update);
	});

	/* ─── Active heading — IntersectionObserver ─────────────────── */

	let activeId = $state('');
	let observer: IntersectionObserver | null = null;

	function observeHeadings(): void {
		if (!browser || !scrollContainer) return;
		observer?.disconnect();

		observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible.length > 0) activeId = visible[0].target.id;
			},
			{ root: scrollContainer, rootMargin: '-8% 0px -75% 0px', threshold: 0 }
		);

		const headings = scrollContainer.querySelectorAll<HTMLElement>(
			'h1[id], h2[id], h3[id], h4[id]'
		);
		for (const h of headings) {
			if (h.id) observer.observe(h);
		}
	}

	$effect(() => {
		void items;
		if (browser) {
			const t = setTimeout(observeHeadings, 80);
			return () => {
				clearTimeout(t);
				observer?.disconnect();
			};
		}
	});

	/* ─── Scroll to heading ──────────────────────────────────────── */

	function scrollTo(item: TocItem): void {
		if (!scrollContainer) return;
		const el = scrollContainer.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`);
		el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		activeId = item.id;
		expanded = false;
	}

	/* ─── Keyboard navigation ───────────────────────────────────── */

	let focusedIndex = $state(-1);
	let listEl = $state<HTMLOListElement>();

	function handleKeydown(e: KeyboardEvent): void {
		if (!expanded) return;
		if (e.key === 'Escape') {
			expanded = false;
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
			listEl?.querySelectorAll<HTMLButtonElement>('.float-item-btn')[focusedIndex]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedIndex = Math.max(focusedIndex - 1, 0);
			listEl?.querySelectorAll<HTMLButtonElement>('.float-item-btn')[focusedIndex]?.focus();
		} else if (e.key === 'Enter' && focusedIndex >= 0) {
			e.preventDefault();
			scrollTo(items[focusedIndex]);
		}
	}

	/* ─── Indentation & icon map ────────────────────────────────── */

	const INDENT: Record<number, string> = { 1: '0px', 2: '10px', 3: '20px', 4: '30px' };
	const ICON: Record<number, string> = {
		1: 'ph:text-h-one',
		2: 'ph:text-h-two',
		3: 'ph:text-h-three',
		4: 'ph:text-h-four'
	};

	let activeItem = $derived(items.find((i) => i.id === activeId));
	let totalCount = $derived(items.length);
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:document onmousedown={handleDocClick} />

<div class={['toc-float', { expanded }]} bind:this={wrapperEl}>
	<!-- Expanded card — renders above the pill -->
	{#if expanded}
		<div class="toc-card" role="dialog" aria-label="Table of contents">
			<!-- Card header -->
			<div class="card-header">
				<span class="card-title">
					<Icon name="ph:list-bullets" size={13} />
					Contents
				</span>
				<span class="card-count">{totalCount}</span>
			</div>

			<!-- Reading progress -->
			<div class="card-progress-track" aria-hidden="true">
				<div class="card-progress-fill" style:inline-size="{readingProgress}%"></div>
			</div>

			<!-- Heading list -->
			{#if totalCount === 0}
				<div class="card-empty">
					<Icon name="ph:file-text" size={22} />
					<span>No headings yet</span>
				</div>
			{:else}
				<ol class="card-list" bind:this={listEl} role="list">
					{#each items as item, i (item.id)}
						<li
							class={[
								'card-item',
								{ 'is-active': item.id === activeId, 'is-past': item.isScrolledOver }
							]}
							style:padding-inline-start={INDENT[item.level] ?? '0px'}
						>
							<button
								class="float-item-btn"
								type="button"
								tabindex={expanded ? 0 : -1}
								aria-current={item.id === activeId ? 'location' : undefined}
								onclick={() => scrollTo(item)}
								onfocus={() => {
									focusedIndex = i;
								}}
							>
								<span class="item-icon" aria-hidden="true">
									<Icon name={ICON[item.level] ?? 'ph:text-h'} size={11} />
								</span>
								<span class="item-text">{item.textContent || 'Untitled'}</span>
								{#if item.id === activeId}
									<span class="item-active-pip" aria-hidden="true"></span>
								{/if}
							</button>
						</li>
					{/each}
				</ol>
			{/if}

			<!-- Footer -->
			<div class="card-footer">
				<span class="card-progress-text">{readingProgress}% read</span>
			</div>
		</div>
	{/if}

	<!-- Pill trigger -->
	<button
		class="toc-pill"
		type="button"
		aria-expanded={expanded}
		aria-haspopup="dialog"
		aria-label={expanded ? 'Close table of contents' : 'Open table of contents'}
		onclick={toggle}
	>
		<!-- Pill progress ring -->
		<svg class="pill-ring" viewBox="0 0 36 36" aria-hidden="true">
			<circle class="ring-track" cx="18" cy="18" r="15.5" />
			<circle
				class="ring-fill"
				cx="18"
				cy="18"
				r="15.5"
				stroke-dasharray="97.4 97.4"
				stroke-dashoffset={97.4 - (97.4 * readingProgress) / 100}
			/>
		</svg>

		<span class="pill-icon">
			<Icon name={expanded ? 'ph:x' : 'ph:list-bullets'} size={16} />
		</span>

		{#if !expanded && totalCount > 0}
			<span class="pill-label">
				{activeItem ? truncate(activeItem.textContent, 18) : `${totalCount} headings`}
			</span>
			<span class="pill-count" aria-hidden="true">{totalCount}</span>
		{:else if !expanded}
			<span class="pill-label">Contents</span>
		{/if}
	</button>
</div>

<style>
	@layer components {
		/* ─── Wrapper ────────────────────────────────────────────── */

		.toc-float {
			position: fixed;
			inset-inline-start: 24px;
			inset-block-end: 32px;
			z-index: 400;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		/* ─── Expanded card ──────────────────────────────────────── */

		.toc-card {
			background: var(--color-surface, oklch(0.15 0.01 260));
			border: 1px solid var(--color-border, oklch(0.28 0.02 260));
			border-radius: 14px;
			inline-size: 240px;
			max-block-size: 360px;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			box-shadow:
				0 8px 32px oklch(0 0 0 / 0.35),
				0 2px 8px oklch(0 0 0 / 0.2);
			animation: float-card-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
		}

		@keyframes float-card-in {
			from {
				opacity: 0;
				scale: 0.88;
				translate: 0 12px;
			}
			to {
				opacity: 1;
				scale: 1;
				translate: 0 0;
			}
		}

		/* ─── Card header ────────────────────────────────────────── */

		.card-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-block: 10px;
			padding-inline: 14px;
			border-block-end: 1px solid var(--color-border, oklch(0.22 0.015 260));
			flex-shrink: 0;
		}

		.card-title {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			font-size: 0.72rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.07em;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
		}

		.card-count {
			font-size: 0.65rem;
			font-weight: 600;
			color: oklch(0.1 0 0);
			background: var(--color-accent, oklch(0.7 0.15 250));
			padding-block: 1px;
			padding-inline: 6px;
			border-radius: 8px;
			line-height: 1.6;
		}

		/* ─── Progress ───────────────────────────────────────────── */

		.card-progress-track {
			block-size: 2px;
			background: oklch(0.2 0.01 260);
			flex-shrink: 0;
		}

		.card-progress-fill {
			block-size: 100%;
			background: linear-gradient(to right, oklch(0.7 0.15 250), oklch(0.65 0.2 300));
			transition: inline-size 0.3s ease-out;
		}

		/* ─── Empty state ────────────────────────────────────────── */

		.card-empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 6px;
			padding-block: 28px;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
			font-size: 0.75rem;
		}

		/* ─── List ───────────────────────────────────────────────── */

		.card-list {
			flex: 1;
			overflow-y: auto;
			padding-block: 6px;
			margin: 0;
			list-style: none;
			padding-inline-start: 0;

			&::-webkit-scrollbar {
				inline-size: 3px;
			}
			&::-webkit-scrollbar-thumb {
				background: oklch(0.32 0.02 260);
				border-radius: 2px;
			}
		}

		/* ─── Item ───────────────────────────────────────────────── */

		.card-item {
			display: block;
		}

		.float-item-btn {
			display: flex;
			align-items: center;
			gap: 5px;
			inline-size: 100%;
			padding-block: 5px;
			padding-inline-end: 12px;
			padding-inline-start: 0;
			background: transparent;
			border: none;
			border-inline-start: 2px solid transparent;
			color: var(--color-text-muted, oklch(0.58 0.02 260));
			font-size: 0.75rem;
			text-align: start;
			cursor: pointer;
			transition:
				color 0.1s ease,
				border-color 0.1s ease,
				background 0.1s ease;

			&:hover {
				color: var(--color-text, oklch(0.9 0 0));
				background: oklch(0.7 0.15 250 / 0.06);
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: -2px;
			}
		}

		.card-item.is-active > .float-item-btn {
			color: var(--color-accent, oklch(0.7 0.15 250));
			border-inline-start-color: var(--color-accent, oklch(0.7 0.15 250));
			background: oklch(0.7 0.15 250 / 0.08);
			font-weight: 600;
		}

		.card-item.is-past > .float-item-btn {
			color: var(--color-text-secondary, oklch(0.68 0.02 260));
		}

		.item-icon {
			flex-shrink: 0;
			opacity: 0.5;
		}

		.card-item.is-active > .float-item-btn .item-icon {
			opacity: 1;
		}

		.item-text {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.item-active-pip {
			flex-shrink: 0;
			inline-size: 5px;
			block-size: 5px;
			border-radius: 50%;
			background: var(--color-accent, oklch(0.7 0.15 250));
			animation: pip-pulse 2s ease-in-out infinite;
		}

		@keyframes pip-pulse {
			0%,
			100% {
				opacity: 1;
				scale: 1;
			}
			50% {
				opacity: 0.4;
				scale: 0.7;
			}
		}

		/* ─── Card footer ────────────────────────────────────────── */

		.card-footer {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			padding-block: 6px;
			padding-inline: 14px;
			border-block-start: 1px solid var(--color-border, oklch(0.2 0.01 260));
			flex-shrink: 0;
		}

		.card-progress-text {
			font-size: 0.65rem;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
		}

		/* ─── Pill trigger ───────────────────────────────────────── */

		.toc-pill {
			position: relative;
			display: inline-flex;
			align-items: center;
			gap: 7px;
			padding-block: 7px;
			padding-inline: 10px;
			border: 1px solid var(--color-border, oklch(0.32 0.02 260));
			border-radius: 999px;
			background: var(--color-surface, oklch(0.16 0.01 260));
			color: var(--color-text, oklch(0.88 0 0));
			font-size: 0.78rem;
			font-weight: 500;
			cursor: pointer;
			box-shadow:
				0 4px 16px oklch(0 0 0 / 0.3),
				0 1px 4px oklch(0 0 0 / 0.15);
			transition:
				background 0.15s ease,
				border-color 0.15s ease,
				box-shadow 0.15s ease,
				color 0.15s ease;
			max-inline-size: 220px;
			overflow: hidden;

			&:hover {
				background: oklch(0.2 0.01 260);
				border-color: var(--color-accent, oklch(0.7 0.15 250));
				box-shadow:
					0 6px 24px oklch(0 0 0 / 0.4),
					0 0 0 1px oklch(0.7 0.15 250 / 0.3);
				color: var(--color-text, oklch(0.95 0 0));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 3px;
			}
		}

		.toc-float.expanded > .toc-pill {
			background: oklch(0.7 0.15 250 / 0.12);
			border-color: var(--color-accent, oklch(0.7 0.15 250));
			color: var(--color-accent, oklch(0.7 0.15 250));
		}

		/* ─── Progress ring inside pill ─────────────────────────── */

		.pill-ring {
			position: absolute;
			inset: 0;
			inline-size: 100%;
			block-size: 100%;
			pointer-events: none;
			border-radius: 999px;
			overflow: visible;
		}

		.pill-icon {
			position: relative;
			z-index: 1;
			display: inline-flex;
			flex-shrink: 0;
		}

		.ring-track {
			fill: none;
			stroke: oklch(0.7 0.15 250 / 0.15);
			stroke-width: 2;
		}

		.ring-fill {
			fill: none;
			stroke: var(--color-accent, oklch(0.7 0.15 250));
			stroke-width: 2;
			stroke-linecap: round;
			transform: rotate(-90deg);
			transform-origin: center;
			transition: stroke-dashoffset 0.4s ease-out;
		}

		.pill-label {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 0.75rem;
			color: var(--color-text-secondary, oklch(0.75 0.02 260));
		}

		.pill-count {
			flex-shrink: 0;
			font-size: 0.65rem;
			font-weight: 700;
			color: oklch(0.1 0 0);
			background: var(--color-accent, oklch(0.7 0.15 250));
			padding-block: 1px;
			padding-inline: 5px;
			border-radius: 8px;
			line-height: 1.6;
		}
	}
</style>
