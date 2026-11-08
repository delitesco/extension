import { browser, defineContentScript, type WxtStorageItem } from '#imports';
import { APP_ORIGIN } from '@/lib/config';
import { createFieldButton } from '@/lib/field-button';
import { fill, isEmailField } from '@/lib/fill';
import { send, type TabRequest } from '@/lib/messages';
import { siteOf } from '@/lib/site';
import { apiKey, fieldButton, hiddenSites } from '@/lib/storage';

// The other half is the delitesco page at /extension/connect.
function answerConnectPage() {
	addEventListener('message', async (event) => {
		if (event.source !== window || event.origin !== location.origin) return;

		if (event.data?.type === 'delitesco:ping') {
			postMessage({ type: 'delitesco:pong' }, location.origin);
		}
		if (event.data?.type === 'delitesco:connect' && typeof event.data.key === 'string') {
			const reply = await send({ type: 'connect', key: event.data.key });
			if (reply.ok) postMessage({ type: 'delitesco:connected' }, location.origin);
		}
	});
}

/** Loads a setting and keeps it current, so changes apply without reloading the page. */
async function live<T>(item: WxtStorageItem<T, Record<string, unknown>>) {
	const current: { value: T } = { value: await item.getValue() };
	item.watch((value) => (current.value = value));
	return current;
}

async function watchEmailFields() {
	const site = siteOf(location);
	const button = createFieldButton(site);
	const [key, enabled, hidden] = await Promise.all([
		live(apiKey),
		live(fieldButton),
		live(hiddenSites)
	]);
	let lastField: HTMLInputElement | null = null;

	addEventListener(
		'focusin',
		(event) => {
			if (!isEmailField(event.target)) return;
			lastField = event.target;
			// Before the extension is connected the button could only show an error.
			if (key.value && enabled.value && !hidden.value.includes(site)) button.show(event.target);
		},
		true
	);
	addEventListener('focusout', (event) => event.target === lastField && button.hide(), true);

	browser.runtime.onMessage.addListener((request: TabRequest, _sender, sendResponse) => {
		if (request.type === 'fillFocused') {
			if (isEmailField(document.activeElement)) button.fillNow(document.activeElement);
			return;
		}
		if (lastField?.isConnected) fill(lastField, request.address);
		sendResponse(lastField?.isConnected ?? false);
	});
}

export default defineContentScript({
	matches: ['http://*/*', 'https://*/*'],
	main() {
		if (location.origin === APP_ORIGIN) answerConnectPage();
		else watchEmailFields();
	}
});
