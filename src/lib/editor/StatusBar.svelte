<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import { calculateReadingTime, countWords } from './create-editor.js';

	let {
		editor
	}: {
		editor: Editor | null;
	} = $props();

	let wordCount = $derived(
		editor ? countWords(editor.getText()) : 0
	);

	let charCount = $derived(
		editor ? editor.storage.characterCount?.characters() ?? editor.getText().length : 0
	);

	let readingTime = $derived(
		editor ? calculateReadingTime(editor.getText()) : 0
	);
</script>

<div class="status-bar" role="status" aria-live="polite">
	<span class="status-item">
		{wordCount} {wordCount === 1 ? 'word' : 'words'}
	</span>
	<span class="status-separator" aria-hidden="true">·</span>
	<span class="status-item">
		{charCount} {charCount === 1 ? 'character' : 'characters'}
	</span>
	<span class="status-separator" aria-hidden="true">·</span>
	<span class="status-item">
		{readingTime} min read
	</span>
</div>

<style>
	@layer components {
		.status-bar {
			display: flex;
			align-items: center;
			gap: 8px;
			padding-block: 8px;
			padding-inline: 16px;
			font-size: 0.75rem;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
			border-block-start: 1px solid var(--color-border, oklch(0.25 0.02 260));
			background: var(--color-surface, oklch(0.13 0.01 260));
			user-select: none;
		}

		.status-item {
			white-space: nowrap;
		}

		.status-separator {
			color: var(--color-border, oklch(0.35 0.02 260));
		}
	}
</style>
