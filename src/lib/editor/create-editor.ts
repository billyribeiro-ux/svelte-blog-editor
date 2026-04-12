import { Editor, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import FontFamily from '@tiptap/extension-font-family';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Dropcursor from '@tiptap/extension-dropcursor';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import FloatingMenu from '@tiptap/extension-floating-menu';
import Mention from '@tiptap/extension-mention';
import { TableOfContents } from '@tiptap/extension-table-of-contents';
import { CodeBlockShiki } from 'tiptap-extension-code-block-shiki';

import { CustomImage } from './extensions/custom-image.js';
import { CustomVideo } from './extensions/custom-video.js';
import { CustomAudio } from './extensions/custom-audio.js';
import { Details, DetailsSummary } from './extensions/custom-details.js';

import type { BlogEditorOptions } from './types.js';

/**
 * Creates a fully configured TipTap Editor instance for the blog editor.
 * This is the single source of truth for all editor extensions and configuration.
 */
export function createBlogEditor(element: HTMLElement, options: BlogEditorOptions): Editor {
	const {
		content,
		editable,
		onUpdate,
		onTocUpdate,
		placeholder = 'Write your blog post...'
	} = options;

	const editor = new Editor({
		element,
		editable,
		content,
		extensions: [
			StarterKit.configure({
				codeBlock: false,
				dropcursor: false
			}),

			/* Code blocks with Shiki syntax highlighting */
			CodeBlockShiki.configure({
				defaultTheme: 'github-dark',
				themes: {
					light: 'github-light',
					dark: 'github-dark'
				}
			}),

			/* Text formatting */
			TextStyle,
			Color,
			Highlight.configure({ multicolor: true }),
			Underline,
			Subscript,
			Superscript,
			FontFamily,
			Typography,
			TextAlign.configure({
				types: ['heading', 'paragraph'],
				alignments: ['left', 'center', 'right', 'justify']
			}),

			/* Links */
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					rel: 'noopener noreferrer',
					class: 'blog-link'
				}
			}),

			/* Media */
			CustomImage,
			CustomVideo,
			CustomAudio,
			Dropcursor.configure({
				color: 'oklch(0.7 0.15 250)',
				width: 2
			}),
			Youtube.configure({
				inline: false,
				HTMLAttributes: {
					class: 'blog-youtube'
				}
			}),

			/* Tables */
			Table.configure({
				resizable: true,
				HTMLAttributes: {
					class: 'blog-table'
				}
			}),
			TableRow,
			TableHeader,
			TableCell,

			/* Details / Summary */
			Details,
			DetailsSummary,

			/* Tasks */
			TaskList,
			TaskItem.configure({
				nested: true
			}),

			/* Functional */
			CharacterCount,
			Mention,
			TableOfContents.configure({
				onUpdate: onTocUpdate
			}),
			Placeholder.configure({
				placeholder: ({ node }) => {
					if (node.type.name === 'heading') {
						return 'Heading';
					}
					if (node.type.name === 'codeBlock') {
						return 'Write code...';
					}
					return placeholder;
				}
			}),

			/* UI extensions — these get their elements set by Svelte components */
			BubbleMenu.configure({
				element: undefined as unknown as HTMLElement
			}),
			FloatingMenu.configure({
				element: undefined as unknown as HTMLElement
			})
		],

		onTransaction: ({ editor: e }) => {
			/* Force Svelte reactivity by reassigning — handled by the component */
			void e;
		},

		onUpdate: ({ editor: e }) => {
			onUpdate?.({
				editor: e,
				html: e.getHTML(),
				json: e.getJSON()
			});
		}
	});

	return editor;
}

/**
 * Calculates reading time from TipTap JSON content.
 * Assumes an average reading speed of 238 words per minute.
 */
export function calculateReadingTime(text: string): number {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 238));
}

/**
 * Counts words in a plain text string.
 */
export function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Extracts a plain-text excerpt from TipTap JSON content.
 */
export function extractExcerpt(json: JSONContent, maxLength = 160): string {
	const textParts: string[] = [];

	function walk(node: JSONContent): void {
		if (node.text) {
			textParts.push(node.text);
		}
		if (node.content) {
			for (const child of node.content) {
				walk(child);
			}
		}
	}

	walk(json);
	const full = textParts.join(' ').replace(/\s+/g, ' ').trim();
	if (full.length <= maxLength) return full;
	return full.slice(0, maxLength).replace(/\s\S*$/, '') + '…';
}
