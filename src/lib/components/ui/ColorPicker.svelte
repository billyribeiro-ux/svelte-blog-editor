<script lang="ts">
	import type { ColorPreset } from '$lib/editor/types.js';

	let {
		value = $bindable(''),
		onchange,
		presets = defaultPresets()
	}: {
		value: string;
		onchange?: (color: string) => void;
		presets?: ColorPreset[];
	} = $props();

	let customInput = $state<HTMLInputElement>();

	function defaultPresets(): ColorPreset[] {
		return [
			{ label: 'Default', value: '' },
			{ label: 'Red', value: 'oklch(0.63 0.25 25)' },
			{ label: 'Orange', value: 'oklch(0.7 0.19 55)' },
			{ label: 'Yellow', value: 'oklch(0.82 0.18 90)' },
			{ label: 'Green', value: 'oklch(0.65 0.2 145)' },
			{ label: 'Teal', value: 'oklch(0.65 0.15 185)' },
			{ label: 'Blue', value: 'oklch(0.6 0.2 255)' },
			{ label: 'Purple', value: 'oklch(0.55 0.25 300)' },
			{ label: 'Pink', value: 'oklch(0.65 0.25 340)' },
			{ label: 'Gray', value: 'oklch(0.55 0.02 260)' },
			{ label: 'White', value: 'oklch(0.95 0 0)' },
			{ label: 'Black', value: 'oklch(0.15 0 0)' }
		];
	}

	function selectColor(color: string): void {
		value = color;
		onchange?.(color);
	}

	function handleCustomInput(e: Event): void {
		const target = e.target as HTMLInputElement;
		value = target.value;
		onchange?.(target.value);
	}
</script>

<div class="color-picker" role="group" aria-label="Color picker">
	<div class="color-grid">
		{#each presets as preset}
			<button
				class="color-swatch"
				class:active={value === preset.value}
				class:is-default={preset.value === ''}
				type="button"
				title={preset.label}
				aria-label={preset.label}
				style:background-color={preset.value || 'transparent'}
				onclick={() => selectColor(preset.value)}
			>
				{#if preset.value === ''}
					<span class="no-color-line"></span>
				{/if}
			</button>
		{/each}
	</div>

	<div class="custom-color">
		<label class="custom-label">
			Custom
			<input
				bind:this={customInput}
				class="custom-input"
				type="color"
				value={value || '#ffffff'}
				oninput={handleCustomInput}
			/>
		</label>
	</div>
</div>

<style>
	@layer components {
		.color-picker {
			display: flex;
			flex-direction: column;
			gap: 10px;
			padding: 4px;
		}

		.color-grid {
			display: grid;
			grid-template-columns: repeat(6, 1fr);
			gap: 4px;
		}

		.color-swatch {
			inline-size: 28px;
			block-size: 28px;
			border-radius: 6px;
			border: 2px solid transparent;
			cursor: pointer;
			position: relative;
			transition: border-color 0.15s ease, transform 0.1s ease;
			overflow: hidden;

			&:hover {
				transform: scale(1.15);
			}

			&:focus-visible {
				outline: 2px solid var(--color-accent, oklch(0.7 0.15 250));
				outline-offset: 2px;
			}

			&.active {
				border-color: var(--color-accent, oklch(0.7 0.15 250));
				box-shadow: 0 0 0 1px var(--color-accent, oklch(0.7 0.15 250));
			}

			&.is-default {
				border-color: var(--color-border, oklch(0.3 0.02 260));
			}
		}

		.no-color-line {
			position: absolute;
			inset: 0;
			display: block;

			&::after {
				content: '';
				position: absolute;
				inset-block-start: 50%;
				inset-inline-start: -2px;
				inline-size: calc(100% + 4px);
				block-size: 2px;
				background: oklch(0.6 0.2 25);
				transform: rotate(-45deg);
			}
		}

		.custom-color {
			border-block-start: 1px solid var(--color-border, oklch(0.3 0.02 260));
			padding-block-start: 8px;
		}

		.custom-label {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: 0.8rem;
			color: var(--color-text-muted, oklch(0.65 0.02 260));
			cursor: pointer;
		}

		.custom-input {
			inline-size: 28px;
			block-size: 28px;
			border: 1px solid var(--color-border, oklch(0.3 0.02 260));
			border-radius: 6px;
			padding: 0;
			cursor: pointer;
			background: none;

			&::-webkit-color-swatch-wrapper {
				padding: 2px;
			}

			&::-webkit-color-swatch {
				border: none;
				border-radius: 4px;
			}
		}
	}
</style>
