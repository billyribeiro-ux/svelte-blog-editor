import Database from 'better-sqlite3';

/**
 * SQL migration statements for the blog editor database.
 * Run `migrate(db)` to create all tables.
 */
export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS posts (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL DEFAULT '',
	slug TEXT NOT NULL UNIQUE,
	content TEXT NOT NULL DEFAULT '{}',
	excerpt TEXT NOT NULL DEFAULT '',
	featured_image_url TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'scheduled', 'trashed')),
	author_id TEXT NOT NULL DEFAULT '',
	published_at TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	seo_meta_title TEXT NOT NULL DEFAULT '',
	seo_meta_description TEXT NOT NULL DEFAULT '',
	seo_focus_keyword TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS categories (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	slug TEXT NOT NULL UNIQUE,
	description TEXT NOT NULL DEFAULT '',
	parent_id TEXT,
	FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS post_categories (
	post_id TEXT NOT NULL,
	category_id TEXT NOT NULL,
	PRIMARY KEY (post_id, category_id),
	FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
	FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_tags (
	post_id TEXT NOT NULL,
	tag_id TEXT NOT NULL,
	PRIMARY KEY (post_id, tag_id),
	FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
	FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media (
	id TEXT PRIMARY KEY,
	filename TEXT NOT NULL,
	original_name TEXT NOT NULL,
	mime_type TEXT NOT NULL,
	size_bytes INTEGER NOT NULL,
	width INTEGER NOT NULL DEFAULT 0,
	height INTEGER NOT NULL DEFAULT 0,
	url TEXT NOT NULL,
	thumbnail_url TEXT NOT NULL DEFAULT '',
	medium_url TEXT NOT NULL DEFAULT '',
	large_url TEXT NOT NULL DEFAULT '',
	alt_text TEXT NOT NULL DEFAULT '',
	title TEXT NOT NULL DEFAULT '',
	caption TEXT NOT NULL DEFAULT '',
	description TEXT NOT NULL DEFAULT '',
	uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media(uploaded_at);

CREATE TRIGGER IF NOT EXISTS trg_posts_updated_at
	AFTER UPDATE ON posts
	FOR EACH ROW
	WHEN OLD.updated_at = NEW.updated_at
BEGIN
	UPDATE posts SET updated_at = datetime('now') WHERE id = NEW.id;
END;
`;

/**
 * Run database migrations. Creates all tables if they don't exist.
 */
export function migrate(db: Database.Database): void {
	db.exec('PRAGMA journal_mode=WAL;');
	db.exec('PRAGMA foreign_keys=ON;');
	db.exec(MIGRATION_SQL);
}

/**
 * Seed the database with sample data for development.
 */
export function seed(db: Database.Database): void {
	const hasData = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
	if (hasData.count > 0) return;

	const insertCategory = db.prepare(
		'INSERT INTO categories (id, name, slug, description, parent_id) VALUES (?, ?, ?, ?, ?)'
	);

	const insertTag = db.prepare('INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)');

	const insertPost = db.prepare(
		`INSERT INTO posts (id, title, slug, content, excerpt, status, author_id, seo_meta_title, seo_meta_description)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);

	const tx = db.transaction(() => {
		insertCategory.run(
			crypto.randomUUID(),
			'Uncategorized',
			'uncategorized',
			'Default category',
			null
		);
		insertCategory.run(crypto.randomUUID(), 'Technology', 'technology', 'Tech articles', null);
		insertCategory.run(crypto.randomUUID(), 'Design', 'design', 'Design articles', null);

		insertTag.run(crypto.randomUUID(), 'JavaScript', 'javascript');
		insertTag.run(crypto.randomUUID(), 'TypeScript', 'typescript');
		insertTag.run(crypto.randomUUID(), 'Svelte', 'svelte');
		insertTag.run(crypto.randomUUID(), 'CSS', 'css');

		insertPost.run(
			crypto.randomUUID(),
			'Welcome to the Blog Editor',
			'welcome-to-the-blog-editor',
			JSON.stringify({
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: 'Welcome to the Blog Editor' }]
					},
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Start writing your first blog post using this powerful rich text editor.'
							}
						]
					}
				]
			}),
			'Start writing your first blog post using this powerful rich text editor.',
			'draft',
			'admin',
			'Welcome to the Blog Editor',
			'Start writing your first blog post using this powerful rich text editor.'
		);
	});

	tx();
}
