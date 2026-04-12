import { expect, test } from '@playwright/test';

test.describe('Posts List Page', () => {
	test('loads post list with table and filters', async ({ page }) => {
		await page.goto('/admin/posts');
		await expect(page.locator('h1')).toHaveText('Posts');
		await expect(page.locator('.posts-table')).toBeVisible();
		await expect(page.locator('.status-filter').first()).toBeVisible();
		await expect(page.locator('.btn-new-post')).toBeVisible();
	});

	test('status filter tabs are clickable', async ({ page }) => {
		await page.goto('/admin/posts');
		const draftTab = page.locator('.status-filter', { hasText: 'Draft' });
		await expect(draftTab).toBeVisible();
		await draftTab.click();
		await expect(page).toHaveURL(/status=draft/);
	});

	test('can navigate to a post editor', async ({ page }) => {
		await page.goto('/admin/posts');
		const firstLink = page.locator('.post-title-link').first();
		await expect(firstLink).toBeVisible();
		await firstLink.click();
		await expect(page.locator('.title-input')).toBeVisible();
	});
});

test.describe('Post Editor Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/admin/posts');
		const firstLink = page.locator('.post-title-link').first();
		await firstLink.click();
		await page.waitForSelector('.title-input');
	});

	/* ─── Title & Slug ───────────────────────────────────────────── */

	test('title input exists and is editable', async ({ page }) => {
		const titleInput = page.locator('.title-input');
		await expect(titleInput).toBeVisible();

		/* Wait for hydration then clear and type */
		await page.waitForTimeout(300);
		await titleInput.click();
		await titleInput.press('Meta+a');
		await titleInput.pressSequentially('Test Title', { delay: 20 });

		await page.waitForTimeout(100);
		const currentValue = await titleInput.inputValue();
		expect(currentValue).toBe('Test Title');
	});

	test('slug auto-generates from title when unlocked', async ({ page }) => {
		const slugLock = page.locator('.slug-lock');
		await expect(slugLock).toBeVisible();
		await page.waitForTimeout(300);

		const titleInput = page.locator('.title-input');
		const slugInput = page.locator('.slug-input');

		/* Click unlock until tooltip says "auto-generates" (unlocked state) */
		let lockTitle = await slugLock.getAttribute('title');
		if (lockTitle && lockTitle.includes('locked')) {
			await slugLock.click();
			await page.waitForTimeout(100);
		}

		/* Verify unlocked: title should now say "auto-generates" */
		lockTitle = await slugLock.getAttribute('title');
		expect(lockTitle).toContain('auto-generates');

		/* Type a new title — slug should follow */
		await titleInput.click();
		await titleInput.press('Meta+a');
		await titleInput.pressSequentially('My Test Post Title', { delay: 20 });

		await page.waitForTimeout(300);
		const slugValue = await slugInput.inputValue();
		expect(slugValue).toContain('my-test-post-title');
	});

	/* ─── Toolbar ────────────────────────────────────────────────── */

	test('toolbar is visible with all groups', async ({ page }) => {
		const toolbar = page.locator('.toolbar');
		await expect(toolbar).toBeVisible();

		/* Check separator count — should have multiple groups */
		const separators = toolbar.locator('.toolbar-separator');
		expect(await separators.count()).toBeGreaterThanOrEqual(5);
	});

	test('toolbar buttons have title tooltips', async ({ page }) => {
		const boldBtn = page.locator('.toolbar-btn[title*="Bold"]');
		await expect(boldBtn).toBeVisible();
		await expect(boldBtn).toHaveAttribute('title', /Bold/);

		const undoBtn = page.locator('.toolbar-btn[title*="Undo"]');
		await expect(undoBtn).toBeVisible();
		await expect(undoBtn).toHaveAttribute('title', /⌘Z/);
	});

	test('heading buttons toggle headings', async ({ page }) => {
		const h1Btn = page.locator('.toolbar-btn[title*="Heading 1"]');
		await expect(h1Btn).toBeVisible();

		/* Click the editor first to focus */
		await page.locator('.ProseMirror').click();
		await h1Btn.click();

		/* The button should now be active */
		await expect(h1Btn).toHaveClass(/active/);
	});

	test('bold button toggles bold', async ({ page }) => {
		const boldBtn = page.locator('.toolbar-btn[title*="Bold"]');
		await page.locator('.ProseMirror').click();

		/* Type some text */
		await page.keyboard.type('test text');
		await page.keyboard.down('Shift');
		for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
		await page.keyboard.up('Shift');

		/* Toggle bold */
		await boldBtn.click();
		await expect(boldBtn).toHaveClass(/active/);
	});

	/* ─── Editor Content ─────────────────────────────────────────── */

	test('editor is visible and editable', async ({ page }) => {
		const editor = page.locator('.ProseMirror');
		await expect(editor).toBeVisible();
		await expect(editor).toHaveAttribute('contenteditable', 'true');
	});

	test('can type in the editor', async ({ page }) => {
		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('E2E test paragraph');
		await expect(editor).toContainText('E2E test paragraph');
	});

	/* ─── Slash Commands ─────────────────────────────────────────── */

	test('slash command menu opens on / and closes after selection', async ({ page }) => {
		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');

		/* Type slash to trigger menu */
		await page.keyboard.type('/');
		const menu = page.locator('.slash-menu');
		await expect(menu).toBeVisible();

		/* Select Heading 1 */
		const h1Item = menu.locator('.slash-item', { hasText: 'Heading 1' });
		await h1Item.click();

		/* Menu should close */
		await expect(menu).not.toBeVisible();
	});

	test('slash command filters by query', async ({ page }) => {
		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');

		await page.keyboard.type('/quote');
		const menu = page.locator('.slash-menu');
		await expect(menu).toBeVisible();

		const items = menu.locator('.slash-item');
		expect(await items.count()).toBeGreaterThanOrEqual(1);
		await expect(items.first()).toContainText(/Blockquote/i);
	});

	/* ─── Sidebar Panels ─────────────────────────────────────────── */

	test('publish panel is visible with status dropdown', async ({ page }) => {
		const panel = page.locator('.panel-title', { hasText: 'Publish' });
		await expect(panel).toBeVisible();
		const statusSelect = page.locator('#post-status');
		await expect(statusSelect).toBeVisible();
	});

	test('category panel shows hierarchical checkboxes', async ({ page }) => {
		const panel = page.locator('.panel-title', { hasText: 'Categories' });
		await expect(panel).toBeVisible();

		const categoryItems = page.locator('.category-item');
		expect(await categoryItems.count()).toBeGreaterThanOrEqual(1);
	});

	test('tag panel with autocomplete input', async ({ page }) => {
		const panel = page.locator('.panel-title', { hasText: 'Tags' });
		await expect(panel).toBeVisible();

		const tagInput = page.locator('input[placeholder="Add tag, press Enter"]');
		await expect(tagInput).toBeVisible();
	});

	test('featured image panel exists', async ({ page }) => {
		const panel = page.locator('.panel-title', { hasText: 'Featured Image' });
		await expect(panel).toBeVisible();
	});

	/* ─── SEO Panel ──────────────────────────────────────────────── */

	test('SEO panel has meta title, description, and focus keyword', async ({ page }) => {
		const seoPanel = page.locator('.panel-title', { hasText: 'SEO' });
		await expect(seoPanel).toBeVisible();

		await expect(page.locator('#seo-title')).toBeVisible();
		await expect(page.locator('#seo-desc')).toBeVisible();
		await expect(page.locator('#seo-keyword')).toBeVisible();
	});

	test('focus keyword analysis appears when keyword is entered', async ({ page }) => {
		const keywordInput = page.locator('#seo-keyword');
		await keywordInput.click();
		await keywordInput.fill('');
		await keywordInput.pressSequentially('welcome', { delay: 30 });

		/* Wait for Svelte reactivity */
		await page.waitForTimeout(500);

		const checks = page.locator('li.keyword-check');
		await expect(checks.first()).toBeVisible({ timeout: 5000 });
		expect(await checks.count()).toBe(4);
	});

	/* ─── Status Bar ─────────────────────────────────────────────── */

	test('status bar shows word count and reading time', async ({ page }) => {
		const statusBar = page.locator('.status-bar');
		await expect(statusBar).toBeVisible();
		await expect(statusBar).toContainText(/word/i);
		await expect(statusBar).toContainText(/character/i);
		await expect(statusBar).toContainText(/min read/i);
	});

	/* ─── Save ───────────────────────────────────────────────────── */

	test('save draft button exists and is clickable', async ({ page }) => {
		const saveBtn = page.locator('.btn-secondary', { hasText: /Save Draft/i });
		await expect(saveBtn).toBeVisible();
		await expect(saveBtn).toBeEnabled();
	});

	test('publish button exists', async ({ page }) => {
		const publishBtn = page.locator('.btn-primary', { hasText: /Publish|Update/i });
		await expect(publishBtn).toBeVisible();
	});

	/* ─── Bubble Menu ────────────────────────────────────────────── */

	test('bubble menu appears on text selection', async ({ page }) => {
		const editor = page.locator('.ProseMirror');
		await editor.click();

		/* Select some text using keyboard */
		await page.keyboard.press('Home');
		await page.keyboard.down('Shift');
		await page.keyboard.press('End');
		await page.keyboard.up('Shift');

		const bubble = page.locator('.bubble-menu');
		/* Bubble buttons should have title tooltips */
		const boldBubble = bubble.locator('.bubble-btn[title="Bold"]');
		await expect(boldBubble).toBeVisible({ timeout: 3000 });
	});

	/* ─── Keyboard Shortcuts ─────────────────────────────────────── */

	test('Cmd+B toggles bold', async ({ page }) => {
		const editor = page.locator('.ProseMirror');
		await editor.click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('bold test');

		/* Select 'test' */
		await page.keyboard.down('Shift');
		for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
		await page.keyboard.up('Shift');

		await page.keyboard.press('Meta+b');

		/* Check bold button is now active */
		const boldBtn = page.locator('.toolbar-btn[title*="Bold"]');
		await expect(boldBtn).toHaveClass(/active/);
	});
});
