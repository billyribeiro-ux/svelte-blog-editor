<script lang="ts">
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
	let suppressUntil = 0;

	/* Inline URL input for YouTube / Video slash commands */
	let urlInputMode = $state<'youtube' | 'video' | null>(null);
	let urlInputValue = $state('');
	let urlInputEl = $state<HTMLInputElement>();

	let allCommands = getSlashCommands();

	let filteredCommands = $derived(filterSlashCommands(allCommands, query));
	let groupedCommands = $derived(groupSlashCommands(filteredCommands));
	let flatFiltered = $derived(filteredCommands);

	function clearSlashText(): void {
		if (!editor) return;
		const selFrom = editor.state.selection.$from;
		const textBefore = selFrom.nodeBefore?.textContent ?? '';
		if (textBefore.startsWith('/')) {
			const deleteFrom = selFrom.pos - textBefore.length;
			editor.chain().deleteRange({ from: deleteFrom, to: selFrom.pos }).run();
		}
	}

	function dismiss(): void {
		query = '';
		selectedIndex = 0;
		isVisible = false;
		suppressUntil = Date.now() + 150;
	}

	function executeCommand(item: SlashCommandItem): void {
		if (!editor) return;

		clearSlashText();

		if (item.id === 'image') {
			onInsertImage?.();
			dismiss();
			return;
		}

		if (item.id === 'youtube' || item.id === 'video') {
			urlInputMode = item.id;
			urlInputValue = '';
			dismiss();
			queueMicrotask(() => urlInputEl?.focus());
			return;
		}

		item.action(editor);
		dismiss();
	}

	function confirmUrlInput(): void {
		const url = urlInputValue.trim();
		if (!url || !editor) {
			cancelUrlInput();
			return;
		}

		if (urlInputMode === 'youtube') {
			editor.chain().focus().setYoutubeVideo({ src: url }).run();
		} else if (urlInputMode === 'video') {
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'customVideo',
					attrs: { src: url, title: '', alt: '', controls: true }
				})
				.run();
		}

		cancelUrlInput();
	}

	function cancelUrlInput(): void {
		urlInputMode = null;
		urlInputValue = '';
		dismiss();
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (urlInputMode) {
			if (e.key === 'Escape') {
				e.preventDefault();
				cancelUrlInput();
			}
			return;
		}

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

	$effect(() => {
		if (!editor || !menuEl) return;

		editor.registerPlugin(
			FloatingMenuPlugin({
				pluginKey,
				editor,
				element: menuEl,
				options: {
					placement: 'bottom-start'
				},
				shouldShow: ({ state }) => {
					if (Date.now() < suppressUntil) {
						isVisible = false;
						return false;
					}

					const selFrom = state.selection.$from;
					const currentLineText = selFrom.nodeBefore?.textContent ?? '';

					if (currentLineText.startsWith('/')) {
						query = currentLineText.slice(1);
						selectedIndex = 0;
						isVisible = true;
						return true;
					}

					isVisible = false;
					return false;
				}
			})
		);

		return () => {
			editor.unregisterPlugin(pluginKey);
		};
	});
</script>

<svelte:document onkeydown={handleKeydown} />

<div class="floating-menu" bind:this={menuEl}>
	{#if urlInputMode}
		<div class="slash-menu slash-url-input">
			<label class="slash-url-label">
				<Icon name={urlInputMode === 'youtube' ? 'ph:youtube-logo' : 'ph:video-camera'} size={16} />
				{urlInputMode === 'youtube' ? 'YouTube URL' : 'Video URL'}
			</label>
			<input
				class="slash-url-field"
				type="url"
				placeholder={urlInputMode === 'youtube'
					? 'https://youtube.com/watch?v=...'
					: 'https://example.com/video.mp4'}
				bind:this={urlInputEl}
				bind:value={urlInputValue}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						confirmUrlInput();
					}
				}}
			/>
			<div class="slash-url-actions">
				<button class="slash-url-btn slash-url-confirm" type="button" onclick={confirmUrlInput}>
					<Icon name="ph:check" size={14} /> Insert
				</button>
				<button class="slash-url-btn slash-url-cancel" type="button" onclick={cancelUrlInput}>
					Cancel
				</button>
			</div>
		</div>
	{:else if isVisible && flatFiltered.length > 0}
		<div class="slash-menu" role="listbox" aria-label="Slash commands">
			{#each [...groupedCommands.entries()] as [category, items]}
				<div class="slash-category">
					<span class="slash-category-label">{categoryLabels[category] ?? category}</span>
				</div>
				{#each items as item, i}
					{@const globalIdx = flatFiltered.indexOf(item)}
					<button
						class={['slash-item', { selected: globalIdx === selectedIndex }]}
						type="button"
						role="option"
						aria-selected={globalIdx === selectedIndex}
						onclick={() => executeCommand(item)}
						onmouseenter={() => {
							selectedIndex = globalIdx;
						}}
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

		/* ─── Inline URL input panel ─────────────────────────────── */

		.slash-url-input {
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding: 12px;
		}

		.slash-url-label {
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: 0.78rem;
			font-weight: 600;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
		}

		.slash-url-field {
			padding-block: 6px;
			padding-inline: 10px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 6px;
			background: var(--color-surface, oklch(0.13 0.01 260));
			color: var(--color-text, oklch(0.95 0 0));
			font-size: 0.8rem;

			&:focus {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: -1px;
			}

			&::placeholder {
				color: var(--color-text-muted, oklch(0.45 0.02 260));
			}
		}

		.slash-url-actions {
			display: flex;
			gap: 6px;
		}

		.slash-url-btn {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			padding-block: 5px;
			padding-inline: 10px;
			border: none;
			border-radius: 5px;
			font-size: 0.78rem;
			font-weight: 600;
			cursor: pointer;
		}

		.slash-url-confirm {
			background: var(--color-accent, oklch(0.7 0.15 250));
			color: oklch(0.1 0 0);

			&:hover {
				background: oklch(0.65 0.17 250);
			}
		}

		.slash-url-cancel {
			background: transparent;
			color: var(--color-text-muted, oklch(0.6 0.02 260));

			&:hover {
				color: var(--color-text, oklch(0.9 0 0));
			}
		}
	}
</style>
