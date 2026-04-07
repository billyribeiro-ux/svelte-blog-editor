import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		customAudio: {
			setAudio: (options: {
				src: string;
				title?: string;
				controls?: boolean;
				caption?: string;
			}) => ReturnType;
		};
	}
}

/**
 * Custom TipTap node for audio embeds.
 * Renders `<figure class="blog-audio"><audio .../><figcaption>...</figcaption></figure>`.
 */
export const CustomAudio = Node.create({
	name: 'customAudio',

	group: 'block',

	atom: true,

	draggable: true,

	addAttributes() {
		return {
			src: { default: null },
			title: { default: '' },
			controls: { default: true },
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
			{ tag: 'figure.blog-audio' },
			{ tag: 'audio[src]' }
		];
	},

	renderHTML({ HTMLAttributes }) {
		const { caption, ...audioAttrs } = HTMLAttributes;

		const audioNode: unknown[] = [
			'audio',
			mergeAttributes(audioAttrs)
		];

		const children: unknown[] = [audioNode];
		if (caption) {
			children.push(['figcaption', {}, caption]);
		}

		return [
			'figure',
			{ class: 'blog-audio' },
			...children
		];
	},

	addCommands() {
		return {
			setAudio:
				(options) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs: options
					})
		};
	}
});

export default CustomAudio;
