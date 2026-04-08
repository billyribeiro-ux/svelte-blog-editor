<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor, JSONContent } from '@tiptap/core';
	import { createBlogEditor } from './create-editor.js';
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

	/* Reactive wrapper to force Svelte reactivity on editor transactions */
	let editorState = $state<{ editor: Editor | null }>({ editor: null });

	let currentEditor = $derived(editorState.editor);

	/* Sync the $bindable editor prop */
	$effect(() => {
		editor = currentEditor;
	});

	/* ─── Lifecycle ─────────────────────────────────────────────── */

	onMount(() => {
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
	});

	onDestroy(() => {
		editorState.editor?.destroy();
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
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="blog-editor {className}" role="application" aria-label="Blog editor">
	<Toolbar editor={currentEditor} onInsertImage={openMediaModal} />

	<div class="editor-content" bind:this={scrollContainer}>
		<div class="editor-element" bind:this={element}></div>
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
			border-radius: 10px;
			overflow: hidden;
			background: var(--color-editor-bg, oklch(0.1 0.005 260));
			box-shadow: 0 4px 12px oklch(0 0 0 / 0.2);
		}

		.editor-content {
			flex: 1;
			overflow-y: auto;
			min-block-size: 400px;
			max-block-size: 75dvh;
		}

		.editor-element {
			min-block-size: 100%;
		}
	}
</style>
