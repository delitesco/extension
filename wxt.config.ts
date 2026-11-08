import { existsSync } from 'node:fs';
import { defineConfig } from 'wxt';

if (existsSync('.env')) process.loadEnvFile();

// The delitesco site, where people connect and manage their account: http://localhost:5173
// while developing.
const appUrl = new URL(process.env.WXT_APP_URL ?? 'https://delitesco.net').origin;
// Where API calls go. In production that's the API host; while developing the site serves it.
const apiUrl = new URL(
	process.env.WXT_API_URL ?? (process.env.WXT_APP_URL ? appUrl : 'https://alias-api.delitesco.net')
).origin;

export default defineConfig({
	modules: ['@wxt-dev/module-svelte', '@wxt-dev/auto-icons'],
	autoIcons: { baseIconPath: 'assets/icon.svg' },
	manifest: {
		name: 'delitesco',
		description: 'Fill in a private email alias wherever a site asks for your email.',
		permissions: ['storage', 'activeTab'],
		host_permissions: [...new Set([appUrl, apiUrl])].map((origin) => `${origin}/*`),
		commands: {
			'fill-alias': {
				suggested_key: { default: 'Alt+Shift+E' },
				description: "Fill in the site's alias in the focused email field"
			}
		}
	},
	vite: () => ({
		define: {
			'import.meta.env.WXT_APP_URL': JSON.stringify(appUrl),
			'import.meta.env.WXT_API_URL': JSON.stringify(apiUrl)
		},
		// Chrome ignores module preloads on extension pages and warns about each one;
		// the files are local anyway, so there is nothing to gain from preloading.
		build: { modulePreload: false }
	})
});
