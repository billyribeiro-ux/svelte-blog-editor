import type { Editor } from '@tiptap/core';
import type { SlashCommandItem } from '../types.js';

/* Side-effect imports for TipTap command type augmentations */
import '@tiptap/starter-kit';
import '@tiptap/extension-task-list';
import '@tiptap/extension-youtube';
import '@tiptap/extension-table';

/**
 * All available slash command items, grouped by category.
 * Each item defines its icon (Phosphor), title, description, and editor action.
 */
export function getSlashCommands(): SlashCommandItem[] {
	return [
		// ─── Text ────────────────────────────────────────────────────
		{
			id: 'heading1',
			title: 'Heading 1',
			description: 'Large section heading',
			icon: 'ph:text-h-one',
			category: 'text',
			action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
		},
		{
			id: 'heading2',
			title: 'Heading 2',
			description: 'Medium section heading',
			icon: 'ph:text-h-two',
			category: 'text',
			action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
		},
		{
			id: 'heading3',
			title: 'Heading 3',
			description: 'Small section heading',
			icon: 'ph:text-h-three',
			category: 'text',
			action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
		},
		{
			id: 'heading4',
			title: 'Heading 4',
			description: 'Sub-section heading',
			icon: 'ph:text-h-four',
			category: 'text',
			action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 4 }).run()
		},
		{
			id: 'paragraph',
			title: 'Paragraph',
			description: 'Plain text paragraph',
			icon: 'ph:paragraph',
			category: 'text',
			action: (editor: Editor) => editor.chain().focus().setParagraph().run()
		},
		{
			id: 'blockquote',
			title: 'Blockquote',
			description: 'Quoted text block',
			icon: 'ph:quotes',
			category: 'text',
			action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run()
		},

		// ─── Lists ───────────────────────────────────────────────────
		{
			id: 'bulletList',
			title: 'Bullet List',
			description: 'Unordered list with bullets',
			icon: 'ph:list-bullets',
			category: 'lists',
			action: (editor: Editor) => editor.chain().focus().toggleBulletList().run()
		},
		{
			id: 'orderedList',
			title: 'Ordered List',
			description: 'Numbered list',
			icon: 'ph:list-numbers',
			category: 'lists',
			action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run()
		},
		{
			id: 'taskList',
			title: 'Task List',
			description: 'Checklist with checkboxes',
			icon: 'ph:check-square',
			category: 'lists',
			action: (editor: Editor) => editor.chain().focus().toggleTaskList().run()
		},

		// ─── Media ───────────────────────────────────────────────────
		{
			id: 'image',
			title: 'Image',
			description: 'Upload or embed an image',
			icon: 'ph:image',
			category: 'media',
			action: () => {
				/* Handled by FloatingMenu — triggers MediaModal */
			}
		},
		{
			id: 'youtube',
			title: 'YouTube',
			description: 'Embed a YouTube video',
			icon: 'ph:youtube-logo',
			category: 'media',
			action: (editor: Editor) => {
				const url = prompt('Enter YouTube URL:');
				if (url) {
					editor.chain().focus().setYoutubeVideo({ src: url }).run();
				}
			}
		},
		{
			id: 'video',
			title: 'Video',
			description: 'Embed a self-hosted video',
			icon: 'ph:video-camera',
			category: 'media',
			action: () => {
				/* Handled by FloatingMenu — triggers a video URL prompt */
			}
		},

		// ─── Advanced ────────────────────────────────────────────────
		{
			id: 'table',
			title: 'Table',
			description: 'Insert a 3×3 table',
			icon: 'ph:table',
			category: 'advanced',
			action: (editor: Editor) =>
				editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
		},
		{
			id: 'codeBlock',
			title: 'Code Block',
			description: 'Syntax-highlighted code',
			icon: 'ph:code-block',
			category: 'advanced',
			action: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run()
		},
		{
			id: 'horizontalRule',
			title: 'Horizontal Rule',
			description: 'Visual divider line',
			icon: 'ph:minus',
			category: 'advanced',
			action: (editor: Editor) => editor.chain().focus().setHorizontalRule().run()
		}
	];
}

/**
 * Filter slash commands by query string (case-insensitive match on title or description).
 */
export function filterSlashCommands(items: SlashCommandItem[], query: string): SlashCommandItem[] {
	if (!query) return items;
	const q = query.toLowerCase();
	return items.filter(
		(item) => item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
	);
}

/**
 * Group slash commands by their category.
 */
export function groupSlashCommands(items: SlashCommandItem[]): Map<string, SlashCommandItem[]> {
	const groups = new Map<string, SlashCommandItem[]>();
	for (const item of items) {
		const existing = groups.get(item.category) || [];
		existing.push(item);
		groups.set(item.category, existing);
	}
	return groups;
}

/** Human-readable category labels */
export const categoryLabels: Record<string, string> = {
	text: 'Text',
	lists: 'Lists',
	media: 'Media',
	advanced: 'Advanced'
};
