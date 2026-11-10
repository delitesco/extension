import { browser, defineBackground } from '#imports';
import { API_ORIGIN, APP_ORIGIN } from '@/lib/config';
import type { AccountInfo, Reply, Request, TabRequest } from '@/lib/messages';
import { siteOf } from '@/lib/site';
import { apiKey, defaultDomain, forwardTo, randomOnly } from '@/lib/storage';

const EXTENSION_ORIGIN = new URL(browser.runtime.getURL('/options.html')).origin;

class Problem extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
	}
}

async function api<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<T> {
	const key = await apiKey.getValue();
	if (!key) throw new Problem('Connect your delitesco account first: click the delitesco icon.');

	const response = await fetch(`${API_ORIGIN}/api/v1/${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${key}`,
			...(body && { 'Content-Type': 'application/json' })
		},
		body: body && JSON.stringify(body)
	}).catch((cause) => {
		// The browser hides the reason from scripts; its own console usually says more.
		console.error(`Request to ${API_ORIGIN} failed`, cause);
		throw new Problem("Can't reach delitesco. Check your connection.");
	});
	const payload = response.status === 204 ? null : await response.json();

	// The key was revoked from the website, so forget it and show the Connect button again.
	if (response.status === 401) await apiKey.removeValue();
	if (!response.ok) throw new Problem(payload.message, response.status);
	return payload;
}

async function createAlias(site: string): Promise<string> {
	const [domain, mailboxId, random] = await Promise.all([
		defaultDomain.getValue(),
		forwardTo.getValue(),
		randomOnly.getValue()
	]);
	const body = {
		site,
		domain: domain ?? undefined,
		mailboxIds: mailboxId ? [mailboxId] : undefined,
		randomOnly: random
	};
	try {
		return (await api<{ address: string }>('POST', 'aliases', body)).address;
	} catch (problem) {
		// A domain or address picked in the settings may have been removed on the website since.
		if ((domain || mailboxId) && problem instanceof Problem && problem.status === 400) {
			throw new Problem(`${problem.message} Check the extension's settings.`);
		}
		throw problem;
	}
}

async function handle(request: Request, senderUrl: string | undefined): Promise<unknown> {
	const sender = senderUrl ? new URL(senderUrl) : null;
	// The popup and the settings page. Every other sender is a content script, which runs in
	// its page's process: a page that breaks out of the browser's sandbox could send anything
	// from there, so it only gets what belongs to its own site.
	const ownPage = sender?.origin === EXTENSION_ORIGIN;
	const needsOwnPage = () => {
		if (!ownPage) throw new Problem('Only the extension itself can do this.');
	};
	const needsOwnSite = (site: string) => {
		if (!ownPage && (!sender || siteOf(sender) !== site)) {
			throw new Problem('An alias can only be made for the site you are on.');
		}
	};

	switch (request.type) {
		case 'connect':
			// Only the delitesco connect page may hand over a key, never another site.
			if (sender?.origin !== APP_ORIGIN)
				throw new Problem('Keys are only accepted from delitesco.');
			await apiKey.setValue(request.key);
			return null;
		case 'connected':
			return (await apiKey.getValue()) !== null;
		case 'disconnect':
			needsOwnPage();
			// Revoke the key on the server first, so a copy of it can't be used afterwards.
			await api('DELETE', 'key');
			await apiKey.removeValue();
			return null;
		case 'account':
			needsOwnPage();
			return api<AccountInfo>('GET', 'account');
		case 'siteAliases': {
			needsOwnSite(request.site);
			const query = new URLSearchParams({ site: request.site });
			return (await api<{ addresses: string[] }>('GET', `aliases?${query}`)).addresses;
		}
		case 'createAlias':
			needsOwnSite(request.site);
			return createAlias(request.site);
	}
}

export default defineBackground(() => {
	// Content scripts run in web pages' processes and need only the settings; the key stays out of
	// their reach. Firefox has no such setting, which is why they also never ask for it.
	void browser.storage.local.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });

	browser.commands.onCommand.addListener(async (command, tab) => {
		// The browser's own pages have no content script and nothing to fill.
		if (command !== 'fill-alias' || tab?.id === undefined || !tab.url?.startsWith('http')) return;
		await browser.tabs
			.sendMessage(tab.id, { type: 'fillFocused' } satisfies TabRequest)
			.catch((cause) => {
				// Tabs opened before the extension was installed need a reload to get the script.
				console.info('The page has no delitesco content script yet', cause);
			});
	});

	browser.runtime.onMessage.addListener((request: Request, sender, sendResponse) => {
		handle(request, sender.url)
			.then(
				(value): Reply<unknown> => ({ ok: true, value }),
				(problem): Reply<unknown> => {
					if (problem instanceof Problem) return { ok: false, problem: problem.message };
					// A bug rather than something the user can fix: keep it visible here,
					// and still answer so the page isn't left waiting.
					console.error(problem);
					return { ok: false, problem: 'Something went wrong in the extension.' };
				}
			)
			.then(sendResponse);
		// Keeps the channel open for the asynchronous reply.
		return true;
	});
});
