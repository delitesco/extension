import { fill } from '@/lib/fill';
import { send, type Reply } from '@/lib/messages';
import { reuseSiteAlias } from '@/lib/storage';

const SIZE = 28;
const INSET = 6;

// Colours from the app palette (src/app.css); page CSS variables don't reach into the shadow root.
const STYLE = `
	:host { all: initial; position: fixed; z-index: 2147483647; }
	button {
		display: grid; place-items: center; width: ${SIZE}px; height: ${SIZE}px; padding: 0;
		border: 0; border-radius: 50%; background: #0b5f73; color: #f7f6f3; cursor: pointer;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.25);
	}
	button:hover { background: #094d5d; }
	button[aria-busy='true'] svg { animation: pulse 0.8s ease-in-out infinite alternate; }
	@keyframes pulse { to { opacity: 0.3; } }
	p {
		position: absolute; top: ${SIZE + 6}px; right: 0; width: max-content; max-width: 16rem;
		margin: 0; padding: 6px 10px; border-radius: 8px; background: #22201d; color: #ecebe8;
		font: 13px/1.4 system-ui, sans-serif;
	}
	p:empty { display: none; }
`;

// The delitesco mark, cropped to its bounds (assets/icon.svg has the full app icon).
const ICON = `<svg width="14" height="14" viewBox="14 12 70 72" fill="currentColor" aria-hidden="true">
	<path d="M20 12H24A6 6 0 0 1 30 18V78A6 6 0 0 1 24 84H20A6 6 0 0 1 14 78V18A6 6 0 0 1 20 12Z M46 12H48A36 36 0 0 1 48 84H46A6 6 0 0 1 40 78V18A6 6 0 0 1 46 12Z"/></svg>`;

/**
 * By default a site keeps one alias: the newest one is reused, and a new one is only made the
 * first time. With reuse turned off in the settings, every click makes a new one.
 */
async function aliasForSite(site: string): Promise<Reply<{ address: string; isNew: boolean }>> {
	if (await reuseSiteAlias.getValue()) {
		const existing = await send({ type: 'siteAliases', site });
		if (!existing.ok) return existing;

		const [newest] = existing.value;
		if (newest) return { ok: true, value: { address: newest, isNew: false } };
	}

	const created = await send({ type: 'createAlias', site });
	return created.ok ? { ok: true, value: { address: created.value, isNew: true } } : created;
}

/**
 * A small button inside the email field the user is focused on.
 * It lives in a shadow root so the page's styles can't reach it.
 */
export function createFieldButton(site: string) {
	const host = document.createElement('delitesco-button');
	const shadow = host.attachShadow({ mode: 'closed' });

	const style = document.createElement('style');
	style.textContent = STYLE;

	const button = document.createElement('button');
	button.type = 'button';
	button.title = button.ariaLabel = 'Fill in a delitesco alias';
	button.innerHTML = ICON;

	const status = document.createElement('p');
	status.role = 'status';

	shadow.append(style, button, status);

	let field: HTMLInputElement | null = null;
	let statusTimer = 0;

	function place() {
		if (!field) return;
		const rect = field.getBoundingClientRect();
		host.style.top = `${rect.top + (rect.height - SIZE) / 2}px`;
		host.style.left = `${rect.right - SIZE - INSET}px`;
	}

	function say(text: string) {
		status.textContent = text;
		clearTimeout(statusTimer);
		statusTimer = window.setTimeout(() => (status.textContent = ''), 4000);
	}

	// Pressing the button would otherwise blur the field and hide the button mid-click.
	button.addEventListener('pointerdown', (event) => event.preventDefault());

	async function fillAlias() {
		const target = field;
		if (!target || button.ariaBusy === 'true') return;

		button.ariaBusy = 'true';
		const reply = await aliasForSite(site);
		button.ariaBusy = null;

		if (!reply.ok) return say(reply.problem);
		fill(target, reply.value.address);
		say(reply.value.isNew ? 'New alias filled in' : 'Filled in your alias for this site');
	}

	button.addEventListener('click', fillAlias);

	function show(input: HTMLInputElement) {
		field = input;
		place();
		document.documentElement.append(host);
		addEventListener('scroll', place, true);
		addEventListener('resize', place);
	}

	return {
		show,
		/** For the keyboard shortcut: the button shows up even where it's turned off, to report back. */
		fillNow(input: HTMLInputElement) {
			show(input);
			return fillAlias();
		},
		hide() {
			field = null;
			host.remove();
			removeEventListener('scroll', place, true);
			removeEventListener('resize', place);
		}
	};
}
