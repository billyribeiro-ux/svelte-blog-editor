<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import ColorPicker from '$lib/components/ui/ColorPicker.svelte';
	import type { BubbleMenuContext } from './types.js';

	let {
		editor
	}: {
		editor: Editor | null;
	} = $props();

	let menuEl = $state<HTMLDivElement>();
	let pluginKey = 'blogBubbleMenu';

	let context = $derived<BubbleMenuContext>(computeContext());

	function computeContext(): BubbleMenuContext {
		if (!editor) return 'text';
		if (editor.isActive('customImage') || editor.isActive('image')) return 'image';
		if (editor.isActive('table')) return 'table';
		if (editor.isActive('link')) return 'link';
		return 'text';
	}

	/* ─── Link editing state ────────────────────────────────────── */
	let linkUrl = $state('');
	let linkNewTab = $state(true);

	function openLinkEdit(): void {
		if (!editor) return;
		const attrs = editor.getAttributes('link');
		linkUrl = (attrs.href as string) || '';
		linkNewTab = attrs.target === '_blank';
	}

	function applyLink(): void {
		if (!editor || !linkUrl) return;
		editor
			.chain()
			.focus()
			.extendMarkRange('link')
			.setLink({ href: linkUrl, target: linkNewTab ? '_blank' : null })
			.run();
	}

	function removeLink(): void {
		if (!editor) return;
		editor.chain().focus().extendMarkRange('link').unsetLink().run();
	}

	/* ─── Image actions ─────────────────────────────────────────── */

	let imageAlt = $state('');
	let imageCaption = $state('');

	function syncImageAttrs(): void {
		if (!editor) return;
		const attrs = editor.getAttributes('customImage');
		imageAlt = (attrs.alt as string) || '';
		imageCaption = (attrs.caption as string) || '';
	}

	function updateImageAlt(): void {
		if (!editor) return;
		editor.chain().focus().updateAttributes('customImage', { alt: imageAlt }).run();
	}

	function updateImageCaption(): void {
		if (!editor) return;
		editor.chain().focus().updateAttributes('customImage', { caption: imageCaption }).run();
	}

	function setImageAlignment(alignment: string): void {
		if (!editor) return;
		editor.chain().focus().updateAttributes('customImage', { alignment }).run();
	}

	function removeImage(): void {
		if (!editor) return;
		editor.chain().focus().deleteSelection().run();
	}

	/* Sync image attrs into local state when entering image context */
	$effect(() => {
		if (context === 'image') {
			syncImageAttrs();
		}
	});

	/* ─── Text color ──────────────────────────────────────────────── */

	let colorPopoverOpen = $state(false);

	function applyTextColor(color: string): void {
		if (!editor) return;
		if (color) {
			editor.chain().focus().setColor(color).run();
		} else {
			editor.chain().focus().unsetColor().run();
		}
		colorPopoverOpen = false;
	}

	/* ─── Table actions ─────────────────────────────────────────── */

	function addRowBefore(): void {
		editor?.chain().focus().addRowBefore().run();
	}
	function addRowAfter(): void {
		editor?.chain().focus().addRowAfter().run();
	}
	function deleteRow(): void {
		editor?.chain().focus().deleteRow().run();
	}
	function addColBefore(): void {
		editor?.chain().focus().addColumnBefore().run();
	}
	function addColAfter(): void {
		editor?.chain().focus().addColumnAfter().run();
	}
	function deleteCol(): void {
		editor?.chain().focus().deleteColumn().run();
	}
	function mergeCells(): void {
		editor?.chain().focus().mergeCells().run();
	}
	function splitCell(): void {
		editor?.chain().focus().splitCell().run();
	}
	function toggleHeaderCell(): void {
		editor?.chain().focus().toggleHeaderCell().run();
	}

	/* ─── Plugin setup ──────────────────────────────────────────── */

	$effect(() => {
		if (!editor || !menuEl) return;

		editor.registerPlugin(
			BubbleMenuPlugin({
				pluginKey,
				editor,
				element: menuEl,
				options: {
					placement: 'top'
				},
				shouldShow: ({ editor: e, state }) => {
					const { selection } = state;
					const { empty } = selection;

					if (e.isActive('customImage') || e.isActive('image')) return true;
					if (empty) return false;

					return true;
				}
			})
		);

		return () => {
			editor.unregisterPlugin(pluginKey);
		};
	});

	/* ─── Helper: command button snippet ────────────────────────── */

	function cmd(fn: (e: Editor) => void): void {
		if (editor) fn(editor);
	}
</script>

{#snippet bubbleBtn(icon: string, label: string, active: boolean, action: () => void)}
	<button class={['bubble-btn', { active }]} type="button" aria-label={label} onclick={action}>
		<Icon name={icon} size={16} />
	</button>
{/snippet}

<div class="bubble-menu" bind:this={menuEl}>
	{#if context === 'text'}
		{@render bubbleBtn('ph:text-bolder', 'Bold', editor?.isActive('bold') ?? false, () =>
			cmd((e) => e.chain().focus().toggleBold().run())
		)}
		{@render bubbleBtn('ph:text-italic', 'Italic', editor?.isActive('italic') ?? false, () =>
			cmd((e) => e.chain().focus().toggleItalic().run())
		)}
		{@render bubbleBtn(
			'ph:text-underline',
			'Underline',
			editor?.isActive('underline') ?? false,
			() => cmd((e) => e.chain().focus().toggleUnderline().run())
		)}
		{@render bubbleBtn('ph:text-strikethrough', 'Strike', editor?.isActive('strike') ?? false, () =>
			cmd((e) => e.chain().focus().toggleStrike().run())
		)}
		{@render bubbleBtn('ph:code', 'Code', editor?.isActive('code') ?? false, () =>
			cmd((e) => e.chain().focus().toggleCode().run())
		)}

		<div class="bubble-separator" aria-hidden="true"></div>

		{@render bubbleBtn('ph:link', 'Link', editor?.isActive('link') ?? false, openLinkEdit)}
		{@render bubbleBtn('ph:highlighter', 'Highlight', editor?.isActive('highlight') ?? false, () =>
			cmd((e) => e.chain().focus().toggleHighlight().run())
		)}
		<Popover bind:open={colorPopoverOpen} align="end">
			{#snippet trigger()}
				<span class="bubble-btn" aria-label="Text Color">
					<Icon name="ph:palette" size={16} />
				</span>
			{/snippet}
			{#snippet content()}
				<div class="bubble-color-picker">
					<ColorPicker value="" onchange={applyTextColor} />
				</div>
			{/snippet}
		</Popover>
	{:else if context === 'link'}
		<div class="bubble-link-edit">
			<input
				class="bubble-link-input"
				type="url"
				placeholder="https://..."
				bind:value={linkUrl}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						applyLink();
					}
				}}
			/>
			<label class="bubble-link-newtab">
				<input type="checkbox" bind:checked={linkNewTab} />
				New tab
			</label>
			{@render bubbleBtn('ph:check', 'Apply Link', false, applyLink)}
			{@render bubbleBtn('ph:link-break', 'Remove Link', false, removeLink)}
		</div>
	{:else if context === 'image'}
		<div class="bubble-image-fields">
			<input
				class="bubble-image-input"
				type="text"
				placeholder="Alt text (required)"
				bind:value={imageAlt}
				onchange={updateImageAlt}
			/>
			<input
				class="bubble-image-input"
				type="text"
				placeholder="Caption"
				bind:value={imageCaption}
				onchange={updateImageCaption}
			/>
		</div>

		<div class="bubble-separator" aria-hidden="true"></div>

		{@render bubbleBtn('ph:align-left', 'Align Left', false, () => setImageAlignment('left'))}
		{@render bubbleBtn('ph:align-center-horizontal', 'Align Center', false, () =>
			setImageAlignment('center')
		)}
		{@render bubbleBtn('ph:align-right', 'Align Right', false, () => setImageAlignment('right'))}
		{@render bubbleBtn('ph:arrows-out-line-horizontal', 'Full Width', false, () =>
			setImageAlignment('full')
		)}

		<div class="bubble-separator" aria-hidden="true"></div>

		{@render bubbleBtn('ph:trash', 'Remove Image', false, removeImage)}
	{:else if context === 'table'}
		{@render bubbleBtn('ph:rows-plus-top', 'Add Row Before', false, addRowBefore)}
		{@render bubbleBtn('ph:rows-plus-bottom', 'Add Row After', false, addRowAfter)}
		{@render bubbleBtn('ph:rows', 'Delete Row', false, deleteRow)}

		<div class="bubble-separator" aria-hidden="true"></div>

		{@render bubbleBtn('ph:columns-plus-left', 'Add Col Before', false, addColBefore)}
		{@render bubbleBtn('ph:columns-plus-right', 'Add Col After', false, addColAfter)}
		{@render bubbleBtn('ph:columns', 'Delete Col', false, deleteCol)}

		<div class="bubble-separator" aria-hidden="true"></div>

		{@render bubbleBtn('ph:cell-merge', 'Merge Cells', false, mergeCells)}
		{@render bubbleBtn('ph:cell-split', 'Split Cell', false, splitCell)}
		{@render bubbleBtn('ph:square-half', 'Toggle Header', false, toggleHeaderCell)}
	{/if}
</div>

<style>
	@layer components {
		.bubble-menu {
			display: flex;
			align-items: center;
			gap: 2px;
			padding-block: 4px;
			padding-inline: 6px;
			background: var(--color-surface-elevated, oklch(0.18 0.01 260));
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 8px;
			box-shadow: 0 8px 24px oklch(0 0 0 / 0.35);
			z-index: 500;
		}

		:global(.bubble-btn) {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			inline-size: 28px;
			block-size: 28px;
			border: none;
			border-radius: 4px;
			background: transparent;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			cursor: pointer;
			transition:
				background 0.1s ease,
				color 0.1s ease;

			&:hover {
				background: var(--color-hover, oklch(0.25 0.02 260));
				color: var(--color-text, oklch(0.95 0 0));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 1px;
			}
		}

		:global(.bubble-btn.active) {
			background: var(--color-accent-muted, oklch(0.7 0.15 250 / 0.2));
			color: var(--color-accent, oklch(0.7 0.15 250));
		}

		.bubble-separator {
			inline-size: 1px;
			block-size: 20px;
			background: var(--color-border, oklch(0.3 0.02 260));
			margin-inline: 4px;
		}

		.bubble-link-edit {
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.bubble-link-input {
			inline-size: 200px;
			padding-block: 4px;
			padding-inline: 8px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 4px;
			background: var(--color-surface, oklch(0.13 0.01 260));
			color: var(--color-text, oklch(0.95 0 0));
			font-size: 0.8rem;

			&:focus {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: -1px;
			}
		}

		.bubble-link-newtab {
			display: flex;
			align-items: center;
			gap: 4px;
			font-size: 0.75rem;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			white-space: nowrap;
			cursor: pointer;
		}

		.bubble-image-fields {
			display: flex;
			flex-direction: column;
			gap: 4px;
			padding-block: 2px;
		}

		.bubble-color-picker {
			min-inline-size: 200px;
		}

		.bubble-image-input {
			inline-size: 180px;
			padding-block: 3px;
			padding-inline: 8px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 4px;
			background: var(--color-surface, oklch(0.13 0.01 260));
			color: var(--color-text, oklch(0.95 0 0));
			font-size: 0.75rem;

			&:focus {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: -1px;
			}

			&::placeholder {
				color: var(--color-text-muted, oklch(0.5 0.02 260));
			}
		}
	}
</style>
