# delitesco browser extension

Fills in a private email alias wherever a site asks for your email. It works with
[delitesco](https://delitesco.net), an email alias service you pay for by time, with no email or
password to sign up.

- A small button appears inside an email field when you focus it. It fills in the alias you already
  made for this site, or makes one the first time. Alt+Shift+E does the same from the keyboard.
- The toolbar button stays short: the aliases made for the current site, a button for a new one,
  and a link to hide the field button on that site.
- Settings (the sliders icon in the toolbar button, or the extension's options) hold the rest: the
  connected account and its paid time, the domain and forwarding address for new aliases, whether
  addresses start with the site's name, the field button and its reuse, the keyboard shortcut, and
  the sites the button is hidden on. Settings sync between your browsers; the key doesn't.

Built with [WXT](https://wxt.dev) and Svelte. Chrome uses Manifest V3; Firefox gets Manifest V2.

The service itself is two other projects: [delitesco/app](https://github.com/delitesco/app), the web app
this extension talks to, and [delitesco/core](https://github.com/delitesco/core), the mail engine.

## What it does with your data

- The extension never sees your account number. "Connect delitesco" opens `/extension/connect` on
  the site, where you press Allow. The site creates a key for the extension and hands it over to the
  extension's content script on that page. Only the hash of the key is stored on the server.
  Disconnecting from the extension, or from Account → Security on the site, revokes the key.
- Pages you visit are never sent anywhere. It looks for email fields inside your browser. The only thing
  it sends is the site's domain (for example `example.com`), when you press its button, use its shortcut
  or open its toolbar button, so the alias for that site can be found or made.
- The key lives in the extension's own storage. Content scripts, which run inside web pages, never read
  it: they ask the background script whether the extension is connected, and a page can only look up or
  make aliases for its own site.
- The field button lives in a closed shadow root and only answers real clicks, so a page's scripts can't
  click it for you.
- No analytics, no ads, no requests to third parties.

## Permissions

| Permission                                                     | Why                                                                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `storage`                                                      | Settings and the key                                                                               |
| `activeTab`                                                    | The toolbar button and the shortcut read the address of the tab you are on                         |
| `https://delitesco.net/*`, `https://alias-api.delitesco.net/*` | Calls the API with the key, and lets the connect page hand the key over                            |
| Content script on `http://*/*` and `https://*/*`               | Finds email fields on any site you sign up on and shows the small button; it reads no page content |

## How it connects

The extension calls these endpoints, on the API host, with the key:

- `GET /api/v1/aliases?site=github.com` returns the aliases made for a site.
- `POST /api/v1/aliases` with `{ "site": "github.com", "domain"?, "mailboxIds"?, "randomOnly"? }`
  makes one. Without a domain or mailboxes it uses the main shared domain and forwarding address.
- `GET /api/v1/account` returns the account number's last digits, the days of paid time left, and
  the domains and confirmed forwarding addresses new aliases can use.
- `DELETE /api/v1/key` revokes the extension's key.

## Development

Needs Node 22.

```sh
cp .env.example .env   # points the extension at http://localhost:5173
npm ci
npm run dev            # opens a browser with the extension loaded
npm run dev:firefox
npm run check          # types and Svelte checks
```

You need a running delitesco site for `WXT_APP_URL` to point to (see
[delitesco/app](https://github.com/delitesco/app)).

To load a build by hand: `npm run build`, then in Chrome open `chrome://extensions`, turn on
Developer mode and choose "Load unpacked" with `.output/chrome-mv3`. For Firefox, `npm run build:firefox`
and load `.output/firefox-mv2` from `about:debugging`.

Two addresses are baked into a build: the site (`WXT_APP_URL`, for the connect page and links into
the account) and the API (`WXT_API_URL`, where API calls go). Without either, a build uses
https://delitesco.net and https://alias-api.delitesco.net. With only `WXT_APP_URL` set, as in
development, the API is expected on the same address. A production build that sets `WXT_APP_URL`
must set `WXT_API_URL` too.

## Building the packages for the stores

```sh
rm -f .env             # a local .env would put its addresses into the package
npm ci
npm run zip            # Chrome: .output/delitesco-extension-<version>-chrome.zip
npm run zip:firefox    # Firefox: the same, plus -sources.zip with this source code
```

This is also how a reviewer can rebuild the package from the source: the output is built from the files in
this repository and `package-lock.json`, with Node 22.

## Licence

GNU Affero General Public License v3 (see [LICENSE](LICENSE)). Security: [SECURITY.md](SECURITY.md).
Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Code borrowed from other projects is listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
