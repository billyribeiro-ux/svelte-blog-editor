/**
 * Generate a URL-safe slug from a text string.
 * Lowercases, strips non-alphanumeric characters, and collapses hyphens.
 */
export function generateSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}
