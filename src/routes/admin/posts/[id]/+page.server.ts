import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/client.js';
import { getPost, listCategories, listTags } from '$lib/server/db/queries.js';

export const load: PageServerLoad = async ({ params }) => {
	const post = getPost(db, params.id);

	if (!post) {
		return error(404, 'Post not found');
	}

	const categories = listCategories(db);
	const tags = listTags(db);

	return {
		post,
		categories,
		tags
	};
};
