<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { PostData, PostStatus } from '$lib/editor/types.js';

	let { data } = $props<{
		data: {
			posts: PostData[];
			total: number;
			page: number;
			perPage: number;
			totalPages: number;
			currentStatus: PostStatus | null;
		};
	}>();

	const statusColors: Record<PostStatus, string> = {
		draft: 'oklch(0.7 0.12 85)',
		published: 'oklch(0.7 0.18 145)',
		scheduled: 'oklch(0.7 0.15 250)',
		trashed: 'oklch(0.6 0.15 25)'
	};

	const statusFilters: { label: string; value: PostStatus | '' }[] = [
		{ label: 'All', value: '' },
		{ label: 'Draft', value: 'draft' },
		{ label: 'Published', value: 'published' },
		{ label: 'Scheduled', value: 'scheduled' }
	];

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Posts — Blog Editor</title>
</svelte:head>

<div class="posts-page">
	<header class="page-header">
		<div class="header-left">
			<h1 class="page-title">Posts</h1>
			<span class="post-count">{data.total} total</span>
		</div>
		<a href="/admin/posts/new" class="btn-new-post">
			<Icon name="ph:plus" size={18} />
			New Post
		</a>
	</header>

	<!-- Status Filters -->
	<nav class="status-filters" aria-label="Filter posts by status">
		{#each statusFilters as filter}
			<a
				class="status-filter"
				class:active={data.currentStatus === (filter.value || null)}
				href="/admin/posts{filter.value ? `?status=${filter.value}` : ''}"
			>
				{filter.label}
			</a>
		{/each}
	</nav>

	<!-- Posts Table -->
	{#if data.posts.length > 0}
		<div class="posts-table-wrapper">
			<table class="posts-table">
				<thead>
					<tr>
						<th>Title</th>
						<th>Status</th>
						<th>Date</th>
					</tr>
				</thead>
				<tbody>
					{#each data.posts as post}
						<tr>
							<td>
								<a class="post-title-link" href="/admin/posts/{post.id}">
									{post.title || '(Untitled)'}
								</a>
								<span class="post-slug">/{post.slug}</span>
							</td>
							<td>
								<span class="status-badge" style:color={statusColors[post.status]}>
									{post.status}
								</span>
							</td>
							<td class="post-date">
								{formatDate(post.updatedAt)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.totalPages > 1}
			<nav class="pagination" aria-label="Posts pagination">
				{#each Array.from({ length: data.totalPages }, (_, i) => i + 1) as pageNum}
					<a
						class="pagination-link"
						class:active={pageNum === data.page}
						href="/admin/posts?page={pageNum}{data.currentStatus
							? `&status=${data.currentStatus}`
							: ''}"
					>
						{pageNum}
					</a>
				{/each}
			</nav>
		{/if}
	{:else}
		<div class="empty-state">
			<Icon name="ph:note-blank" size={48} />
			<p>No posts found</p>
			<a href="/admin/posts/new" class="btn-new-post">Create your first post</a>
		</div>
	{/if}
</div>

<style>
	@layer pages {
		.posts-page {
			max-inline-size: 960px;
			margin-inline: auto;
			padding-block: 32px;
			padding-inline: 24px;
		}

		.page-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-block-end: 24px;
		}

		.header-left {
			display: flex;
			align-items: baseline;
			gap: 12px;
		}

		.page-title {
			font-size: 1.5rem;
			font-weight: 700;
			color: var(--color-text, oklch(0.95 0 0));
			margin: 0;
		}

		.post-count {
			font-size: 0.85rem;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
		}

		.btn-new-post {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding-block: 8px;
			padding-inline: 16px;
			background: var(--color-accent, oklch(0.7 0.15 250));
			color: oklch(0.1 0 0);
			border: none;
			border-radius: 8px;
			font-size: 0.875rem;
			font-weight: 600;
			text-decoration: none;
			cursor: pointer;
			transition: background 0.12s ease;

			&:hover {
				background: oklch(0.65 0.17 250);
			}
		}

		/* ─── Status Filters ─────────────────────────────────────── */

		.status-filters {
			display: flex;
			gap: 4px;
			margin-block-end: 20px;
			border-block-end: 1px solid var(--color-border, oklch(0.25 0.02 260));
			padding-block-end: 0;
		}

		.status-filter {
			padding-block: 8px;
			padding-inline: 14px;
			font-size: 0.85rem;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			text-decoration: none;
			border-block-end: 2px solid transparent;
			margin-block-end: -1px;
			transition:
				color 0.12s ease,
				border-color 0.12s ease;

			&:hover {
				color: var(--color-text, oklch(0.95 0 0));
			}

			&.active {
				color: var(--color-accent, oklch(0.7 0.15 250));
				border-block-end-color: var(--color-accent, oklch(0.7 0.15 250));
			}
		}

		/* ─── Table ──────────────────────────────────────────────── */

		.posts-table-wrapper {
			overflow-x: auto;
		}

		.posts-table {
			inline-size: 100%;
			border-collapse: collapse;
		}

		.posts-table th {
			text-align: start;
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
			padding-block: 10px;
			padding-inline: 12px;
			border-block-end: 1px solid var(--color-border, oklch(0.25 0.02 260));
		}

		.posts-table td {
			padding-block: 14px;
			padding-inline: 12px;
			border-block-end: 1px solid var(--color-border, oklch(0.2 0.01 260));
			vertical-align: middle;
		}

		.posts-table tbody tr {
			transition: background 0.08s ease;

			&:hover {
				background: var(--color-hover, oklch(0.15 0.01 260));
			}
		}

		.post-title-link {
			color: var(--color-text, oklch(0.95 0 0));
			text-decoration: none;
			font-weight: 500;
			font-size: 0.95rem;

			&:hover {
				color: var(--color-accent, oklch(0.7 0.15 250));
			}
		}

		.post-slug {
			display: block;
			font-size: 0.75rem;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
			margin-block-start: 2px;
		}

		.status-badge {
			font-size: 0.8rem;
			font-weight: 600;
			text-transform: capitalize;
		}

		.post-date {
			font-size: 0.85rem;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			white-space: nowrap;
		}

		/* ─── Pagination ─────────────────────────────────────────── */

		.pagination {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
			margin-block-start: 24px;
		}

		.pagination-link {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-inline-size: 36px;
			block-size: 36px;
			border-radius: 6px;
			font-size: 0.85rem;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			text-decoration: none;
			transition:
				background 0.1s ease,
				color 0.1s ease;

			&:hover {
				background: var(--color-hover, oklch(0.2 0.01 260));
				color: var(--color-text, oklch(0.95 0 0));
			}

			&.active {
				background: var(--color-accent, oklch(0.7 0.15 250));
				color: oklch(0.1 0 0);
				font-weight: 600;
			}
		}

		/* ─── Empty State ────────────────────────────────────────── */

		.empty-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 12px;
			padding-block: 64px;
			color: var(--color-text-muted, oklch(0.5 0.02 260));
			text-align: center;
		}
	}
</style>
