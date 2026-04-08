import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/client.js';
import { listPosts } from '$lib/server/db/queries.js';
import type { PostStatus } from '$lib/editor/types.js';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('perPage') || '20', 10)));
	const status = url.searchParams.get('status') as PostStatus | null;

	const postsResult = listPosts(db, {
		page,
		perPage,
		status: status || undefined
	});

	return {
		...postsResult,
		currentStatus: status
	};
};
