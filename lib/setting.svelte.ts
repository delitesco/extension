import type { WxtStorageItem } from '#imports';

/**
 * A stored setting as Svelte state: it follows changes made elsewhere,
 * and assigning to `value` saves it.
 */
export function setting<T>(item: WxtStorageItem<T, Record<string, unknown>>) {
	let value = $state(item.fallback);
	let loaded = $state(false);

	item.getValue().then((stored) => {
		value = stored;
		loaded = true;
	});
	item.watch((stored) => (value = stored));

	return {
		get value() {
			return value;
		},
		set value(next: T) {
			value = next;
			item.setValue(next);
		},
		get loaded() {
			return loaded;
		}
	};
}
