# Contributing

Thanks for taking the time. Before working on a new feature, please open an issue to talk about it, so
the work isn't duplicated or turned down after the fact. Security problems: see [SECURITY.md](SECURITY.md),
never a public issue.

## Setting up

Node 22. Then see "Development" in the [README](README.md). To try the extension you need a running
delitesco site (see [delitesco/app](https://github.com/delitesco/app)) that `WXT_APP_URL` points to.

## Before you open a pull request

```sh
npm run check    # types and Svelte checks
npm run lint     # formatting (npm run format fixes it)
npm run build
npm run build:firefox
```

The same checks run on every pull request.

## Style

- Keep changes small and focused; one idea per pull request.
- Write comments that say why, not what the next line does.
- Ask for as few browser permissions as possible. A new permission needs a reason in the pull request.
- Nothing about the user's browsing leaves the browser except the site's domain, and only when the user
  asks for an alias. No analytics, no third-party requests.
- A content script runs in the page's process: it must never read the API key or trust the page. Ask the
  background script, and let it check who is asking.

## Licence

By contributing you agree that your work is released under the GNU Affero General Public License v3,
like the rest of the project.
