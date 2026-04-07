import { Node, mergeAttributes } from '@tiptap/core';
import type { ImageAlignment } from '../types.js';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		customVideo: {
			setVideo: (options: {
				src: string;
				poster?: string;
				title?: string;
				alt?: string;
				width?: number | null;
				height?: number | null;
				alignment?: ImageAlignment;
				controls?: boolean;
				autoplay?: boolean;
				muted?: boolean;
				loop?: boolean;
				caption?: string;
			}) => ReturnType;
		};
	}
}

/**
 * Custom TipTap node for self-hosted video.
 * Renders `<figure class="blog-video"><video .../><figcaption>...</figcaption></figure>`.
 */
export const CustomVideo = Node.create({
	name: 'customVideo',

	group: 'block',

	atom: true,

	draggable: true,

	addAttributes() {
		return {
			src: { default: null },
			poster: { default: '' },
			title: { default: '' },
			alt: { default: '' },
			width: {
				default: null,
				parseHTML: (el: HTMLElement) => {
					const v = el.querySelector('video');
					const w = v?.getAttribute('width');
					return w ? parseInt(w, 10) : null;
				}
			},
			height: {
				default: null,
				parseHTML: (el: HTMLElement) => {
					const v = el.querySelector('video');
					const h = v?.getAttribute('height');
					return h ? parseInt(h, 10) : null;
				}
			},
			alignment: {
				default: 'center' as ImageAlignment,
				parseHTML: (el: HTMLElement) =>
					(el.getAttribute('data-alignment') as ImageAlignment) || 'center'
			},
			controls: { default: true },
			autoplay: { default: false },
			muted: { default: false },
			loop: { default: false },
			caption: {
				default: '',
				parseHTML: (el: HTMLElement) => {
					const fc = el.querySelector('figcaption');
					return fc?.textContent || '';
				}
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'figure.blog-video' },
			{ tag: 'video[src]' }
		];
	},

	renderHTML({ HTMLAttributes }) {
		const {
			caption,
			alignment,
			alt,
			...videoAttrs
		} = HTMLAttributes;

		const videoNode: unknown[] = [
			'video',
			mergeAttributes(videoAttrs, {
				...(alt ? { 'aria-label': alt } : {})
			})
		];

		const children: unknown[] = [videoNode];
		if (caption) {
			children.push(['figcaption', {}, caption]);
		}

		return [
			'figure',
			{
				class: 'blog-video',
				'data-alignment': alignment || 'center'
			},
			...children
		];
	},

	addCommands() {
		return {
			setVideo:
				(options) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: options
					})
		};
	}
});

export default CustomVideo;
