import type Database from 'better-sqlite3';
import type {
	PostRow,
	PostData,
	PostPayload,
	CategoryRow,
	TagRow,
	MediaRow,
	PostListParams,
	PostListResponse
} from '$lib/editor/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface PostRowWithRelations extends PostRow {
	category_ids: string | null;
	tag_ids: string | null;
}

function rowToPostData(row: PostRow, db: Database.Database): PostData {
	const categories = db
		.prepare(
			`SELECT c.id FROM categories c
			 INNER JOIN post_categories pc ON pc.category_id = c.id
			 WHERE pc.post_id = ?`
		)
		.all(row.id) as { id: string }[];

	const tags = db
		.prepare(
			`SELECT t.id FROM tags t
			 INNER JOIN post_tags pt ON pt.tag_id = t.id
			 WHERE pt.post_id = ?`
		)
		.all(row.id) as { id: string }[];

	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		content: JSON.parse(row.content),
		excerpt: row.excerpt,
		featuredImage: row.featured_image_url,
		categories: categories.map((c) => c.id),
		tags: tags.map((t) => t.id),
		status: row.status,
		authorId: row.author_id,
		publishedAt: row.published_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		seo: {
			metaTitle: row.seo_meta_title,
			metaDescription: row.seo_meta_description,
			focusKeyword: row.seo_focus_keyword
		}
	};
}

/** Convert a joined row (with GROUP_CONCAT'd ids) to PostData — avoids N+1 */
function joinedRowToPostData(row: PostRowWithRelations): PostData {
	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		content: JSON.parse(row.content),
		excerpt: row.excerpt,
		featuredImage: row.featured_image_url,
		categories: row.category_ids ? row.category_ids.split(',') : [],
		tags: row.tag_ids ? row.tag_ids.split(',') : [],
		status: row.status,
		authorId: row.author_id,
		publishedAt: row.published_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		seo: {
			metaTitle: row.seo_meta_title,
			metaDescription: row.seo_meta_description,
			focusKeyword: row.seo_focus_keyword
		}
	};
}

// ─── Posts ──────────────────────────────────────────────────────────────────

/** List posts with pagination and optional status filter (single query with JOINs) */
export function listPosts(db: Database.Database, params: PostListParams): PostListResponse {
	const { page, perPage, status } = params;
	const offset = (page - 1) * perPage;

	const whereClause = status ? 'WHERE p.status = ?' : 'WHERE p.status != ?';
	const filterParam = status ?? 'trashed';

	const { total } = db
		.prepare(`SELECT COUNT(*) as total FROM posts p ${whereClause}`)
		.get(filterParam) as { total: number };

	const rows = db
		.prepare(
			`SELECT p.*,
				GROUP_CONCAT(DISTINCT pc.category_id) AS category_ids,
				GROUP_CONCAT(DISTINCT pt.tag_id) AS tag_ids
			 FROM posts p
			 LEFT JOIN post_categories pc ON pc.post_id = p.id
			 LEFT JOIN post_tags pt ON pt.post_id = p.id
			 ${whereClause}
			 GROUP BY p.id
			 ORDER BY p.updated_at DESC
			 LIMIT ? OFFSET ?`
		)
		.all(filterParam, perPage, offset) as PostRowWithRelations[];

	return {
		posts: rows.map(joinedRowToPostData),
		total,
		page,
		perPage,
		totalPages: Math.ceil(total / perPage)
	};
}

/** Get a single post by ID */
export function getPost(db: Database.Database, id: string): PostData | null {
	const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostRow | undefined;
	if (!row) return null;
	return rowToPostData(row, db);
}

/** Get a single post by slug */
export function getPostBySlug(db: Database.Database, slug: string): PostData | null {
	const row = db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug) as PostRow | undefined;
	if (!row) return null;
	return rowToPostData(row, db);
}

/** Create a new post */
export function createPost(db: Database.Database, payload: PostPayload): PostData {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	const tx = db.transaction(() => {
		db.prepare(
			`INSERT INTO posts (id, title, slug, content, excerpt, featured_image_url, status, author_id, published_at, created_at, updated_at, seo_meta_title, seo_meta_description, seo_focus_keyword)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			payload.title,
			payload.slug,
			JSON.stringify(payload.content),
			payload.excerpt,
			payload.featuredImage,
			payload.status,
			'admin',
			payload.publishedAt,
			now,
			now,
			payload.seo.metaTitle,
			payload.seo.metaDescription,
			payload.seo.focusKeyword
		);

		syncPostCategories(db, id, payload.categories);
		syncPostTags(db, id, payload.tags);
	});
	tx();

	return getPost(db, id)!;
}

/** Update an existing post */
export function updatePost(
	db: Database.Database,
	id: string,
	payload: PostPayload
): PostData | null {
	const now = new Date().toISOString();

	let changes = 0;
	const tx = db.transaction(() => {
		const result = db
			.prepare(
				`UPDATE posts SET
				title = ?, slug = ?, content = ?, excerpt = ?, featured_image_url = ?,
				status = ?, published_at = ?, updated_at = ?,
				seo_meta_title = ?, seo_meta_description = ?, seo_focus_keyword = ?
			 WHERE id = ?`
			)
			.run(
				payload.title,
				payload.slug,
				JSON.stringify(payload.content),
				payload.excerpt,
				payload.featuredImage,
				payload.status,
				payload.publishedAt,
				now,
				payload.seo.metaTitle,
				payload.seo.metaDescription,
				payload.seo.focusKeyword,
				id
			);
		changes = result.changes;
		if (changes === 0) return;

		syncPostCategories(db, id, payload.categories);
		syncPostTags(db, id, payload.tags);
	});
	tx();

	if (changes === 0) return null;
	return getPost(db, id);
}

/** Soft-delete a post (set status to 'trashed') */
export function deletePost(db: Database.Database, id: string): boolean {
	const result = db
		.prepare("UPDATE posts SET status = 'trashed', updated_at = ? WHERE id = ?")
		.run(new Date().toISOString(), id);
	return result.changes > 0;
}

// ─── Post Relations ─────────────────────────────────────────────────────────

function syncPostCategories(db: Database.Database, postId: string, categoryIds: string[]): void {
	db.prepare('DELETE FROM post_categories WHERE post_id = ?').run(postId);
	const insert = db.prepare('INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)');
	for (const catId of categoryIds) {
		insert.run(postId, catId);
	}
}

function syncPostTags(db: Database.Database, postId: string, tagIds: string[]): void {
	db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId);
	const insert = db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)');
	for (const tagId of tagIds) {
		insert.run(postId, tagId);
	}
}

// ─── Categories ─────────────────────────────────────────────────────────────

/** List all categories */
export function listCategories(db: Database.Database): CategoryRow[] {
	return db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as CategoryRow[];
}

/** Create a category */
export function createCategory(
	db: Database.Database,
	name: string,
	slug: string,
	description = '',
	parentId: string | null = null
): CategoryRow {
	const id = crypto.randomUUID();
	db.prepare(
		'INSERT INTO categories (id, name, slug, description, parent_id) VALUES (?, ?, ?, ?, ?)'
	).run(id, name, slug, description, parentId);
	return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow;
}

// ─── Tags ───────────────────────────────────────────────────────────────────

/** List all tags */
export function listTags(db: Database.Database): TagRow[] {
	return db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as TagRow[];
}

/** Create a tag */
export function createTag(db: Database.Database, name: string, slug: string): TagRow {
	const id = crypto.randomUUID();
	db.prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)').run(id, name, slug);
	return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as TagRow;
}

/** Find or create a tag by name */
export function findOrCreateTag(db: Database.Database, name: string): TagRow {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	const existing = db.prepare('SELECT * FROM tags WHERE slug = ?').get(slug) as TagRow | undefined;
	if (existing) return existing;
	return createTag(db, name, slug);
}

// ─── Media ──────────────────────────────────────────────────────────────────

/** Insert a media record */
export function insertMedia(
	db: Database.Database,
	data: Omit<MediaRow, 'id' | 'uploaded_at'>
): MediaRow {
	const id = crypto.randomUUID();
	db.prepare(
		`INSERT INTO media (id, filename, original_name, mime_type, size_bytes, width, height, url, thumbnail_url, medium_url, large_url, alt_text, title, caption, description)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		data.filename,
		data.original_name,
		data.mime_type,
		data.size_bytes,
		data.width,
		data.height,
		data.url,
		data.thumbnail_url,
		data.medium_url,
		data.large_url,
		data.alt_text,
		data.title,
		data.caption,
		data.description
	);
	return db.prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaRow;
}

/** List media with pagination */
export function listMedia(db: Database.Database, limit = 50, offset = 0): MediaRow[] {
	return db
		.prepare('SELECT * FROM media ORDER BY uploaded_at DESC LIMIT ? OFFSET ?')
		.all(limit, offset) as MediaRow[];
}
