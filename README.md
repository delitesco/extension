# delitesco browser extension

Fills in a private email alias wherever a site asks for your email.

- A small button appears inside an email field when you focus it. It fills in the alias you already
  made for this site, or makes one the first time. Alt+Shift+E does the same from the keyboard.
- The toolbar button stays short: the aliases made for the current site, a button for a new one,
  and a link to hide the field button on that site.
- Settings (the sliders icon in the toolbar button, or the extension's options) hold the rest: the
  connected account and its paid time, the domain and forwarding address for new aliases, whether
  addresses start with the site's name, the field button and its reuse, the keyboard shortcut, and
  the sites the button is hidden on. Settings sync between your browsers; the key doesn't.

Built with [WXT](https://wxt.dev) and Svelte. Chrome uses Manifest V3; Firefox gets Manifest V2.

## How it connects

The extension never sees your account number. "Connect delitesco" opens `/extension/connect` on
the site, where you press Allow. The site creates a key for the extension and hands it over to the
extension's content script on that page. Only the hash of the key is stored on the server.
Disconnecting from the extension, or from Account → Security on the site, revokes the key.

The extension calls these endpoints with the key:

- `GET /api/v1/aliases?site=github.com` returns the aliases made for a site.
- `POST /api/v1/aliases` with `{ "site": "github.com", "domain"?, "mailboxIds"?, "randomOnly"? }`
  makes one. Without a domain or mailboxes it uses the main shared domain and forwarding address.
- `GET /api/v1/account` returns the account number's last digits, the days of paid time left, and
  the domains and confirmed forwarding addresses new aliases can use.
- `DELETE /api/v1/key` revokes the extension's key.

## Development

```sh
cp .env.example .env   # points the extension at http://localhost:5173
npm install
npm run dev            # opens a browser with the extension loaded
npm run dev:firefox
```

To load a build by hand: `npm run build`, then in Chrome open `chrome://extensions`, turn on
Developer mode and choose "Load unpacked" with `.output/chrome-mv3`.

`npm run zip` and `npm run zip:firefox` make the packages for the stores. Without `WXT_APP_URL`
the extension talks to https://delitesco.net.

## Credits

The way email fields are found comes from the
[SimpleLogin browser extension](https://github.com/simple-login/browser-extension),
Copyright (c) SimpleLogin, used under the MIT License.
