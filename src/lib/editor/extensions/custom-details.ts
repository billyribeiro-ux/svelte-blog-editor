import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		details: {
			setDetails: () => ReturnType;
		};
	}
}

/**
 * Custom TipTap node for `<details>` / `<summary>` collapsible blocks.
 * Renders semantic HTML: `<details><summary>...</summary><p>...</p></details>`.
 */
export const Details = Node.create({
	name: 'details',

	group: 'block',

	content: 'detailsSummary block+',

	defining: true,

	parseHTML() {
		return [{ tag: 'details' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['details', mergeAttributes(HTMLAttributes, { class: 'blog-details' }), 0];
	},

	addCommands() {
		return {
			setDetails:
				() =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						content: [
							{
								type: 'detailsSummary',
								content: [{ type: 'text', text: 'Summary' }]
							},
							{
								type: 'paragraph'
							}
						]
					});
				}
		};
	}
});

/**
 * The `<summary>` child node inside `<details>`.
 */
export const DetailsSummary = Node.create({
	name: 'detailsSummary',

	group: '',

	content: 'inline*',

	defining: true,

	parseHTML() {
		return [{ tag: 'summary' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['summary', mergeAttributes(HTMLAttributes), 0];
	}
});
