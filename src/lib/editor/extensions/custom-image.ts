import Image from '@tiptap/extension-image';
import type { ImageAlignment } from '../types.js';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		customImage: {
			setImage: (options: {
				src: string;
				alt: string;
				title?: string;
				caption?: string;
				description?: string;
				width?: number | null;
				height?: number | null;
				alignment?: ImageAlignment;
				linkUrl?: string;
				linkTarget?: string;
			}) => ReturnType;
		};
	}
}

/**
 * Extended TipTap Image extension with SEO attributes and semantic HTML output.
 * Renders `<figure class="blog-image"><img .../><figcaption>...</figcaption></figure>`.
 */
export const CustomImage = Image.extend({
	name: 'customImage',

	group: 'block',

	inline: false,

	draggable: true,

	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (element: HTMLElement) => {
					const img = element.querySelector('img') || element;
					return img.getAttribute('src');
				},
				renderHTML: (attributes: Record<string, unknown>) => ({
					src: attributes.src as string
				})
			},
			alt: {
				default: '',
				parseHTML: (element: HTMLElement) => {
					const img = element.querySelector('img') || element;
					return img.getAttribute('alt') || '';
				},
				renderHTML: (attributes: Record<string, unknown>) => ({
					alt: attributes.alt as string
				})
			},
			title: {
				default: '',
				parseHTML: (element: HTMLElement) => {
					const img = element.querySelector('img') || element;
					return img.getAttribute('title') || '';
				},
				renderHTML: (attributes: Record<string, unknown>) => {
					if (!attributes.title) return {};
					return { title: attributes.title as string };
				}
			},
			caption: {
				default: '',
				parseHTML: (element: HTMLElement) => {
					const figcaption = element.querySelector('figcaption');
					return figcaption?.textContent || '';
				},
				renderHTML: () => ({})
			},
			description: {
				default: '',
				parseHTML: (element: HTMLElement) => element.getAttribute('data-description') || '',
				renderHTML: (attributes: Record<string, unknown>) => {
					if (!attributes.description) return {};
					return { 'data-description': attributes.description as string };
				}
			},
			width: {
				default: null,
				parseHTML: (element: HTMLElement) => {
					const img = element.querySelector('img') || element;
					const w = img.getAttribute('width');
					return w ? parseInt(w, 10) : null;
				},
				renderHTML: (attributes: Record<string, unknown>) => {
					if (!attributes.width) return {};
					return { width: attributes.width as number };
				}
			},
			height: {
				default: null,
				parseHTML: (element: HTMLElement) => {
					const img = element.querySelector('img') || element;
					const h = img.getAttribute('height');
					return h ? parseInt(h, 10) : null;
				},
				renderHTML: (attributes: Record<string, unknown>) => {
					if (!attributes.height) return {};
					return { height: attributes.height as number };
				}
			},
			alignment: {
				default: 'center' as ImageAlignment,
				parseHTML: (element: HTMLElement) =>
					(element.getAttribute('data-alignment') as ImageAlignment) || 'center',
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-alignment': attributes.alignment as string
				})
			},
			linkUrl: {
				default: '',
				parseHTML: (element: HTMLElement) => {
					const a = element.querySelector('a');
					return a?.getAttribute('href') || '';
				},
				renderHTML: () => ({})
			},
			linkTarget: {
				default: '_blank',
				parseHTML: (element: HTMLElement) => {
					const a = element.querySelector('a');
					return a?.getAttribute('target') || '_blank';
				},
				renderHTML: () => ({})
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'figure.blog-image'
			},
			{
				tag: 'figure[data-alignment]'
			},
			{
				tag: 'img[src]'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		const {
			caption,
			linkUrl,
			linkTarget,
			'data-alignment': alignment,
			'data-description': __description,
			...imgAttrs
		} = HTMLAttributes;
		void __description;

		const imgNode: [string, Record<string, unknown>] = [
			'img',
			{
				...imgAttrs,
				loading: 'lazy'
			}
		];

		const imgOrLink: [string, Record<string, unknown>, ...unknown[]] = linkUrl
			? ['a', { href: linkUrl, target: linkTarget || '_blank' }, imgNode]
			: (imgNode as unknown as [string, Record<string, unknown>, ...unknown[]]);

		const children: unknown[] = [imgOrLink];

		if (caption) {
			children.push(['figcaption', {}, caption]);
		}

		return [
			'figure',
			{
				class: 'blog-image',
				'data-alignment': alignment || 'center'
			},
			...children
		];
	}
});

export default CustomImage;
