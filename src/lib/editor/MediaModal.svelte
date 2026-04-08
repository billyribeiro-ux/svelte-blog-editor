<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type {
		MediaModalState,
		MediaModalTab,
		ImageAlignment,
		ImageSize,
		LinkTo,
		UploadResponse
	} from './types.js';

	let {
		open = $bindable(false),
		editor,
		maxFileSize = 10 * 1024 * 1024,
		onInsertUrl
	}: {
		open: boolean;
		editor: Editor | null;
		maxFileSize?: number;
		onInsertUrl?: (url: string) => void;
	} = $props();

	let state = $state<MediaModalState>(createInitialState());

	let canInsert = $derived(
		(state.previewUrl || state.url) &&
			(onInsertUrl || state.alt.trim().length > 0) &&
			!state.uploading
	);

	let dropzoneEl = $state<HTMLDivElement>();
	let fileInputEl = $state<HTMLInputElement>();
	let isDragging = $state(false);

	function createInitialState(): MediaModalState {
		return {
			tab: 'upload',
			file: null,
			url: '',
			title: '',
			alt: '',
			caption: '',
			description: '',
			size: 'large',
			alignment: 'center',
			linkTo: 'none',
			linkUrl: '',
			uploading: false,
			uploadProgress: 0,
			previewUrl: '',
			error: ''
		};
	}

	function resetState(): void {
		state = createInitialState();
		isDragging = false;
	}

	function setTab(tab: MediaModalTab): void {
		state.tab = tab;
		state.error = '';
	}

	/* ─── File handling ─────────────────────────────────────────── */

	const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

	function validateFile(file: File): string | null {
		if (!acceptedTypes.includes(file.type)) {
			return `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP, AVIF, GIF.`;
		}
		if (file.size > maxFileSize) {
			const mb = (maxFileSize / (1024 * 1024)).toFixed(0);
			return `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum: ${mb}MB.`;
		}
		return null;
	}

	function handleFile(file: File): void {
		const error = validateFile(file);
		if (error) {
			state.error = error;
			return;
		}

		state.file = file;
		state.error = '';

		const reader = new FileReader();
		reader.onload = (e) => {
			state.previewUrl = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function handleFileInput(e: Event): void {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) handleFile(file);
	}

	function handleDrop(e: DragEvent): void {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) handleFile(file);
	}

	function handleDragOver(e: DragEvent): void {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(): void {
		isDragging = false;
	}

	/* ─── URL handling ──────────────────────────────────────────── */

	function handleUrlInput(): void {
		if (state.url) {
			state.previewUrl = state.url;
			state.error = '';
		} else {
			state.previewUrl = '';
		}
	}

	/* ─── Upload ────────────────────────────────────────────────── */

	async function uploadFile(): Promise<UploadResponse | null> {
		if (!state.file) return null;

		state.uploading = true;
		state.uploadProgress = 0;
		state.error = '';

		try {
			const formData = new FormData();
			formData.append('file', state.file);

			const xhr = new XMLHttpRequest();
			const response = await new Promise<UploadResponse>((resolve, reject) => {
				xhr.upload.addEventListener('progress', (e) => {
					if (e.lengthComputable) {
						state.uploadProgress = Math.round((e.loaded / e.total) * 100);
					}
				});

				xhr.addEventListener('load', () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve(JSON.parse(xhr.responseText) as UploadResponse);
					} else {
						reject(new Error(`Upload failed: ${xhr.statusText}`));
					}
				});

				xhr.addEventListener('error', () => reject(new Error('Upload failed')));
				xhr.open('POST', '/api/editor/upload');
				xhr.send(formData);
			});

			return response;
		} catch (err) {
			state.error = err instanceof Error ? err.message : 'Upload failed';
			return null;
		} finally {
			state.uploading = false;
		}
	}

	/* ─── Insert ────────────────────────────────────────────────── */

	async function handleInsert(): Promise<void> {
		if (!canInsert) return;

		let src = state.url;
		let width: number | null = null;
		let height: number | null = null;

		if (state.tab === 'upload' && state.file) {
			const result = await uploadFile();
			if (!result) return;

			switch (state.size) {
				case 'thumbnail':
					src = result.thumbnailUrl;
					break;
				case 'medium':
					src = result.mediumUrl;
					break;
				case 'large':
					src = result.largeUrl;
					break;
				case 'full':
					src = result.url;
					break;
			}
			width = result.width;
			height = result.height;
		} else if (state.tab === 'url') {
			src = state.url;
		}

		if (!src) return;

		/* If onInsertUrl callback is provided, use it instead of inserting into editor */
		if (onInsertUrl) {
			onInsertUrl(src);
		} else if (editor) {
			editor
				.chain()
				.focus()
				.setImage({
					src,
					alt: state.alt,
					title: state.title || undefined,
					caption: state.caption || undefined,
					description: state.description || undefined,
					width,
					height,
					alignment: state.alignment,
					linkUrl:
						state.linkTo === 'custom' ? state.linkUrl : state.linkTo === 'media' ? src : undefined,
					linkTarget: state.linkTo !== 'none' ? '_blank' : undefined
				})
				.run();
		}

		open = false;
		resetState();
	}

	function handleClose(): void {
		resetState();
	}

	/* ─── Size labels ───────────────────────────────────────────── */

	const sizeLabels: Record<ImageSize, string> = {
		thumbnail: 'Thumbnail (150px)',
		medium: 'Medium (300px)',
		large: 'Large (1024px)',
		full: 'Full Size'
	};

	const alignmentOptions: { value: ImageAlignment; label: string; icon: string }[] = [
		{ value: 'left', label: 'Left', icon: 'ph:align-left' },
		{ value: 'center', label: 'Center', icon: 'ph:align-center-horizontal' },
		{ value: 'right', label: 'Right', icon: 'ph:align-right' },
		{ value: 'full', label: 'Full Width', icon: 'ph:arrows-out-line-horizontal' }
	];

	const linkToOptions: { value: LinkTo; label: string }[] = [
		{ value: 'none', label: 'None' },
		{ value: 'custom', label: 'Custom URL' },
		{ value: 'media', label: 'Media File' }
	];
</script>

<Modal bind:open title="Add Media" onclose={handleClose}>
	{#snippet body()}
		<!-- Tab Switcher -->
		<div class="media-tabs" role="tablist">
			<button
				class="media-tab"
				class:active={state.tab === 'upload'}
				type="button"
				role="tab"
				aria-selected={state.tab === 'upload'}
				onclick={() => setTab('upload')}
			>
				<Icon name="ph:upload-simple" size={16} />
				Upload
			</button>
			<button
				class="media-tab"
				class:active={state.tab === 'url'}
				type="button"
				role="tab"
				aria-selected={state.tab === 'url'}
				onclick={() => setTab('url')}
			>
				<Icon name="ph:link" size={16} />
				URL
			</button>
		</div>

		{#if state.error}
			<div class="media-error" role="alert">
				<Icon name="ph:warning-circle" size={16} />
				{state.error}
			</div>
		{/if}

		<!-- Upload Tab -->
		{#if state.tab === 'upload'}
			{#if !state.previewUrl}
				<div
					class="dropzone"
					class:dragging={isDragging}
					bind:this={dropzoneEl}
					role="button"
					tabindex={0}
					aria-label="Drop image here or click to select"
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					onclick={() => fileInputEl?.click()}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') fileInputEl?.click();
					}}
				>
					<Icon name="ph:cloud-arrow-up" size={48} />
					<p class="dropzone-text">Drop image here or click to select</p>
					<p class="dropzone-hint">
						JPEG, PNG, WebP, AVIF, GIF — Max {(maxFileSize / (1024 * 1024)).toFixed(0)}MB
					</p>
				</div>
				<input
					bind:this={fileInputEl}
					type="file"
					accept={acceptedTypes.join(',')}
					class="sr-only"
					oninput={handleFileInput}
				/>
			{:else}
				<div class="preview-container">
					<img src={state.previewUrl} alt="Preview" class="preview-image" />
					{#if state.uploading}
						<div class="upload-progress">
							<div class="upload-progress-bar" style:inline-size="{state.uploadProgress}%"></div>
							<span class="upload-progress-text">{state.uploadProgress}%</span>
						</div>
					{/if}
					<button class="preview-remove" type="button" onclick={resetState}>
						<Icon name="ph:x" size={14} />
						Remove
					</button>
				</div>
			{/if}
		{/if}

		<!-- URL Tab -->
		{#if state.tab === 'url'}
			<div class="field">
				<label class="field-label" for="media-url">Image URL</label>
				<input
					id="media-url"
					class="field-input"
					type="url"
					placeholder="https://example.com/image.jpg"
					bind:value={state.url}
					oninput={handleUrlInput}
				/>
			</div>
			{#if state.previewUrl}
				<div class="preview-container">
					<img src={state.previewUrl} alt="Preview" class="preview-image" />
				</div>
			{/if}
		{/if}

		<!-- SEO Metadata Fields -->
		{#if state.previewUrl || state.url}
			<div class="media-fields">
				<div class="field">
					<label class="field-label" for="media-title">Title</label>
					<input
						id="media-title"
						class="field-input"
						type="text"
						placeholder="Image title"
						bind:value={state.title}
					/>
				</div>

				<div class="field">
					<label class="field-label" for="media-alt">
						Alt Text
						<span class="field-required">*Required</span>
					</label>
					<textarea
						id="media-alt"
						class="field-textarea"
						placeholder="Describe the image for screen readers and SEO. Be specific and descriptive."
						rows={2}
						bind:value={state.alt}
					></textarea>
					<p class="field-help">
						<Icon name="ph:info" size={14} />
						Describe the image for screen readers and SEO. Be specific and descriptive.
					</p>
				</div>

				<div class="field">
					<label class="field-label" for="media-caption">Caption</label>
					<input
						id="media-caption"
						class="field-input"
						type="text"
						placeholder="Displayed below the image in the post"
						bind:value={state.caption}
					/>
				</div>

				<div class="field">
					<label class="field-label" for="media-description">Description</label>
					<textarea
						id="media-description"
						class="field-textarea"
						placeholder="Internal description for media library/CMS"
						rows={2}
						bind:value={state.description}
					></textarea>
				</div>

				<!-- Display Options -->
				<div class="display-options">
					<div class="field">
						<label class="field-label" for="media-size">Size</label>
						<select id="media-size" class="field-select" bind:value={state.size}>
							{#each Object.entries(sizeLabels) as [value, label]}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>

					<div class="field">
						<span class="field-label">Alignment</span>
						<div class="alignment-group" role="radiogroup" aria-label="Image alignment">
							{#each alignmentOptions as opt}
								<button
									class="alignment-btn"
									class:active={state.alignment === opt.value}
									type="button"
									aria-label={opt.label}
									aria-pressed={state.alignment === opt.value}
									onclick={() => {
										state.alignment = opt.value;
									}}
								>
									<Icon name={opt.icon} size={16} />
								</button>
							{/each}
						</div>
					</div>

					<div class="field">
						<label class="field-label" for="media-link-to">Link To</label>
						<select id="media-link-to" class="field-select" bind:value={state.linkTo}>
							{#each linkToOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>

					{#if state.linkTo === 'custom'}
						<div class="field">
							<label class="field-label" for="media-link-url">Link URL</label>
							<input
								id="media-link-url"
								class="field-input"
								type="url"
								placeholder="https://..."
								bind:value={state.linkUrl}
							/>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/snippet}

	{#snippet footer()}
		<button
			class="btn btn-secondary"
			type="button"
			onclick={() => {
				open = false;
				resetState();
			}}
		>
			Cancel
		</button>
		<button class="btn btn-primary" type="button" disabled={!canInsert} onclick={handleInsert}>
			<Icon name="ph:check" size={16} />
			Insert Image
		</button>
	{/snippet}
</Modal>

<style>
	@layer components {
		/* ─── Tabs ───────────────────────────────────────────────── */

		.media-tabs {
			display: flex;
			gap: 2px;
			margin-block-end: 16px;
			border-block-end: 1px solid var(--color-border, oklch(0.25 0.02 260));
		}

		.media-tab {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding-block: 10px;
			padding-inline: 16px;
			border: none;
			background: transparent;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			font-size: 0.875rem;
			font-weight: 500;
			cursor: pointer;
			border-block-end: 2px solid transparent;
			margin-block-end: -1px;
			transition:
				color 0.12s ease,
				border-color 0.12s ease;

			&:hover {
				color: var(--color-text, oklch(0.95 0 0));
			}

			&.active {
				color: var(--color-accent, oklch(0.7 0.15 250));
				border-block-end-color: var(--color-accent, oklch(0.7 0.15 250));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: -2px;
			}
		}

		/* ─── Error ──────────────────────────────────────────────── */

		.media-error {
			display: flex;
			align-items: center;
			gap: 8px;
			padding-block: 10px;
			padding-inline: 14px;
			background: oklch(0.35 0.15 25 / 0.15);
			border: 1px solid oklch(0.55 0.2 25 / 0.4);
			border-radius: 6px;
			color: oklch(0.75 0.15 25);
			font-size: 0.85rem;
			margin-block-end: 12px;
		}

		/* ─── Dropzone ───────────────────────────────────────────── */

		.dropzone {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 8px;
			padding-block: 40px;
			padding-inline: 24px;
			border: 2px dashed var(--color-border, oklch(0.35 0.02 260));
			border-radius: 10px;
			cursor: pointer;
			transition:
				border-color 0.15s ease,
				background 0.15s ease;
			color: var(--color-text-muted, oklch(0.55 0.02 260));

			&:hover,
			&.dragging {
				border-color: var(--color-accent, oklch(0.7 0.15 250));
				background: oklch(0.7 0.15 250 / 0.05);
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 2px;
			}
		}

		.dropzone-text {
			font-size: 0.95rem;
			font-weight: 500;
			margin: 0;
		}

		.dropzone-hint {
			font-size: 0.75rem;
			margin: 0;
		}

		.sr-only {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}

		/* ─── Preview ────────────────────────────────────────────── */

		.preview-container {
			position: relative;
			margin-block: 12px;
			text-align: center;
		}

		.preview-image {
			max-inline-size: 100%;
			max-block-size: 200px;
			border-radius: 8px;
			object-fit: contain;
		}

		.preview-remove {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			margin-block-start: 8px;
			padding-block: 4px;
			padding-inline: 10px;
			border: 1px solid var(--color-border, oklch(0.35 0.02 260));
			border-radius: 4px;
			background: transparent;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			font-size: 0.8rem;
			cursor: pointer;

			&:hover {
				background: oklch(0.55 0.2 25 / 0.15);
				color: oklch(0.75 0.18 25);
				border-color: oklch(0.55 0.2 25 / 0.4);
			}
		}

		/* ─── Upload Progress ────────────────────────────────────── */

		.upload-progress {
			position: relative;
			margin-block-start: 10px;
			block-size: 24px;
			background: var(--color-surface, oklch(0.15 0.01 260));
			border-radius: 12px;
			overflow: hidden;
		}

		.upload-progress-bar {
			block-size: 100%;
			background: var(--color-accent, oklch(0.7 0.15 250));
			border-radius: 12px;
			transition: inline-size 0.2s ease;
		}

		.upload-progress-text {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--color-text, oklch(0.95 0 0));
		}

		/* ─── Fields ─────────────────────────────────────────────── */

		.media-fields {
			margin-block-start: 16px;
			display: flex;
			flex-direction: column;
			gap: 14px;
		}

		.field {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.field-label {
			font-size: 0.8rem;
			font-weight: 600;
			color: var(--color-text-secondary, oklch(0.8 0.02 260));
			display: flex;
			align-items: center;
			gap: 6px;
		}

		.field-required {
			font-size: 0.7rem;
			font-weight: 500;
			color: oklch(0.65 0.2 25);
		}

		.field-input,
		.field-textarea,
		.field-select {
			padding-block: 8px;
			padding-inline: 12px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 6px;
			background: var(--color-surface, oklch(0.13 0.01 260));
			color: var(--color-text, oklch(0.95 0 0));
			font-size: 0.875rem;
			font-family: inherit;
			transition: border-color 0.12s ease;

			&:focus {
				outline: none;
				border-color: var(--color-accent, oklch(0.7 0.15 250));
				box-shadow: 0 0 0 2px oklch(0.7 0.15 250 / 0.2);
			}

			&::placeholder {
				color: var(--color-text-muted, oklch(0.45 0.02 260));
			}
		}

		.field-textarea {
			resize: vertical;
			min-block-size: 48px;
		}

		.field-select {
			cursor: pointer;
		}

		.field-help {
			display: flex;
			align-items: flex-start;
			gap: 4px;
			font-size: 0.72rem;
			color: var(--color-text-muted, oklch(0.55 0.02 260));
			margin: 0;
		}

		/* ─── Display Options ────────────────────────────────────── */

		.display-options {
			display: flex;
			flex-direction: column;
			gap: 12px;
			padding-block-start: 12px;
			border-block-start: 1px solid var(--color-border, oklch(0.25 0.02 260));
		}

		.alignment-group {
			display: flex;
			gap: 4px;
		}

		.alignment-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			inline-size: 36px;
			block-size: 32px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 6px;
			background: transparent;
			color: var(--color-text-muted, oklch(0.6 0.02 260));
			cursor: pointer;
			transition:
				background 0.1s ease,
				color 0.1s ease,
				border-color 0.1s ease;

			&:hover {
				background: var(--color-hover, oklch(0.22 0.02 260));
				color: var(--color-text, oklch(0.95 0 0));
			}

			&.active {
				background: var(--color-accent-muted, oklch(0.7 0.15 250 / 0.2));
				color: var(--color-accent, oklch(0.7 0.15 250));
				border-color: var(--color-accent, oklch(0.7 0.15 250));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 1px;
			}
		}

		/* ─── Buttons ────────────────────────────────────────────── */

		:global(.btn) {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding-block: 8px;
			padding-inline: 16px;
			border: none;
			border-radius: 6px;
			font-size: 0.875rem;
			font-weight: 500;
			cursor: pointer;
			transition:
				background 0.12s ease,
				opacity 0.12s ease;

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 2px;
			}
		}

		:global(.btn-primary) {
			background: var(--color-accent, oklch(0.7 0.15 250));
			color: oklch(0.1 0 0);

			&:hover:not(:disabled) {
				background: oklch(0.65 0.17 250);
			}
		}

		:global(.btn-secondary) {
			background: var(--color-surface-elevated, oklch(0.22 0.01 260));
			color: var(--color-text, oklch(0.95 0 0));

			&:hover:not(:disabled) {
				background: oklch(0.28 0.01 260);
			}
		}
	}
</style>
