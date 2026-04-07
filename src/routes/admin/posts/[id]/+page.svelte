<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import BlogEditor from '$lib/editor/BlogEditor.svelte';
	import MediaModal from '$lib/editor/MediaModal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Editor, JSONContent } from '@tiptap/core';
	import type { PostData, PostStatus, CategoryRow, TagRow } from '$lib/editor/types.js';

	let { data } = $props<{
		data: {
			post: PostData;
			categories: CategoryRow[];
			tags: TagRow[];
		};
	}>();

	/* ─── State ─────────────────────────────────────────────────── */

	let title = $state(data.post.title);
	let slug = $state(data.post.slug);
	let slugManuallyEdited = $state(true);
	let status = $state<PostStatus>(data.post.status);
	let publishedAt = $state(data.post.publishedAt ?? '');
	let excerpt = $state(data.post.excerpt);
	let featuredImage = $state(data.post.featuredImage);
	let selectedCategories = $state<string[]>([...data.post.categories]);
	let selectedTags = $state<string[]>([...data.post.tags]);
	let tagInput = $state('');

	/* SEO */
	let seoMetaTitle = $state(data.post.seo.metaTitle);
	let seoMetaDescription = $state(data.post.seo.metaDescription);
	let seoFocusKeyword = $state(data.post.seo.focusKeyword);

	/* Editor */
	let editor = $state<Editor | null>(null);
	let saving = $state(false);
	let lastSavedAt = $state('');
	let hasUnsavedChanges = $state(false);
	let featuredImageModalOpen = $state(false);

	let seoMetaTitleLength = $derived(seoMetaTitle.length);
	let seoMetaDescLength = $derived(seoMetaDescription.length);

	/* ─── Slug generation ───────────────────────────────────────── */

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
		hasUnsavedChanges = true;
	}

	function handleSlugInput(): void {
		slugManuallyEdited = true;
		slug = generateSlug(slug);
		hasUnsavedChanges = true;
	}

	/* ─── Category toggle ───────────────────────────────────────── */

	function toggleCategory(catId: string): void {
		if (selectedCategories.includes(catId)) {
			selectedCategories = selectedCategories.filter((c) => c !== catId);
		} else {
			selectedCategories = [...selectedCategories, catId];
		}
		hasUnsavedChanges = true;
	}

	/* ─── Tag input ─────────────────────────────────────────────── */

	function handleTagKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			const name = tagInput.trim();
			if (!name) return;

			const existing = data.tags.find(
				(t) => t.name.toLowerCase() === name.toLowerCase()
			);
			const tagId = existing?.id ?? name;

			if (!selectedTags.includes(tagId)) {
				selectedTags = [...selectedTags, tagId];
			}
			tagInput = '';
			hasUnsavedChanges = true;
		}
	}

	function removeTag(tagId: string): void {
		selectedTags = selectedTags.filter((t) => t !== tagId);
		hasUnsavedChanges = true;
	}

	function getTagName(tagId: string): string {
		const tag = data.tags.find((t) => t.id === tagId);
		return tag?.name ?? tagId;
	}

	/* ─── Save ──────────────────────────────────────────────────── */

	async function save(newStatus?: PostStatus): Promise<void> {
		if (saving) return;
		saving = true;

		const currentStatus = newStatus ?? status;
		const content: JSONContent = editor?.getJSON() ?? data.post.content;

		try {
			const response = await fetch(`/api/editor/posts/${data.post.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					slug,
					content,
					excerpt,
					featuredImage,
					categories: selectedCategories,
					tags: selectedTags,
					status: currentStatus,
					publishedAt:
						currentStatus === 'published' && !publishedAt
							? new Date().toISOString()
							: publishedAt || null,
					seo: {
						metaTitle: seoMetaTitle,
						metaDescription: seoMetaDescription,
						focusKeyword: seoFocusKeyword
					}
				})
			});

			if (response.ok) {
				if (newStatus) status = currentStatus;
				hasUnsavedChanges = false;
				lastSavedAt = new Date().toLocaleTimeString();
			}
		} finally {
			saving = false;
		}
	}

	function handleEditorUpdate(): void {
		hasUnsavedChanges = true;
	}

	function handleEditorSave(): void {
		save();
	}

	/* ─── Auto-save every 30s ───────────────────────────────────── */

	let autoSaveTimer: ReturnType<typeof setInterval>;

	onMount(() => {
		autoSaveTimer = setInterval(() => {
			if (hasUnsavedChanges && !saving) {
				save();
			}
		}, 30_000);
	});

	onDestroy(() => {
		clearInterval(autoSaveTimer);
	});

	/* ─── Unsaved changes warning ───────────────────────────────── */

	beforeNavigate(({ cancel }) => {
		if (hasUnsavedChanges) {
			if (!confirm('You have unsaved changes. Leave anyway?')) {
				cancel();
			}
		}
	});
</script>

<svelte:head>
	<title>{title || 'Edit Post'} — Blog Editor</title>
</svelte:head>

<div class="editor-page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-left">
			<a href="/admin/posts" class="back-link">
				<Icon name="ph:arrow-left" size={18} />
				Posts
			</a>
			{#if lastSavedAt}
				<span class="save-indicator">Saved at {lastSavedAt}</span>
			{/if}
			{#if hasUnsavedChanges}
				<span class="unsaved-indicator">Unsaved changes</span>
			{/if}
		</div>
		<div class="header-actions">
			<button class="btn btn-secondary" type="button" disabled={saving} onclick={() => save()}>
				{saving ? 'Saving...' : 'Save Draft'}
			</button>
			<button class="btn btn-primary" type="button" disabled={saving} onclick={() => save('published')}>
				{status === 'published' ? 'Update' : 'Publish'}
			</button>
		</div>
	</header>

	<div class="editor-layout">
		<!-- Main Content -->
		<main class="editor-main">
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
				content={data.post.content}
				editable={true}
				onUpdate={handleEditorUpdate}
				onSave={handleEditorSave}
				bind:editor
			/>
		</main>

		<!-- Sidebar -->
		<aside class="editor-sidebar">
			<!-- Publish Panel -->
			<section class="sidebar-panel">
				<h3 class="panel-title">
					<Icon name="ph:paper-plane-tilt" size={16} />
					Publish
				</h3>
				<div class="panel-body">
					<div class="field">
						<label class="field-label" for="post-status">Status</label>
						<select id="post-status" class="field-select" bind:value={status} onchange={() => { hasUnsavedChanges = true; }}>
							<option value="draft">Draft</option>
							<option value="published">Published</option>
							<option value="scheduled">Scheduled</option>
						</select>
					</div>
					{#if status === 'scheduled' || status === 'published'}
						<div class="field">
							<label class="field-label" for="post-published-at">Publish Date</label>
							<input
								id="post-published-at"
								class="field-input"
								type="datetime-local"
								bind:value={publishedAt}
								onchange={() => { hasUnsavedChanges = true; }}
							/>
						</div>
					{/if}
				</div>
			</section>

			<!-- Categories -->
			<section class="sidebar-panel">
				<h3 class="panel-title">
					<Icon name="ph:folders" size={16} />
					Categories
				</h3>
				<div class="panel-body category-list">
					{#each data.categories as category}
						<label class="category-item">
							<input
								type="checkbox"
								checked={selectedCategories.includes(category.id)}
								onchange={() => toggleCategory(category.id)}
							/>
							{category.name}
						</label>
					{/each}
				</div>
			</section>

			<!-- Tags -->
			<section class="sidebar-panel">
				<h3 class="panel-title">
					<Icon name="ph:tag" size={16} />
					Tags
				</h3>
				<div class="panel-body">
					<input
						class="field-input"
						type="text"
						placeholder="Add tag, press Enter"
						bind:value={tagInput}
						onkeydown={handleTagKeydown}
					/>
					{#if selectedTags.length > 0}
						<div class="tag-list">
							{#each selectedTags as tagId}
								<span class="tag-chip">
									{getTagName(tagId)}
									<button
										class="tag-remove"
										type="button"
										aria-label="Remove tag"
										onclick={() => removeTag(tagId)}
									>×</button>
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</section>

			<!-- Featured Image -->
			<section class="sidebar-panel">
				<h3 class="panel-title">
					<Icon name="ph:image" size={16} />
					Featured Image
				</h3>
				<div class="panel-body">
					{#if featuredImage}
						<img src={featuredImage} alt="Featured" class="featured-preview" />
						<button class="btn-remove-featured" type="button" onclick={() => { featuredImage = ''; hasUnsavedChanges = true; }}>
							Remove
						</button>
					{:else}
						<button class="btn-set-featured" type="button" onclick={() => { featuredImageModalOpen = true; }}>
							<Icon name="ph:plus" size={16} />
							Set Featured Image
						</button>
					{/if}
				</div>
			</section>

			<!-- Excerpt -->
			<section class="sidebar-panel">
				<h3 class="panel-title">
					<Icon name="ph:article" size={16} />
					Excerpt
				</h3>
				<div class="panel-body">
					<textarea
						class="field-textarea"
						rows={3}
						placeholder="Write a short excerpt..."
						bind:value={excerpt}
						oninput={() => { hasUnsavedChanges = true; }}
					></textarea>
				</div>
			</section>

			<!-- SEO -->
			<section class="sidebar-panel">
				<h3 class="panel-title">
					<Icon name="ph:magnifying-glass" size={16} />
					SEO
				</h3>
				<div class="panel-body">
					<div class="field">
						<label class="field-label" for="seo-title">
							Meta Title
							<span class="char-count" class:warning={seoMetaTitleLength > 60}>
								{seoMetaTitleLength}/60
							</span>
						</label>
						<input
							id="seo-title"
							class="field-input"
							type="text"
							placeholder="SEO title"
							bind:value={seoMetaTitle}
							oninput={() => { hasUnsavedChanges = true; }}
						/>
					</div>
					<div class="field">
						<label class="field-label" for="seo-desc">
							Meta Description
							<span class="char-count" class:warning={seoMetaDescLength > 160}>
								{seoMetaDescLength}/160
							</span>
						</label>
						<textarea
							id="seo-desc"
							class="field-textarea"
							rows={3}
							placeholder="SEO description"
							bind:value={seoMetaDescription}
							oninput={() => { hasUnsavedChanges = true; }}
						></textarea>
					</div>
					<div class="field">
						<label class="field-label" for="seo-keyword">Focus Keyword</label>
						<input
							id="seo-keyword"
							class="field-input"
							type="text"
							placeholder="Primary keyword"
							bind:value={seoFocusKeyword}
							oninput={() => { hasUnsavedChanges = true; }}
						/>
					</div>
				</div>
			</section>
		</aside>
	</div>

	<MediaModal bind:open={featuredImageModalOpen} {editor} />
</div>

<style>
	@layer pages {
		.editor-page {
			min-block-size: 100dvh;
			display: flex;
			flex-direction: column;
		}

		/* ─── Header ─────────────────────────────────────────────── */

		.page-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-block: 12px;
			padding-inline: 24px;
			border-block-end: 1px solid var(--color-border, oklch(0.25 0.02 260));
			background: var(--color-surface, oklch(0.13 0.01 260));
			position: sticky;
			inset-block-start: 0;
			z-index: 200;
		}

		.header-left {
			display: flex;
			align-items: center;
			gap: 16px;
		}

		.back-link {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			text-decoration: none;
			font-size: 0.85rem;

			&:hover {
				color: var(--color-accent, oklch(0.7 0.15 250));
			}
		}

		.save-indicator {
			font-size: 0.75rem;
			color: oklch(0.65 0.15 145);
		}

		.unsaved-indicator {
			font-size: 0.75rem;
			color: oklch(0.7 0.15 55);
		}

		.header-actions {
			display: flex;
			gap: 8px;
		}

		/* ─── Layout ─────────────────────────────────────────────── */

		.editor-layout {
			display: grid;
			grid-template-columns: 1fr 320px;
			gap: 0;
			flex: 1;

			@media (max-width: 900px) {
				grid-template-columns: 1fr;
			}
		}

		.editor-main {
			padding-block: 24px;
			padding-inline: 32px;
			overflow-y: auto;
		}

		.editor-sidebar {
			border-inline-start: 1px solid var(--color-border, oklch(0.25 0.02 260));
			overflow-y: auto;
			max-block-size: calc(100dvh - 56px);
			position: sticky;
			inset-block-start: 56px;

			@media (max-width: 900px) {
				border-inline-start: none;
				border-block-start: 1px solid var(--color-border, oklch(0.25 0.02 260));
				max-block-size: none;
				position: static;
			}
		}

		/* ─── Title ──────────────────────────────────────────────── */

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

			&:focus {
				color: var(--color-text, oklch(0.85 0 0));
			}
		}

		/* ─── Sidebar Panels ─────────────────────────────────────── */

		.sidebar-panel {
			border-block-end: 1px solid var(--color-border, oklch(0.2 0.01 260));
		}

		.panel-title {
			display: flex;
			align-items: center;
			gap: 8px;
			margin: 0;
			padding-block: 12px;
			padding-inline: 16px;
			font-size: 0.8rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			background: var(--color-surface, oklch(0.12 0.005 260));
		}

		.panel-body {
			padding-block: 12px;
			padding-inline: 16px;
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		/* ─── Fields ─────────────────────────────────────────────── */

		.field {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.field-label {
			font-size: 0.78rem;
			font-weight: 500;
			color: var(--color-text-secondary, oklch(0.75 0.02 260));
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		.field-input,
		.field-textarea,
		.field-select {
			padding-block: 6px;
			padding-inline: 10px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 6px;
			background: var(--color-surface, oklch(0.13 0.01 260));
			color: var(--color-text, oklch(0.9 0 0));
			font-size: 0.825rem;
			font-family: inherit;

			&:focus {
				outline: none;
				border-color: var(--color-accent, oklch(0.7 0.15 250));
				box-shadow: 0 0 0 2px oklch(0.7 0.15 250 / 0.15);
			}
		}

		.field-textarea {
			resize: vertical;
			min-block-size: 40px;
		}

		.char-count {
			font-size: 0.7rem;
			font-weight: 400;
			color: var(--color-text-muted, oklch(0.5 0.02 260));

			&.warning {
				color: oklch(0.65 0.2 25);
			}
		}

		/* ─── Categories ─────────────────────────────────────────── */

		.category-list {
			max-block-size: 180px;
			overflow-y: auto;
		}

		.category-item {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 0.825rem;
			color: var(--color-text, oklch(0.85 0 0));
			cursor: pointer;
			padding-block: 2px;

			& input[type='checkbox'] {
				accent-color: var(--color-accent, oklch(0.7 0.15 250));
			}
		}

		/* ─── Tags ───────────────────────────────────────────────── */

		.tag-list {
			display: flex;
			flex-wrap: wrap;
			gap: 4px;
			margin-block-start: 4px;
		}

		.tag-chip {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			padding-block: 2px;
			padding-inline: 8px;
			background: var(--color-surface-elevated, oklch(0.22 0.01 260));
			border-radius: 4px;
			font-size: 0.75rem;
			color: var(--color-text, oklch(0.85 0 0));
		}

		.tag-remove {
			background: none;
			border: none;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
			cursor: pointer;
			padding: 0;
			font-size: 1rem;
			line-height: 1;

			&:hover {
				color: oklch(0.7 0.18 25);
			}
		}

		/* ─── Featured Image ─────────────────────────────────────── */

		.featured-preview {
			max-inline-size: 100%;
			border-radius: 6px;
			display: block;
		}

		.btn-remove-featured {
			background: none;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 4px;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			padding-block: 4px;
			padding-inline: 10px;
			font-size: 0.78rem;
			cursor: pointer;

			&:hover {
				color: oklch(0.7 0.18 25);
				border-color: oklch(0.5 0.15 25);
			}
		}

		.btn-set-featured {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			background: none;
			border: 2px dashed var(--color-border, oklch(0.3 0.02 260));
			border-radius: 8px;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
			padding-block: 20px;
			padding-inline: 16px;
			font-size: 0.825rem;
			cursor: pointer;
			inline-size: 100%;
			justify-content: center;
			transition: border-color 0.12s ease, color 0.12s ease;

			&:hover {
				border-color: var(--color-accent, oklch(0.7 0.15 250));
				color: var(--color-accent, oklch(0.7 0.15 250));
			}
		}
	}
</style>
