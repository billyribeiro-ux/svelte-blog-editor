<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title = '',
		onclose,
		header,
		body,
		footer
	}: {
		open: boolean;
		title?: string;
		onclose?: () => void;
		header?: Snippet;
		body?: Snippet;
		footer?: Snippet;
	} = $props();

	let dialogEl = $state<HTMLDialogElement>();
	let previousFocus = $state<HTMLElement | null>(null);

	function close(): void {
		open = false;
		onclose?.();
		previousFocus?.focus();
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}

		if (e.key === 'Tab' && dialogEl) {
			const focusable = dialogEl.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last?.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first?.focus();
			}
		}
	}

	function handleBackdropClick(e: MouseEvent): void {
		if (e.target === dialogEl) {
			close();
		}
	}

	$effect(() => {
		if (open && dialogEl) {
			previousFocus = document.activeElement as HTMLElement;
			dialogEl.showModal();
			const firstFocusable = dialogEl.querySelector<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			firstFocusable?.focus();
		} else if (!open && dialogEl) {
			dialogEl.close();
		}
	});

	onMount(() => {
		if (!browser) return;
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (!browser) return;
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if open}
	<dialog
		bind:this={dialogEl}
		class="modal"
		aria-modal="true"
		aria-label={title}
		onclick={handleBackdropClick}
	>
		<div class="modal-container">
			<div class="modal-header">
				{#if header}
					{@render header()}
				{:else}
					<h2 class="modal-title">{title}</h2>
				{/if}
				<button class="modal-close" type="button" aria-label="Close modal" onclick={close}>
					<Icon name="ph:x-bold" size={18} />
				</button>
			</div>

			{#if body}
				<div class="modal-body">
					{@render body()}
				</div>
			{/if}

			{#if footer}
				<div class="modal-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</dialog>
{/if}

<style>
	@layer components {
		.modal {
			position: fixed;
			inset: 0;
			z-index: 1000;
			display: grid;
			place-items: center;
			border: none;
			background: transparent;
			padding: 0;
			max-inline-size: 100dvw;
			max-block-size: 100dvh;
			inline-size: 100dvw;
			block-size: 100dvh;

			&::backdrop {
				background: oklch(0 0 0 / 0.6);
				backdrop-filter: blur(4px);
			}

			&[open] {
				animation: modal-fade-in 0.2s ease-out;
			}
		}

		.modal-container {
			background: var(--color-surface, oklch(0.16 0.01 260));
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 12px;
			inline-size: min(640px, 90dvw);
			max-block-size: 85dvh;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			box-shadow: 0 24px 48px oklch(0 0 0 / 0.3);
		}

		.modal-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-block: 16px;
			padding-inline: 24px;
			border-block-end: 1px solid var(--color-border, oklch(0.3 0.02 260));
		}

		.modal-title {
			font-size: 1.125rem;
			font-weight: 600;
			color: var(--color-text, oklch(0.95 0 0));
			margin: 0;
		}

		.modal-close {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 6px;
			border: none;
			border-radius: 6px;
			background: transparent;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			cursor: pointer;
			transition:
				background 0.15s ease,
				color 0.15s ease;

			&:hover {
				background: var(--color-hover, oklch(0.22 0.02 260));
				color: var(--color-text, oklch(0.95 0 0));
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 2px;
			}
		}

		.modal-body {
			padding-block: 20px;
			padding-inline: 24px;
			overflow-y: auto;
			flex: 1;
		}

		.modal-footer {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 8px;
			padding-block: 16px;
			padding-inline: 24px;
			border-block-start: 1px solid var(--color-border, oklch(0.3 0.02 260));
		}

		@keyframes modal-fade-in {
			from {
				opacity: 0;
				transform: scale(0.96);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}
	}
</style>
