<script lang="ts">
	import { goto } from '$app/navigation';
	import BlogEditor from '$lib/editor/BlogEditor.svelte';
	import type { Editor, JSONContent } from '@tiptap/core';

	let title = $state('');
	let slug = $state('');
	let slugManuallyEdited = $state(false);
	let saving = $state(false);
	let editor = $state<Editor | null>(null);

	function generateSlug(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	}

	function handleTitleInput(): void {
		if (!slugManuallyEdited) {
			slug = generateSlug(title);
		}
	}

	function handleSlugInput(): void {
		slugManuallyEdited = true;
		slug = generateSlug(slug);
	}

	async function savePost(status: 'draft' | 'published' = 'draft'): Promise<void> {
		if (saving || !title.trim()) return;
		saving = true;

		const content: JSONContent = editor?.getJSON() ?? { type: 'doc', content: [] };

		try {
			const response = await fetch('/api/editor/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					slug: slug || generateSlug(title),
					content,
					excerpt: '',
					featuredImage: '',
					categories: [],
					tags: [],
					status,
					publishedAt: status === 'published' ? new Date().toISOString() : null,
					seo: {
						metaTitle: title,
						metaDescription: '',
						focusKeyword: ''
					}
				})
			});

			if (response.ok) {
				const post = await response.json();
				goto(`/admin/posts/${post.id}`);
			}
		} finally {
			saving = false;
		}
	}

	function handleSave(): void {
		savePost('draft');
	}
</script>

<svelte:head>
	<title>New Post — Blog Editor</title>
</svelte:head>

<div class="new-post-page">
	<header class="page-header">
		<a href="/admin/posts" class="back-link">← Back to Posts</a>
		<div class="header-actions">
			<button class="btn btn-secondary" type="button" disabled={saving} onclick={() => savePost('draft')}>
				Save Draft
			</button>
			<button class="btn btn-primary" type="button" disabled={saving} onclick={() => savePost('published')}>
				Publish
			</button>
		</div>
	</header>

	<div class="title-section">
		<input
			class="title-input"
			type="text"
			placeholder="Post title"
			bind:value={title}
			oninput={handleTitleInput}
		/>
		<div class="slug-row">
			<span class="slug-prefix">/</span>
			<input
				class="slug-input"
				type="text"
				placeholder="post-slug"
				bind:value={slug}
				oninput={handleSlugInput}
			/>
		</div>
	</div>

	<BlogEditor
		content="<p></p>"
		editable={true}
		onSave={handleSave}
		bind:editor
	/>
</div>

<style>
	@layer pages {
		.new-post-page {
			max-inline-size: 960px;
			margin-inline: auto;
			padding-block: 24px;
			padding-inline: 24px;
		}

		.page-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-block-end: 24px;
		}

		.back-link {
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			text-decoration: none;
			font-size: 0.875rem;

			&:hover {
				color: var(--color-accent, oklch(0.7 0.15 250));
			}
		}

		.header-actions {
			display: flex;
			gap: 8px;
		}

		.title-section {
			margin-block-end: 20px;
		}

		.title-input {
			inline-size: 100%;
			border: none;
			background: transparent;
			font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem);
			font-weight: 700;
			color: var(--color-text, oklch(0.95 0 0));
			padding-block: 8px;
			padding-inline: 0;
			outline: none;
			letter-spacing: -0.02em;

			&::placeholder {
				color: var(--color-text-muted, oklch(0.4 0.02 260));
			}
		}

		.slug-row {
			display: flex;
			align-items: center;
			gap: 2px;
			margin-block-start: 4px;
		}

		.slug-prefix {
			color: var(--color-text-muted, oklch(0.5 0.02 260));
			font-size: 0.85rem;
			font-family: var(--font-mono, monospace);
		}

		.slug-input {
			border: none;
			background: transparent;
			font-size: 0.85rem;
			font-family: var(--font-mono, monospace);
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			padding-block: 4px;
			padding-inline: 0;
			outline: none;
			flex: 1;

			&::placeholder {
				color: var(--color-text-muted, oklch(0.35 0.02 260));
			}

			&:focus {
				color: var(--color-text, oklch(0.85 0 0));
			}
		}
	}
</style>
