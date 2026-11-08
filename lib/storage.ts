import { storage } from '#imports';

/** The key from the connect page. The background script uses it; others only check it's set. */
export const apiKey = storage.defineItem<string>('local:apiKey');

// Settings sync between the user's browsers; the key stays on this one.

/** Domain for new aliases. Null means the main shared domain. */
export const defaultDomain = storage.defineItem<string | null>('sync:defaultDomain', {
	fallback: null
});

/** Mailbox id new aliases forward to. Null means the account's main forwarding address. */
export const forwardTo = storage.defineItem<string | null>('sync:forwardTo', { fallback: null });

/** Leaves the site's name out of new addresses: "x7k2m9q1@…" instead of "github.x7k2m9@…". */
export const randomOnly = storage.defineItem<boolean>('sync:randomOnly', { fallback: false });

export const fieldButton = storage.defineItem<boolean>('sync:fieldButton', { fallback: true });

/** The field button fills in the alias already made for the site instead of making a new one. */
export const reuseSiteAlias = storage.defineItem<boolean>('sync:reuseSiteAlias', {
	fallback: true
});

/** Sites where the field button stays hidden. */
export const hiddenSites = storage.defineItem<string[]>('sync:hiddenSites', { fallback: [] });
