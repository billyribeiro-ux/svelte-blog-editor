<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Popover from '$lib/components/ui/Popover.svelte';
	import ColorPicker from '$lib/components/ui/ColorPicker.svelte';

	let {
		editor,
		onInsertImage
	}: {
		editor: Editor | null;
		onInsertImage?: () => void;
	} = $props();

	let colorPopoverOpen = $state(false);
	let highlightPopoverOpen = $state(false);

	/* ─── Active state derivations ──────────────────────────────── */

	let isBold = $derived(editor?.isActive('bold') ?? false);
	let isItalic = $derived(editor?.isActive('italic') ?? false);
	let isUnderline = $derived(editor?.isActive('underline') ?? false);
	let isStrike = $derived(editor?.isActive('strike') ?? false);
	let isCode = $derived(editor?.isActive('code') ?? false);
	let isH1 = $derived(editor?.isActive('heading', { level: 1 }) ?? false);
	let isH2 = $derived(editor?.isActive('heading', { level: 2 }) ?? false);
	let isH3 = $derived(editor?.isActive('heading', { level: 3 }) ?? false);
	let isH4 = $derived(editor?.isActive('heading', { level: 4 }) ?? false);
	let isAlignLeft = $derived(editor?.isActive({ textAlign: 'left' }) ?? false);
	let isAlignCenter = $derived(editor?.isActive({ textAlign: 'center' }) ?? false);
	let isAlignRight = $derived(editor?.isActive({ textAlign: 'right' }) ?? false);
	let isAlignJustify = $derived(editor?.isActive({ textAlign: 'justify' }) ?? false);
	let isBulletList = $derived(editor?.isActive('bulletList') ?? false);
	let isOrderedList = $derived(editor?.isActive('orderedList') ?? false);
	let isTaskList = $derived(editor?.isActive('taskList') ?? false);
	let isBlockquote = $derived(editor?.isActive('blockquote') ?? false);
	let isCodeBlock = $derived(editor?.isActive('codeBlock') ?? false);

	/* ─── Commands ──────────────────────────────────────────────── */

	function cmd(fn: (e: Editor) => void): void {
		if (editor) fn(editor);
	}

	function insertYoutube(): void {
		const url = prompt('Enter YouTube URL:');
		if (url && editor) {
			editor.chain().focus().setYoutubeVideo({ src: url }).run();
		}
	}

	function insertVideo(): void {
		const url = prompt('Enter video URL:');
		if (url && editor) {
			editor
				.chain()
				.focus()
				.insertContent({
					type: 'customVideo',
					attrs: { src: url, title: '', alt: '', controls: true }
				})
				.run();
		}
	}

	function insertTable(): void {
		if (editor) {
			editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
		}
	}

	function setTextColor(color: string): void {
		if (!editor) return;
		if (color) {
			editor.chain().focus().setColor(color).run();
		} else {
			editor.chain().focus().unsetColor().run();
		}
		colorPopoverOpen = false;
	}

	function setHighlightColor(color: string): void {
		if (!editor) return;
		if (color) {
			editor.chain().focus().setHighlight({ color }).run();
		} else {
			editor.chain().focus().unsetHighlight().run();
		}
		highlightPopoverOpen = false;
	}

	/* ─── Snippet: Toolbar Button ───────────────────────────────── */
</script>

{#snippet toolbarButton(
	icon: string,
	label: string,
	active: boolean,
	action: () => void,
	disabled?: boolean
)}
	<button
		class="toolbar-btn"
		class:active
		type="button"
		aria-label={label}
		aria-pressed={active}
		{disabled}
		onclick={action}
	>
		<Icon name={icon} size={18} />
	</button>
{/snippet}

{#snippet separator()}
	<div class="toolbar-separator" aria-hidden="true"></div>
{/snippet}

<div class="toolbar" role="toolbar" aria-label="Editor formatting toolbar">
	<!-- Text Style -->
	<div class="toolbar-group">
		{@render toolbarButton('ph:text-bolder', 'Bold', isBold, () =>
			cmd((e) => e.chain().focus().toggleBold().run())
		)}
		{@render toolbarButton('ph:text-italic', 'Italic', isItalic, () =>
			cmd((e) => e.chain().focus().toggleItalic().run())
		)}
		{@render toolbarButton('ph:text-underline', 'Underline', isUnderline, () =>
			cmd((e) => e.chain().focus().toggleUnderline().run())
		)}
		{@render toolbarButton('ph:text-strikethrough', 'Strikethrough', isStrike, () =>
			cmd((e) => e.chain().focus().toggleStrike().run())
		)}
		{@render toolbarButton('ph:code', 'Inline Code', isCode, () =>
			cmd((e) => e.chain().focus().toggleCode().run())
		)}
	</div>

	{@render separator()}

	<!-- Headings -->
	<div class="toolbar-group">
		{@render toolbarButton('ph:text-h-one', 'Heading 1', isH1, () =>
			cmd((e) => e.chain().focus().toggleHeading({ level: 1 }).run())
		)}
		{@render toolbarButton('ph:text-h-two', 'Heading 2', isH2, () =>
			cmd((e) => e.chain().focus().toggleHeading({ level: 2 }).run())
		)}
		{@render toolbarButton('ph:text-h-three', 'Heading 3', isH3, () =>
			cmd((e) => e.chain().focus().toggleHeading({ level: 3 }).run())
		)}
		{@render toolbarButton('ph:text-h-four', 'Heading 4', isH4, () =>
			cmd((e) => e.chain().focus().toggleHeading({ level: 4 }).run())
		)}
	</div>

	{@render separator()}

	<!-- Text Color -->
	<div class="toolbar-group">
		<Popover bind:open={colorPopoverOpen} align="start">
			{#snippet trigger()}
				<span class="toolbar-btn" aria-label="Text Color">
					<Icon name="ph:paint-bucket" size={18} />
				</span>
			{/snippet}
			{#snippet content()}
				<div class="color-popover-content">
					<p class="color-popover-label">Text Color</p>
					<ColorPicker value="" onchange={setTextColor} />
				</div>
			{/snippet}
		</Popover>

		<Popover bind:open={highlightPopoverOpen} align="start">
			{#snippet trigger()}
				<span class="toolbar-btn" aria-label="Highlight Color">
					<Icon name="ph:highlighter" size={18} />
				</span>
			{/snippet}
			{#snippet content()}
				<div class="color-popover-content">
					<p class="color-popover-label">Highlight Color</p>
					<ColorPicker value="" onchange={setHighlightColor} />
				</div>
			{/snippet}
		</Popover>
	</div>

	{@render separator()}

	<!-- Alignment -->
	<div class="toolbar-group">
		{@render toolbarButton('ph:text-align-left', 'Align Left', isAlignLeft, () =>
			cmd((e) => e.chain().focus().setTextAlign('left').run())
		)}
		{@render toolbarButton('ph:text-align-center', 'Align Center', isAlignCenter, () =>
			cmd((e) => e.chain().focus().setTextAlign('center').run())
		)}
		{@render toolbarButton('ph:text-align-right', 'Align Right', isAlignRight, () =>
			cmd((e) => e.chain().focus().setTextAlign('right').run())
		)}
		{@render toolbarButton('ph:text-align-justify', 'Align Justify', isAlignJustify, () =>
			cmd((e) => e.chain().focus().setTextAlign('justify').run())
		)}
	</div>

	{@render separator()}

	<!-- Lists -->
	<div class="toolbar-group">
		{@render toolbarButton('ph:list-bullets', 'Bullet List', isBulletList, () =>
			cmd((e) => e.chain().focus().toggleBulletList().run())
		)}
		{@render toolbarButton('ph:list-numbers', 'Ordered List', isOrderedList, () =>
			cmd((e) => e.chain().focus().toggleOrderedList().run())
		)}
		{@render toolbarButton('ph:check-square', 'Task List', isTaskList, () =>
			cmd((e) => e.chain().focus().toggleTaskList().run())
		)}
	</div>

	{@render separator()}

	<!-- Insert -->
	<div class="toolbar-group">
		{@render toolbarButton('ph:image', 'Insert Image', false, () => onInsertImage?.())}
		{@render toolbarButton('ph:video-camera', 'Insert Video', false, insertVideo)}
		{@render toolbarButton('ph:youtube-logo', 'Insert YouTube Video', false, insertYoutube)}
		{@render toolbarButton('ph:table', 'Insert Table', false, insertTable)}
		{@render toolbarButton('ph:minus', 'Horizontal Rule', false, () =>
			cmd((e) => e.chain().focus().setHorizontalRule().run())
		)}
		{@render toolbarButton('ph:code-block', 'Code Block', isCodeBlock, () =>
			cmd((e) => e.chain().focus().toggleCodeBlock().run())
		)}
		{@render toolbarButton('ph:quotes', 'Blockquote', isBlockquote, () =>
			cmd((e) => e.chain().focus().toggleBlockquote().run())
		)}
	</div>

	{@render separator()}

	<!-- Utility -->
	<div class="toolbar-group">
		{@render toolbarButton(
			'ph:arrow-u-up-left',
			'Undo',
			false,
			() => cmd((e) => e.chain().focus().undo().run()),
			!editor?.can().undo()
		)}
		{@render toolbarButton(
			'ph:arrow-u-up-right',
			'Redo',
			false,
			() => cmd((e) => e.chain().focus().redo().run()),
			!editor?.can().redo()
		)}
		{@render toolbarButton('ph:eraser', 'Clear Formatting', false, () =>
			cmd((e) => e.chain().focus().clearNodes().unsetAllMarks().run())
		)}
	</div>
</div>

<style>
	@layer components {
		.toolbar {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 2px;
			padding-block: 8px;
			padding-inline: 12px;
			background: var(--color-surface, oklch(0.13 0.01 260));
			border-block-end: 1px solid var(--color-border, oklch(0.25 0.02 260));
			position: sticky;
			inset-block-start: 0;
			z-index: 100;
		}

		.toolbar-group {
			display: flex;
			align-items: center;
			gap: 1px;
		}

		.toolbar-separator {
			inline-size: 1px;
			block-size: 24px;
			background: var(--color-border, oklch(0.3 0.02 260));
			margin-inline: 6px;
		}

		:global(.toolbar-btn) {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			inline-size: 32px;
			block-size: 32px;
			border: none;
			border-radius: 6px;
			background: transparent;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			cursor: pointer;
			transition:
				background 0.12s ease,
				color 0.12s ease;

			&:hover:not(:disabled) {
				background: var(--color-hover, oklch(0.22 0.02 260));
				color: var(--color-text, oklch(0.95 0 0));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 1px;
			}

			&:disabled {
				opacity: 0.35;
				cursor: not-allowed;
			}
		}

		:global(.toolbar-btn.active) {
			background: var(--color-accent-muted, oklch(0.7 0.15 250 / 0.2));
			color: var(--color-accent, oklch(0.7 0.15 250));
		}

		.color-popover-content {
			min-inline-size: 200px;
		}

		.color-popover-label {
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			margin-block-end: 8px;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}
</style>
