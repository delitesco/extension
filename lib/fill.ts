// Frameworks like React track the value through the native setter, so a plain
// `input.value = …` would be overwritten on their next render.
function nativeValueSetter() {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	if (!setter) throw new Error('HTMLInputElement has no value setter');
	return setter;
}

const setValue = nativeValueSetter();

export function fill(input: HTMLInputElement, value: string) {
	setValue.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Borrowed from the SimpleLogin extension (MIT), plus the autocomplete hint sites are meant to use.
const EMAIL_FIELD =
	'input[type="email"], input[autocomplete~="email" i], input[name*="email" i], input[id*="email" i]';

export function isEmailField(element: EventTarget | null): element is HTMLInputElement {
	return (
		element instanceof HTMLInputElement &&
		element.matches(EMAIL_FIELD) &&
		// Excludes checkboxes like "email me updates" that match by name.
		(element.type === 'email' || element.type === 'text') &&
		!element.disabled &&
		!element.readOnly
	);
}
