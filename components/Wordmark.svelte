<script lang="ts">
	// The delitesco mark and name, as on the website (src/lib/components/Wordmark.svelte).
</script>

<span class="wordmark">
	<svg viewBox="14 12 70 72" aria-hidden="true">
		<path
			d="M20 12H24A6 6 0 0 1 30 18V78A6 6 0 0 1 24 84H20A6 6 0 0 1 14 78V18A6 6 0 0 1 20 12Z M46 12H48A36 36 0 0 1 48 84H46A6 6 0 0 1 40 78V18A6 6 0 0 1 46 12Z"
		/>
	</svg>
	delitesco
</span>

<style>
	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.45em;
		font-weight: 700;
		letter-spacing: -0.04em;
	}

	svg {
		height: 0.95em;
		fill: var(--accent);
	}
</style>
