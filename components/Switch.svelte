<script lang="ts">
	let {
		checked,
		label,
		disabled = false,
		onchange
	}: {
		checked: boolean;
		label: string;
		disabled?: boolean;
		onchange: (on: boolean) => void;
	} = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	onclick={() => onchange(!checked)}
>
	<span></span>
</button>

<style>
	button {
		position: relative;
		flex-shrink: 0;
		width: 2.75rem;
		min-height: 0;
		height: 1.625rem;
		padding: 0;
		background: var(--fill-strong);
		transition: background-color 0.2s;
	}

	button[aria-checked='true'] {
		background: var(--accent);
	}

	span {
		position: absolute;
		top: 0.1875rem;
		left: 0.1875rem;
		width: 1.25rem;
		height: 1.25rem;
		background: var(--knob);
		border-radius: 50%;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.2);
		transition: translate 0.2s;
	}

	button[aria-checked='true'] span {
		translate: 1.125rem 0;
	}
</style>
