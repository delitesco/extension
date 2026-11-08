import { browser, defineBackground } from '#imports';
import { APP_ORIGIN } from '@/lib/config';
import type { AccountInfo, Reply, Request, TabRequest } from '@/lib/messages';
import { apiKey, defaultDomain, forwardTo, randomOnly } from '@/lib/storage';

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

	const response = await fetch(`${APP_ORIGIN}/api/v1/${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${key}`,
			...(body && { 'Content-Type': 'application/json' })
		},
		body: body && JSON.stringify(body)
	}).catch((cause) => {
		// The browser hides the reason from scripts; its own console usually says more.
		console.error(`Request to ${APP_ORIGIN} failed`, cause);
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
	switch (request.type) {
		case 'connect':
			// Only the delitesco connect page may hand over a key, never another site.
			if (!senderUrl || new URL(senderUrl).origin !== APP_ORIGIN) {
				throw new Problem('Keys are only accepted from delitesco.');
			}
			await apiKey.setValue(request.key);
			return null;
		case 'disconnect':
			// Revoke the key on the server first, so a copy of it can't be used afterwards.
			await api('DELETE', 'key');
			await apiKey.removeValue();
			return null;
		case 'account':
			return api<AccountInfo>('GET', 'account');
		case 'siteAliases': {
			const query = new URLSearchParams({ site: request.site });
			return (await api<{ addresses: string[] }>('GET', `aliases?${query}`)).addresses;
		}
		case 'createAlias':
			return createAlias(request.site);
	}
}

export default defineBackground(() => {
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
