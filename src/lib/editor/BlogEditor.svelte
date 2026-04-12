<script lang="ts">
	import type { Editor, JSONContent } from '@tiptap/core';
	import { createBlogEditor } from './create-editor.js';
	import { setupCodeBlockUI } from './extensions/code-block-view.js';
	import Toolbar from './Toolbar.svelte';
	import BubbleMenuComponent from './BubbleMenu.svelte';
	import FloatingMenuComponent from './FloatingMenu.svelte';
	import MediaModal from './MediaModal.svelte';
	import StatusBar from './StatusBar.svelte';
	import './editor.css';

	import type { BlogEditorProps, TocItem } from './types.js';

	let {
		content = '',
		editable = true,
		onUpdate,
		onSave,
		class: className = '',
		editor = $bindable<Editor | null>(null),
		tocItems = $bindable<TocItem[]>([]),
		scrollContainer = $bindable<HTMLDivElement | undefined>(undefined)
	}: BlogEditorProps & {
		editor?: Editor | null;
		tocItems?: TocItem[];
		scrollContainer?: HTMLDivElement;
	} = $props();

	let element = $state<HTMLDivElement>();
	let mediaModalOpen = $state(false);
	let isDraggingFile = $state(false);

	/* Reactive wrapper to force Svelte reactivity on editor transactions */
	let editorState = $state<{ editor: Editor | null }>({ editor: null });

	let currentEditor = $derived(editorState.editor);

	/* Sync the $bindable editor prop */
	$effect(() => {
		editor = currentEditor;
	});

	/* ─── Lifecycle ─────────────────────────────────────────────── */

	$effect(() => {
		if (!element) return;

		const instance = createBlogEditor(element, {
			content: content || '<p></p>',
			editable,
			onUpdate: (props) => {
				onUpdate?.(props);
			},
			onTocUpdate: (items) => {
				tocItems = items as TocItem[];
			}
		});

		/* Override onTransaction to trigger Svelte reactivity */
		instance.on('transaction', () => {
			editorState = { editor: instance };
		});

		editorState = { editor: instance };

		const cleanupCodeBlockUI = setupCodeBlockUI(instance);

		return () => {
			cleanupCodeBlockUI();
			instance.destroy();
		};
	});

	/* ─── Keyboard shortcuts ────────────────────────────────────── */

	function handleKeydown(e: KeyboardEvent): void {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			if (currentEditor && onSave) {
				onSave({
					html: currentEditor.getHTML(),
					json: currentEditor.getJSON()
				});
			}
		}
	}

	/* ─── Media modal trigger ───────────────────────────────────── */

	function openMediaModal(): void {
		mediaModalOpen = true;
	}

	/* ─── Drag-and-drop image upload ──────────────────────────────── */

	const ACCEPTED_IMAGE_TYPES = new Set([
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/avif',
		'image/gif'
	]);

	function handleDragOver(e: DragEvent): void {
		if (!e.dataTransfer?.types.includes('Files')) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
		isDraggingFile = true;
	}

	function handleDragLeave(e: DragEvent): void {
		const target = e.currentTarget as HTMLElement;
		const related = e.relatedTarget as Node | null;
		if (target.contains(related)) return;
		isDraggingFile = false;
	}

	async function handleDrop(e: DragEvent): Promise<void> {
		isDraggingFile = false;
		if (!e.dataTransfer?.files.length) return;

		const files = Array.from(e.dataTransfer.files).filter((f) => ACCEPTED_IMAGE_TYPES.has(f.type));
		if (!files.length) return;

		e.preventDefault();
		for (const file of files) {
			await uploadAndInsertImage(file);
		}
	}

	async function handlePaste(e: ClipboardEvent): Promise<void> {
		const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
			ACCEPTED_IMAGE_TYPES.has(f.type)
		);
		if (!files.length) return;

		e.preventDefault();
		for (const file of files) {
			await uploadAndInsertImage(file);
		}
	}

	async function uploadAndInsertImage(file: File): Promise<void> {
		if (!currentEditor) return;

		const formData = new FormData();
		formData.append('file', file);

		try {
			const res = await fetch('/api/editor/upload', { method: 'POST', body: formData });
			if (!res.ok) return;
			const data: { url: string } = await res.json();
			currentEditor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
		} catch (err) {
			console.error('Image upload failed:', err);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="blog-editor {className}" role="application" aria-label="Blog editor">
	<Toolbar editor={currentEditor} onInsertImage={openMediaModal} />

	<div
		class={['editor-content', { 'drag-over': isDraggingFile }]}
		bind:this={scrollContainer}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onpaste={handlePaste}
		role="region"
	>
		<div class="editor-element" bind:this={element}></div>
		{#if isDraggingFile}
			<div class="drop-overlay" aria-hidden="true">
				<span class="drop-label">Drop image to upload</span>
			</div>
		{/if}
	</div>

	<BubbleMenuComponent editor={currentEditor} />
	<FloatingMenuComponent editor={currentEditor} onInsertImage={openMediaModal} />

	<StatusBar editor={currentEditor} />

	<MediaModal bind:open={mediaModalOpen} editor={currentEditor} />
</div>

<style>
	@layer components {
		.blog-editor {
			display: flex;
			flex-direction: column;
			border: 1px solid var(--color-border, oklch(0.25 0.02 260));
			border-radius: 12px;
			overflow: hidden;
			background: var(--color-editor-bg, oklch(0.1 0.005 260));
			box-shadow:
				0 4px 12px oklch(0 0 0 / 0.2),
				0 1px 3px oklch(0 0 0 / 0.1);
			transition: box-shadow 0.2s ease;

			&:focus-within {
				box-shadow:
					0 4px 16px oklch(0 0 0 / 0.25),
					0 0 0 1px oklch(0.7 0.15 250 / 0.15);
			}
		}

		.editor-content {
			position: relative;
			flex: 1;
			overflow-y: auto;
			min-block-size: 400px;
			max-block-size: 75dvh;
			scroll-behavior: smooth;
			scrollbar-width: thin;
			scrollbar-color: oklch(0.3 0.02 260) transparent;
		}

		.editor-element {
			min-block-size: 100%;
		}

		.editor-content.drag-over {
			outline: 2px dashed var(--color-accent, oklch(0.7 0.15 250));
			outline-offset: -2px;
			background: oklch(0.7 0.15 250 / 0.04);
		}

		.drop-overlay {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: oklch(0.1 0.005 260 / 0.7);
			z-index: 10;
			pointer-events: none;
		}

		.drop-label {
			padding-block: 12px;
			padding-inline: 24px;
			border: 2px dashed var(--color-accent, oklch(0.7 0.15 250));
			border-radius: 12px;
			color: var(--color-accent, oklch(0.7 0.15 250));
			font-size: 0.9rem;
			font-weight: 600;
			background: oklch(0.15 0.01 260 / 0.9);
			box-shadow: 0 4px 16px oklch(0 0 0 / 0.3);
		}
	}
</style>
