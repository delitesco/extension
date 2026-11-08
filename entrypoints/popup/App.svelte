<script lang="ts">
	import { browser } from '#imports';
	import Wordmark from '@/components/Wordmark.svelte';
	import { APP_ORIGIN } from '@/lib/config';
	import { send, type TabRequest } from '@/lib/messages';
	import { setting } from '@/lib/setting.svelte';
	import { siteOf } from '@/lib/site';
	import { apiKey, fieldButton, hiddenSites } from '@/lib/storage';

	interface SiteTab {
		id: number;
		site: string;
	}

	const key = setting(apiKey);
	const buttonEnabled = setting(fieldButton);
	const hidden = setting(hiddenSites);

	let tab = $state<SiteTab | null>();
	let aliases = $state<string[]>();
	let used = $state<{ address: string; filled: boolean }>();
	let problem = $state<string>();
	let busy = $state(false);

	// Undefined until the settings are read, so nothing renders with the defaults first.
	const connected = $derived(
		[key, buttonEnabled, hidden].every((item) => item.loaded) ? Boolean(key.value) : undefined
	);
	const hiddenHere = $derived(tab ? hidden.value.includes(tab.site) : false);

	/** Null on pages an alias makes no sense for, like a new tab or delitesco itself. */
	async function siteTab(): Promise<SiteTab | null> {
		const [active] = await browser.tabs.query({ active: true, currentWindow: true });
		if (active?.id === undefined || !active.url) return null;

		const url = new URL(active.url);
		if (!url.protocol.startsWith('http') || url.origin === APP_ORIGIN) return null;
		return { id: active.id, site: siteOf(url) };
	}

	async function load() {
		tab = await siteTab();
		if (!tab || !(await apiKey.getValue())) return;

		const reply = await send({ type: 'siteAliases', site: tab.site });
		if (reply.ok) aliases = reply.value;
		else problem = reply.problem;
	}

	load();

	async function use(address: string) {
		await navigator.clipboard.writeText(address);
		// The page has no content script if it was open before the extension was installed.
		const filled = tab
			? await browser.tabs
					.sendMessage(tab.id, { type: 'fill', address } satisfies TabRequest)
					.catch(() => false)
			: false;
		used = { address, filled: Boolean(filled) };
	}

	async function createAlias(site: string) {
		busy = true;
		problem = undefined;
		const reply = await send({ type: 'createAlias', site });
		busy = false;

		if (!reply.ok) {
			problem = reply.problem;
			return;
		}
		aliases = [reply.value, ...(aliases ?? [])];
		await use(reply.value);
	}

	function toggleHere(site: string) {
		hidden.value = hiddenHere
			? hidden.value.filter((hiddenSite) => hiddenSite !== site)
			: [...hidden.value, site];
	}

	async function connect() {
		await browser.tabs.create({ url: `${APP_ORIGIN}/extension/connect` });
		window.close();
	}

	async function openSettings() {
		await browser.runtime.openOptionsPage();
		window.close();
	}
</script>

<main>
	<header>
		<div class="title">
			<strong><Wordmark /></strong>
			{#if connected && tab}<span class="muted small">{tab.site}</span>{/if}
		</div>
		{#if connected}
			<button class="icon" aria-label="Settings" title="Settings" onclick={openSettings}>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
					<circle cx="15" cy="7" r="2" />
					<circle cx="9" cy="17" r="2" />
				</svg>
			</button>
		{/if}
	</header>

	{#if connected === false}
		<p>Connect your account to fill in an alias wherever a site asks for your email.</p>
		<button class="primary" onclick={connect}>Connect delitesco</button>
	{:else if connected && tab === null}
		<p class="muted">Open a website to make an alias for it.</p>
	{:else if connected && tab && aliases}
		{#if aliases.length > 0}
			<ul class="list">
				{#each aliases as address (address)}
					<li>
						<button class="alias" onclick={() => use(address)}>
							<span class="address">{address}</span>
							<span class="state small" class:done={used?.address === address}>
								{#if used?.address === address}
									{used.filled ? 'Filled in' : 'Copied'}
								{:else}
									Fill in
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<button
			class:primary={aliases.length === 0}
			disabled={busy}
			onclick={() => tab && createAlias(tab.site)}
		>
			{aliases.length > 0 ? 'New alias' : `New alias for ${tab.site}`}
		</button>
	{/if}

	{#if problem}
		<p class="error small">{problem}</p>
	{/if}

	{#if connected && tab && aliases && buttonEnabled.value}
		<button class="link quiet small" onclick={() => tab && toggleHere(tab.site)}>
			{hiddenHere ? 'Show the button in email fields here' : 'Hide the button in email fields here'}
		</button>
	{/if}
</main>

<style>
	:global(body) {
		width: 20rem;
	}

	main {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem 1rem 1rem;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 2.25rem;
	}

	.title {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.3;
	}

	.title strong {
		font-size: 1.0625rem;
		letter-spacing: -0.03em;
	}

	.title span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 2.25rem;
		min-height: 2.25rem;
		margin-right: -0.375rem;
		padding: 0;
		background: none;
		color: var(--muted);
	}

	.icon:hover {
		background: var(--fill);
		color: var(--text);
	}

	p {
		margin: 0;
	}

	.list > li:has(.alias) {
		min-height: 0;
		padding: 0;
	}

	.alias {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		min-height: 2.75rem;
		padding: 0 0.875rem;
		background: none;
		border-radius: 0;
		font-weight: 450;
		text-align: left;
	}

	.alias:hover {
		background: var(--fill);
	}

	.list > li:first-child .alias {
		border-radius: var(--radius) var(--radius) 0 0;
	}

	.list > li:last-child .alias {
		border-radius: 0 0 var(--radius) var(--radius);
	}

	.list > li:only-child .alias {
		border-radius: var(--radius);
	}

	.address {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.state {
		flex-shrink: 0;
		color: var(--muted);
	}

	.state.done {
		color: var(--accent);
		font-weight: 550;
	}

	.quiet {
		align-self: center;
		color: var(--muted);
	}

	.quiet:hover {
		color: var(--text);
	}
</style>
