import { type Editor } from '@tiptap/core';

/**
 * Common programming languages for the code block selector.
 */
export const CODE_LANGUAGES = [
	{ value: '', label: 'Plain text' },
	{ value: 'html', label: 'HTML' },
	{ value: 'css', label: 'CSS' },
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'svelte', label: 'Svelte' },
	{ value: 'jsx', label: 'JSX' },
	{ value: 'tsx', label: 'TSX' },
	{ value: 'json', label: 'JSON' },
	{ value: 'python', label: 'Python' },
	{ value: 'rust', label: 'Rust' },
	{ value: 'go', label: 'Go' },
	{ value: 'java', label: 'Java' },
	{ value: 'c', label: 'C' },
	{ value: 'cpp', label: 'C++' },
	{ value: 'csharp', label: 'C#' },
	{ value: 'php', label: 'PHP' },
	{ value: 'ruby', label: 'Ruby' },
	{ value: 'swift', label: 'Swift' },
	{ value: 'kotlin', label: 'Kotlin' },
	{ value: 'sql', label: 'SQL' },
	{ value: 'bash', label: 'Bash' },
	{ value: 'shell', label: 'Shell' },
	{ value: 'yaml', label: 'YAML' },
	{ value: 'toml', label: 'TOML' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'dockerfile', label: 'Dockerfile' },
	{ value: 'graphql', label: 'GraphQL' }
];

/**
 * Adds a language selector + copy button UI to all code blocks.
 * Attaches DOM overlay to each <pre> element via a MutationObserver.
 */
export function setupCodeBlockUI(editor: Editor): () => void {
	const editorEl = editor.options.element as HTMLElement | null;
	if (!editorEl) return () => {};

	function addOverlay(pre: HTMLElement): void {
		if (pre.querySelector('.code-block-controls')) return;

		const controls = document.createElement('div');
		controls.className = 'code-block-controls';

		/* ── Language Selector ── */
		const select = document.createElement('select');
		select.className = 'code-block-lang-select';
		select.title = 'Change language';

		for (const lang of CODE_LANGUAGES) {
			const option = document.createElement('option');
			option.value = lang.value;
			option.textContent = lang.label;
			select.appendChild(option);
		}

		const currentLang = pre.getAttribute('data-language') || '';
		select.value = currentLang;

		select.addEventListener('change', () => {
			const pos = getCodeBlockPos(editor, pre);
			if (pos !== null) {
				editor
					.chain()
					.focus()
					.command(({ tr }) => {
						tr.setNodeAttribute(pos, 'language', select.value || null);
						return true;
					})
					.run();
			}
		});

		/* ── Copy Button ── */
		const copyBtn = document.createElement('button');
		copyBtn.className = 'code-block-copy-btn';
		copyBtn.type = 'button';
		copyBtn.title = 'Copy code';
		copyBtn.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256"><path fill="currentColor" d="M216 34H88a6 6 0 0 0-6 6v42H40a6 6 0 0 0-6 6v128a6 6 0 0 0 6 6h128a6 6 0 0 0 6-6v-42h42a6 6 0 0 0 6-6V40a6 6 0 0 0-6-6m-54 176H46V94h116Zm48-48h-36V88a6 6 0 0 0-6-6H94V46h116Z"/></svg>';

		copyBtn.addEventListener('click', () => {
			const codeEl = pre.querySelector('code');
			const text = codeEl?.textContent ?? pre.textContent ?? '';
			navigator.clipboard.writeText(text).then(() => {
				copyBtn.innerHTML =
					'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256"><path fill="currentColor" d="m228.24 76.24-128 128a6 6 0 0 1-8.48 0l-56-56a6 6 0 0 1 8.48-8.48L96 191.51 219.76 67.76a6 6 0 0 1 8.48 8.48"/></svg>';
				copyBtn.title = 'Copied!';
				setTimeout(() => {
					copyBtn.innerHTML =
						'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256"><path fill="currentColor" d="M216 34H88a6 6 0 0 0-6 6v42H40a6 6 0 0 0-6 6v128a6 6 0 0 0 6 6h128a6 6 0 0 0 6-6v-42h42a6 6 0 0 0 6-6V40a6 6 0 0 0-6-6m-54 176H46V94h116Zm48-48h-36V88a6 6 0 0 0-6-6H94V46h116Z"/></svg>';
					copyBtn.title = 'Copy code';
				}, 1500);
			});
		});

		controls.appendChild(select);
		controls.appendChild(copyBtn);
		pre.appendChild(controls);
	}

	function processAllPres(): void {
		const pres = editorEl!.querySelectorAll<HTMLElement>('.ProseMirror pre');
		pres.forEach(addOverlay);
	}

	/* Initial run + observe for newly inserted code blocks */
	processAllPres();

	const observer = new MutationObserver(() => {
		processAllPres();
	});

	const pmEl = (editorEl as HTMLElement).querySelector('.ProseMirror');
	if (pmEl) {
		observer.observe(pmEl, { childList: true, subtree: true });
	}

	return () => observer.disconnect();
}

/**
 * Gets the ProseMirror position of a code block given its DOM `<pre>` element.
 */
function getCodeBlockPos(editor: Editor, pre: HTMLElement): number | null {
	const view = editor.view;
	const pos = view.posAtDOM(pre, 0);
	const resolved = view.state.doc.resolve(pos);
	/* Walk up to find the codeBlock node */
	for (let depth = resolved.depth; depth >= 0; depth--) {
		const node = resolved.node(depth);
		if (node.type.name === 'codeBlock') {
			return resolved.before(depth);
		}
	}
	return null;
}
