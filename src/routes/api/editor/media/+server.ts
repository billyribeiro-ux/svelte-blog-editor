import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/client.js';
import { listMedia } from '$lib/server/db/queries.js';

/**
 * GET /api/editor/media
 * List uploaded media items (newest first).
 */
export const GET: RequestHandler = async ({ url }) => {
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
	const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);
	const items = listMedia(db, limit, offset);
	return json(items);
};
