import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/client.js';
import { listPosts, createPost } from '$lib/server/db/queries.js';
import type { PostPayload, PostStatus } from '$lib/editor/types.js';

/**
 * GET /api/editor/posts
 * List posts with pagination and optional status filter.
 * Query params: page (default 1), perPage (default 20), status (optional).
 */
export const GET: RequestHandler = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('perPage') || '20', 10)));
	const status = url.searchParams.get('status') as PostStatus | null;

	const result = listPosts(db, {
		page,
		perPage,
		status: status || undefined
	});

	return json(result);
};

/**
 * POST /api/editor/posts
 * Create a new post.
 */
export const POST: RequestHandler = async ({ request }) => {
	let payload: PostPayload;

	try {
		payload = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	if (!payload.title?.trim()) {
		return error(400, 'Title is required');
	}

	if (!payload.slug?.trim()) {
		return error(400, 'Slug is required');
	}

	try {
		const post = createPost(db, payload);
		return json(post, { status: 201 });
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
			return error(409, 'A post with this slug already exists');
		}
		console.error('Error creating post:', err);
		return error(500, 'Failed to create post');
	}
};
