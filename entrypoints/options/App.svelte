<script lang="ts">
	import { browser } from '#imports';
	import Switch from '@/components/Switch.svelte';
	import Wordmark from '@/components/Wordmark.svelte';
	import { APP_ORIGIN } from '@/lib/config';
	import { send, type AccountInfo } from '@/lib/messages';
	import { setting } from '@/lib/setting.svelte';
	import {
		apiKey,
		defaultDomain,
		fieldButton,
		forwardTo,
		hiddenSites,
		randomOnly,
		reuseSiteAlias
	} from '@/lib/storage';

	const key = setting(apiKey);
	const savedDomain = setting(defaultDomain);
	const savedMailbox = setting(forwardTo);
	const random = setting(randomOnly);
	const button = setting(fieldButton);
	const reuse = setting(reuseSiteAlias);
	const hidden = setting(hiddenSites);

	let account = $state<AccountInfo>();
	let problem = $state<string>();
	let shortcut = $state<string>();

	// Until every setting is read, the switches would show the defaults and then slide over.
	const ready = $derived(
		[key, savedDomain, savedMailbox, random, button, reuse, hidden].every((item) => item.loaded)
	);
	const connected = $derived(Boolean(key.value));

	// Saved choices can disappear on the website; then the main one is used instead.
	const domains = $derived(account?.domains ?? []);
	const mailboxes = $derived(account?.mailboxes ?? []);
	const domain = $derived(domains.find((d) => d.name === savedDomain.value) ?? domains[0]);
	const mailbox = $derived(mailboxes.find((m) => m.id === savedMailbox.value) ?? mailboxes[0]);
	const lostDomain = $derived(savedDomain.value && domain?.name !== savedDomain.value);
	const lostMailbox = $derived(savedMailbox.value && mailbox?.id !== savedMailbox.value);

	// Shared domains add a random part so addresses stay unique; on an own domain the name is enough.
	const example = $derived.by(() => {
		if (!domain) return undefined;
		if (random.value) return `x7k2m9q1@${domain.name}`;
		return domain.own ? `github@${domain.name}` : `github.x7k2m9@${domain.name}`;
	});

	async function loadAccount() {
		const reply = await send({ type: 'account' });
		if (reply.ok) account = reply.value;
		else problem = reply.problem;
	}

	async function loadShortcut() {
		const commands = await browser.commands.getAll();
		shortcut = commands.find((command) => command.name === 'fill-alias')?.shortcut ?? '';
	}

	$effect(() => {
		problem = undefined;
		if (connected) loadAccount();
		else account = undefined;
	});

	// The shortcut is changed on a browser page, so look again when the user comes back.
	$effect(() => {
		loadShortcut();
		addEventListener('focus', loadShortcut);
		return () => removeEventListener('focus', loadShortcut);
	});

	// The main domain and address are stored as "none", so they follow changes on the website.
	function chooseDomain(name: string) {
		savedDomain.value = name === domains[0]?.name ? null : name;
	}

	function chooseMailbox(id: string) {
		savedMailbox.value = id === mailboxes[0]?.id ? null : id;
	}

	async function changeShortcut() {
		await browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
	}

	async function connect() {
		await browser.tabs.create({ url: `${APP_ORIGIN}/extension/connect` });
	}

	async function disconnect() {
		const reply = await send({ type: 'disconnect' });
		if (!reply.ok) problem = reply.problem;
	}
</script>

<main>
	<header>
		<h1><Wordmark /></h1>
		<p class="muted">Extension settings. Changes save on their own.</p>
	</header>

	{#if ready}
		<section>
			<h2>Account</h2>
			{#if connected}
				<ul class="list">
					<li>
						<span class="row-text">
							<span>Connected</span>
							{#if account}
								<span class="muted small">Account number ending {account.numberEnd}</span>
							{/if}
						</span>
						<button onclick={disconnect}>Disconnect</button>
					</li>
					{#if account}
						<li>
							<span class="row-text">
								<span>Paid time</span>
								<span
									class="small"
									class:muted={account.daysLeft > 0}
									class:error={!account.daysLeft}
								>
									{#if account.daysLeft === 0}
										Over: new aliases can't be made
									{:else}
										{account.daysLeft === 1 ? '1 day' : `${account.daysLeft} days`} left
									{/if}
								</span>
							</span>
							<a href="{APP_ORIGIN}/account/subscription" target="_blank" rel="noreferrer">
								Add time
							</a>
						</li>
					{/if}
				</ul>
			{:else}
				<div class="card">
					<p>Connect your account to fill in aliases wherever a site asks for your email.</p>
					<button class="primary" onclick={connect}>Connect delitesco</button>
				</div>
			{/if}
			{#if problem}
				<p class="note error small">{problem}</p>
			{/if}
		</section>

		{#if account}
			<section>
				<h2>New aliases</h2>
				<ul class="list">
					<li>
						<label for="domain">Domain</label>
						{#if domains.length > 1}
							<select
								id="domain"
								value={domain?.name}
								onchange={(event) => chooseDomain(event.currentTarget.value)}
							>
								{#each domains as option (option.name)}
									<option value={option.name}>@{option.name}</option>
								{/each}
							</select>
						{:else if domain}
							<span class="value muted">@{domain.name}</span>
						{/if}
					</li>
					<li>
						<label for="mailbox">Forward to</label>
						{#if mailboxes.length > 1}
							<select
								id="mailbox"
								value={mailbox?.id}
								onchange={(event) => chooseMailbox(event.currentTarget.value)}
							>
								{#each mailboxes as option (option.id)}
									<option value={option.id}>{option.address}</option>
								{/each}
							</select>
						{:else if mailbox}
							<span class="value muted">{mailbox.address}</span>
						{:else}
							<a href="{APP_ORIGIN}/account/forwarding" target="_blank" rel="noreferrer">
								Add an address
							</a>
						{/if}
					</li>
					<li>
						<span class="row-text">
							<span>Start with the site's name</span>
							<span class="muted small">Helps you see where mail comes from</span>
						</span>
						<Switch
							checked={!random.value}
							label="Start with the site's name"
							onchange={(on) => (random.value = !on)}
						/>
					</li>
				</ul>
				{#if example}
					<p class="note muted small">New aliases look like <span class="mono">{example}</span></p>
				{/if}
				{#if lostDomain && domain}
					<p class="note small">
						@{savedDomain.value} can't be used any more, so aliases go to @{domain.name}.
					</p>
				{/if}
				{#if lostMailbox && mailbox}
					<p class="note small">
						The address you picked is gone, so aliases forward to {mailbox.address}.
					</p>
				{/if}
				{#if domains.length === 1 || mailboxes.length < 2}
					<p class="note muted small">
						Add domains and forwarding addresses on
						<a href="{APP_ORIGIN}/account" target="_blank" rel="noreferrer">delitesco</a>.
					</p>
				{/if}
			</section>
		{/if}

		<section>
			<h2>Email fields</h2>
			<ul class="list">
				<li>
					<span class="row-text">
						<span>Button in email fields</span>
						<span class="muted small">Shows up when you click into one</span>
					</span>
					<Switch
						checked={button.value}
						label="Button in email fields"
						onchange={(on) => (button.value = on)}
					/>
				</li>
				<li>
					<span class="row-text">
						<span>Reuse the site's alias</span>
						<span class="muted small">
							{reuse.value
								? 'Fills in the alias you already have there'
								: 'Makes a new alias every time'}
						</span>
					</span>
					<Switch
						checked={reuse.value}
						label="Reuse the site's alias"
						onchange={(on) => (reuse.value = on)}
					/>
				</li>
				<li>
					<span class="row-text">
						<span>Keyboard shortcut</span>
						<span class="muted small">Fills in the focused email field</span>
					</span>
					{#if import.meta.env.FIREFOX}
						<kbd>{shortcut || 'Not set'}</kbd>
					{:else}
						<button class="shortcut" onclick={changeShortcut}>
							{#if shortcut}<kbd>{shortcut}</kbd>{:else}Set{/if}
						</button>
					{/if}
				</li>
			</ul>
			{#if import.meta.env.FIREFOX}
				<p class="note muted small">
					Change it in Add-ons and themes → the gear menu → Manage Extension Shortcuts.
				</p>
			{/if}
		</section>

		{#if hidden.value.length > 0}
			<section>
				<h2>Button hidden on</h2>
				<ul class="list">
					{#each hidden.value as site (site)}
						<li>
							<span class="site">{site}</span>
							<button
								class="link"
								onclick={() => (hidden.value = hidden.value.filter((other) => other !== site))}
							>
								Show again
							</button>
						</li>
					{/each}
				</ul>
				<p class="note muted small">
					Hide it on a site from the toolbar button while you're there.
				</p>
			</section>
		{/if}
	{/if}
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		max-width: 34rem;
		margin: 0 auto;
		padding: 2.5rem 1rem 4rem;
	}

	header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-left: 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		letter-spacing: -0.03em;
	}

	header p {
		margin: 0;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	h2 {
		margin: 0 0 0 1rem;
		color: var(--muted);
		font-size: 0.875rem;
		font-weight: 550;
	}

	.note {
		margin: 0 1rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.card p {
		margin: 0;
	}

	label {
		flex-shrink: 0;
	}

	select {
		width: auto;
		min-width: 0;
		max-width: 65%;
	}

	.value,
	.site {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mono {
		color: var(--text);
		font-family: ui-monospace, monospace;
	}

	kbd {
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 550;
		white-space: nowrap;
	}

	.shortcut {
		flex-shrink: 0;
		min-height: 2.25rem;
		padding: 0 0.875rem;
	}
</style>
