import type { Editor, JSONContent } from '@tiptap/core';

// ─── Editor Configuration ───────────────────────────────────────────────────

/** Options for the createBlogEditor factory function */
export interface BlogEditorOptions {
	content: JSONContent | string;
	editable: boolean;
	onUpdate?: (props: { editor: Editor; html: string; json: JSONContent }) => void;
	placeholder?: string;
}

/** Props accepted by the BlogEditor component */
export interface BlogEditorProps {
	content?: JSONContent | string;
	editable?: boolean;
	onUpdate?: (props: { editor: Editor; html: string; json: JSONContent }) => void;
	onSave?: (props: { html: string; json: JSONContent }) => void;
	class?: string;
}

// ─── Image / Media Attributes ───────────────────────────────────────────────

export type ImageAlignment = 'left' | 'center' | 'right' | 'full';

/** Attributes stored on the custom image TipTap node */
export interface ImageAttributes {
	src: string;
	alt: string;
	title: string;
	caption: string;
	description: string;
	width: number | null;
	height: number | null;
	alignment: ImageAlignment;
	linkUrl: string;
	linkTarget: string;
}

/** Attributes stored on the custom video TipTap node */
export interface VideoAttributes {
	src: string;
	poster: string;
	title: string;
	alt: string;
	width: number | null;
	height: number | null;
	alignment: ImageAlignment;
	controls: boolean;
	autoplay: boolean;
	muted: boolean;
	loop: boolean;
	caption: string;
}

/** Attributes stored on the custom audio TipTap node */
export interface AudioAttributes {
	src: string;
	title: string;
	controls: boolean;
	caption: string;
}

// ─── Media Modal ────────────────────────────────────────────────────────────

export type MediaModalTab = 'upload' | 'url';

export type ImageSize = 'thumbnail' | 'medium' | 'large' | 'full';

export type LinkTo = 'none' | 'custom' | 'media';

/** State of the media modal form */
export interface MediaModalState {
	tab: MediaModalTab;
	file: File | null;
	url: string;
	title: string;
	alt: string;
	caption: string;
	description: string;
	size: ImageSize;
	alignment: ImageAlignment;
	linkTo: LinkTo;
	linkUrl: string;
	uploading: boolean;
	uploadProgress: number;
	previewUrl: string;
	error: string;
}

/** Response from the upload API endpoint */
export interface UploadResponse {
	url: string;
	thumbnailUrl: string;
	mediumUrl: string;
	largeUrl: string;
	avifUrl: string;
	thumbnailAvifUrl: string;
	mediumAvifUrl: string;
	largeAvifUrl: string;
	width: number;
	height: number;
	format: string;
	size: number;
}

// ─── Slash Commands ─────────────────────────────────────────────────────────

export type SlashCommandCategory = 'text' | 'lists' | 'media' | 'advanced';

/** A single slash command item */
export interface SlashCommandItem {
	id: string;
	title: string;
	description: string;
	icon: string;
	category: SlashCommandCategory;
	action: (editor: Editor) => void;
}

// ─── Posts / CMS ────────────────────────────────────────────────────────────

export type PostStatus = 'draft' | 'published' | 'scheduled' | 'trashed';

/** SEO metadata for a post */
export interface PostSEO {
	metaTitle: string;
	metaDescription: string;
	focusKeyword: string;
}

/** Full post data shape */
export interface PostData {
	id: string;
	title: string;
	slug: string;
	content: JSONContent;
	excerpt: string;
	featuredImage: string;
	categories: string[];
	tags: string[];
	status: PostStatus;
	authorId: string;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
	seo: PostSEO;
}

/** Payload for creating or updating a post */
export interface PostPayload {
	title: string;
	slug: string;
	content: JSONContent;
	excerpt: string;
	featuredImage: string;
	categories: string[];
	tags: string[];
	status: PostStatus;
	publishedAt: string | null;
	seo: PostSEO;
}

/** Post list query parameters */
export interface PostListParams {
	page: number;
	perPage: number;
	status?: PostStatus;
}

/** Paginated post list response */
export interface PostListResponse {
	posts: PostData[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

// ─── Database Row Types ─────────────────────────────────────────────────────

export interface PostRow {
	id: string;
	title: string;
	slug: string;
	content: string;
	excerpt: string;
	featured_image_url: string;
	status: PostStatus;
	author_id: string;
	published_at: string | null;
	created_at: string;
	updated_at: string;
	seo_meta_title: string;
	seo_meta_description: string;
	seo_focus_keyword: string;
}

export interface CategoryRow {
	id: string;
	name: string;
	slug: string;
	description: string;
	parent_id: string | null;
}

export interface TagRow {
	id: string;
	name: string;
	slug: string;
}

export interface MediaRow {
	id: string;
	filename: string;
	original_name: string;
	mime_type: string;
	size_bytes: number;
	width: number;
	height: number;
	url: string;
	thumbnail_url: string;
	medium_url: string;
	large_url: string;
	alt_text: string;
	title: string;
	caption: string;
	description: string;
	uploaded_at: string;
}

// ─── Toolbar ────────────────────────────────────────────────────────────────

/** Toolbar button group definition */
export interface ToolbarGroup {
	label: string;
	items: ToolbarItem[];
}

export interface ToolbarItem {
	id: string;
	label: string;
	icon: string;
	action: (editor: Editor) => void;
	isActive?: (editor: Editor) => boolean;
	isDisabled?: (editor: Editor) => boolean;
}

// ─── Color Picker ───────────────────────────────────────────────────────────

export interface ColorPreset {
	label: string;
	value: string;
}

// ─── Bubble Menu ────────────────────────────────────────────────────────────

export type BubbleMenuContext = 'text' | 'image' | 'table' | 'link';
