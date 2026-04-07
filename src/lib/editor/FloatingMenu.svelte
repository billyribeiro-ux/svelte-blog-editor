<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { FloatingMenuPlugin } from '@tiptap/extension-floating-menu';
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		getSlashCommands,
		filterSlashCommands,
		groupSlashCommands,
		categoryLabels
	} from './extensions/slash-commands.js';
	import type { SlashCommandItem } from './types.js';

	let {
		editor,
		onInsertImage
	}: {
		editor: Editor | null;
		onInsertImage?: () => void;
	} = $props();

	let menuEl = $state<HTMLDivElement>();
	let query = $state('');
	let selectedIndex = $state(0);
	let isVisible = $state(false);
	let pluginKey = 'blogFloatingMenu';

	let allCommands = getSlashCommands();

	let filteredCommands = $derived(filterSlashCommands(allCommands, query));
	let groupedCommands = $derived(groupSlashCommands(filteredCommands));
	let flatFiltered = $derived(filteredCommands);

	function executeCommand(item: SlashCommandItem): void {
		if (!editor) return;

		if (item.id === 'image') {
			onInsertImage?.();
		} else {
			item.action(editor);
		}

		query = '';
		selectedIndex = 0;
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (!isVisible || flatFiltered.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % flatFiltered.length;
			scrollSelectedIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + flatFiltered.length) % flatFiltered.length;
			scrollSelectedIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = flatFiltered[selectedIndex];
			if (item) executeCommand(item);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			isVisible = false;
		}
	}

	function scrollSelectedIntoView(): void {
		const selected = menuEl?.querySelector('.slash-item.selected');
		selected?.scrollIntoView({ block: 'nearest' });
	}

	onMount(() => {
		if (!editor || !menuEl) return;

		editor.registerPlugin(
			FloatingMenuPlugin({
				pluginKey,
				editor,
				element: menuEl,
				tippyOptions: {
					duration: [150, 100],
					placement: 'bottom-start'
				},
				shouldShow: ({ state }) => {
					const { $from } = state.selection;
					const currentLineText = $from.nodeBefore?.textContent ?? '';

					if (currentLineText.startsWith('/')) {
						query = currentLineText.slice(1);
						selectedIndex = 0;
						isVisible = true;
						return true;
					}

					const isEmptyLine =
						$from.parent.isTextblock &&
						$from.parent.content.size === 0;

					if (isEmptyLine) {
						query = '';
						selectedIndex = 0;
						isVisible = true;
						return true;
					}

					isVisible = false;
					return false;
				}
			})
		);

		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (editor) {
			editor.unregisterPlugin(pluginKey);
		}
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="floating-menu" bind:this={menuEl}>
	{#if isVisible && flatFiltered.length > 0}
		<div class="slash-menu" role="listbox" aria-label="Slash commands">
			{#each [...groupedCommands.entries()] as [category, items]}
				<div class="slash-category">
					<span class="slash-category-label">{categoryLabels[category] ?? category}</span>
				</div>
				{#each items as item, i}
					{@const globalIdx = flatFiltered.indexOf(item)}
					<button
						class="slash-item"
						class:selected={globalIdx === selectedIndex}
						type="button"
						role="option"
						aria-selected={globalIdx === selectedIndex}
						onclick={() => executeCommand(item)}
						onmouseenter={() => { selectedIndex = globalIdx; }}
					>
						<span class="slash-item-icon">
							<Icon name={item.icon} size={18} />
						</span>
						<span class="slash-item-text">
							<span class="slash-item-title">{item.title}</span>
							<span class="slash-item-desc">{item.description}</span>
						</span>
					</button>
				{/each}
			{/each}
		</div>
	{:else if isVisible}
		<div class="slash-menu slash-empty">
			<span>No commands found</span>
		</div>
	{/if}
</div>

<style>
	@layer components {
		.floating-menu {
			z-index: 500;
		}

		.slash-menu {
			background: var(--color-surface-elevated, oklch(0.18 0.01 260));
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 10px;
			box-shadow: 0 12px 32px oklch(0 0 0 / 0.35);
			max-block-size: 320px;
			inline-size: 280px;
			overflow-y: auto;
			padding-block: 6px;
		}

		.slash-empty {
			display: flex;
			align-items: center;
			justify-content: center;
			padding-block: 24px;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
			font-size: 0.85rem;
		}

		.slash-category {
			padding-block: 6px;
			padding-inline: 14px;
		}

		.slash-category-label {
			font-size: 0.7rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
		}

		.slash-item {
			display: flex;
			align-items: center;
			gap: 10px;
			inline-size: 100%;
			padding-block: 8px;
			padding-inline: 14px;
			border: none;
			background: transparent;
			color: var(--color-text, oklch(0.9 0 0));
			cursor: pointer;
			text-align: start;
			transition: background 0.08s ease;

			&:hover,
			&.selected {
				background: var(--color-hover, oklch(0.22 0.02 260));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: -2px;
			}
		}

		.slash-item-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			inline-size: 32px;
			block-size: 32px;
			border-radius: 6px;
			background: var(--color-surface, oklch(0.15 0.01 260));
			color: var(--color-accent, oklch(0.7 0.15 250));
			flex-shrink: 0;
		}

		.slash-item-text {
			display: flex;
			flex-direction: column;
			gap: 1px;
			min-inline-size: 0;
		}

		.slash-item-title {
			font-size: 0.85rem;
			font-weight: 500;
		}

		.slash-item-desc {
			font-size: 0.72rem;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
		}
	}
</style>
