import Image from '@tiptap/extension-image';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { NodeViewRendererProps } from '@tiptap/core';
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

	allowBase64: false,

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

	addNodeView() {
		return (props: NodeViewRendererProps) => {
			const { node, getPos, editor } = props;
			const attrs = node.attrs as Record<string, unknown>;

			const figure = document.createElement('figure');
			figure.classList.add('blog-image', 'blog-image-resizable');
			figure.setAttribute('data-alignment', (attrs.alignment as string) || 'center');
			figure.contentEditable = 'false';

			const wrapper = document.createElement('div');
			wrapper.classList.add('image-resize-wrapper');
			figure.appendChild(wrapper);

			const img = document.createElement('img');
			img.src = attrs.src as string;
			img.alt = (attrs.alt as string) || '';
			if (attrs.title) img.title = attrs.title as string;
			if (attrs.width) img.width = attrs.width as number;
			if (attrs.height) img.height = attrs.height as number;
			img.loading = 'lazy';
			img.draggable = false;
			wrapper.appendChild(img);

			/* Resize handle (bottom-right corner) */
			const handle = document.createElement('div');
			handle.classList.add('image-resize-handle');

			let startX = 0;
			let startWidth = 0;
			let aspectRatio = 1;

			function onPointerDown(e: PointerEvent): void {
				e.preventDefault();
				e.stopPropagation();

				startX = e.clientX;
				startWidth = img.clientWidth;
				aspectRatio = img.naturalWidth / (img.naturalHeight || 1);

				handle.setPointerCapture(e.pointerId);
				document.addEventListener('pointermove', onPointerMove);
				document.addEventListener('pointerup', onPointerUp);
				figure.classList.add('resizing');
			}

			function onPointerMove(e: PointerEvent): void {
				const dx = e.clientX - startX;
				const newWidth = Math.max(80, startWidth + dx);
				const newHeight = Math.round(newWidth / aspectRatio);
				img.style.width = `${newWidth}px`;
				img.style.height = `${newHeight}px`;
			}

			function onPointerUp(): void {
				document.removeEventListener('pointermove', onPointerMove);
				document.removeEventListener('pointerup', onPointerUp);
				figure.classList.remove('resizing');

				const finalWidth = img.clientWidth;
				const finalHeight = Math.round(finalWidth / aspectRatio);

				const pos = getPos();
				if (typeof pos === 'number') {
					editor.view.dispatch(
						editor.view.state.tr.setNodeMarkup(pos, undefined, {
							...node.attrs,
							width: finalWidth,
							height: finalHeight
						})
					);
				}
			}

			handle.addEventListener('pointerdown', onPointerDown);
			wrapper.appendChild(handle);

			/* Caption */
			if (attrs.caption) {
				const figcaption = document.createElement('figcaption');
				figcaption.textContent = attrs.caption as string;
				figure.appendChild(figcaption);
			}

			return {
				dom: figure,
				update: (updatedNode: ProseMirrorNode) => {
					if (updatedNode.type.name !== 'customImage') return false;
					const a = updatedNode.attrs as Record<string, unknown>;
					img.src = a.src as string;
					img.alt = (a.alt as string) || '';
					if (a.title) img.title = a.title as string;
					if (a.width) {
						img.style.width = `${a.width}px`;
						img.style.height = `${a.height}px`;
					} else {
						img.style.width = '';
						img.style.height = '';
					}
					figure.setAttribute('data-alignment', (a.alignment as string) || 'center');
					return true;
				},
				destroy: () => {
					handle.removeEventListener('pointerdown', onPointerDown);
				}
			};
		};
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
