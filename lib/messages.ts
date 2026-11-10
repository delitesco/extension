import { browser } from '#imports';

export interface AliasDomain {
	name: string;
	/** The account's own domain rather than a shared one. */
	own: boolean;
}

export interface Mailbox {
	id: string;
	address: string;
	main: boolean;
}

export interface AccountInfo {
	/** Last four digits of the account number, so the user can tell which account this is. */
	numberEnd: string;
	daysLeft: number;
	domains: AliasDomain[];
	/** Confirmed forwarding addresses, the main one first. */
	mailboxes: Mailbox[];
}

/**
 * Messages the content script, popup and settings page send to the background script. A content
 * script may only connect, ask whether the extension is connected, and make or look up aliases
 * for the site it runs on.
 */
export type Request =
	| { type: 'connect'; key: string }
	| { type: 'connected' }
	| { type: 'disconnect' }
	| { type: 'account' }
	| { type: 'siteAliases'; site: string }
	/** Uses the domain, forwarding address and address style from the settings. */
	| { type: 'createAlias'; site: string };

interface Replies {
	connect: null;
	connected: boolean;
	disconnect: null;
	account: AccountInfo;
	siteAliases: string[];
	createAlias: string;
}

export type Reply<T> = { ok: true; value: T } | { ok: false; problem: string };

export function send<R extends Request>(request: R): Promise<Reply<Replies[R['type']]>> {
	return browser.runtime.sendMessage(request);
}

/**
 * Messages to a page's content script: the popup fills in an address it picked,
 * the keyboard shortcut asks for the site's alias in the focused field.
 */
export type TabRequest = { type: 'fill'; address: string } | { type: 'fillFocused' };
