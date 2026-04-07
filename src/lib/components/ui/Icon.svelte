<script lang="ts">
	import IconifyIcon from '@iconify/svelte';

	let {
		name,
		size = 20,
		class: className = '',
		label = ''
	}: {
		name: string;
		size?: number;
		class?: string;
		label?: string;
	} = $props();
</script>

<IconifyIcon
	icon={name}
	width={size}
	height={size}
	class="icon {className}"
	aria-label={label || undefined}
	aria-hidden={label ? undefined : true}
/>

<style>
	:global(.icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		vertical-align: middle;
	}
</style>
