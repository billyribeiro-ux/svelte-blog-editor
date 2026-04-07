import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { listPosts, listCategories, listTags } from '$lib/server/db/queries.js';
import type { PostStatus } from '$lib/editor/types.js';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const status = url.searchParams.get('status') as PostStatus | null;

	const postsResult = listPosts(db, {
		page,
		perPage: 20,
		status: status || undefined
	});

	const categories = listCategories(db);
	const tags = listTags(db);

	return {
		...postsResult,
		categories,
		tags,
		currentStatus: status
	};
};
