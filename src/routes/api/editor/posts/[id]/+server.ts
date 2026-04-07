import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { getPost, updatePost, deletePost } from '$lib/server/db/queries.js';
import type { PostPayload } from '$lib/editor/types.js';

/**
 * GET /api/editor/posts/[id]
 * Get a single post by ID.
 */
export const GET: RequestHandler = async ({ params }) => {
	const post = getPost(db, params.id);
	if (!post) {
		return error(404, 'Post not found');
	}
	return json(post);
};

/**
 * PUT /api/editor/posts/[id]
 * Update a post.
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	let payload: PostPayload;

	try {
		payload = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	try {
		const post = updatePost(db, params.id, payload);
		if (!post) {
			return error(404, 'Post not found');
		}
		return json(post);
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
			return error(409, 'A post with this slug already exists');
		}
		console.error('Error updating post:', err);
		return error(500, 'Failed to update post');
	}
};

/**
 * DELETE /api/editor/posts/[id]
 * Soft-delete a post (set status to 'trashed').
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const success = deletePost(db, params.id);
	if (!success) {
		return error(404, 'Post not found');
	}
	return json({ success: true });
};
