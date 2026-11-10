# Security policy

## Supported versions

Security fixes go to the latest version on the `main` branch, and to the version in the browser stores.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub:
**Security → Report a vulnerability** on this repository. If that is not available to you, write to
[security@delitesco.net](mailto:security@delitesco.net).

Include the affected version, the steps to reproduce and the impact you expect. We will acknowledge the
report, keep you informed and credit you in the fix unless you prefer not to be named.

## What is in scope

- A web page reading the extension's API key, or making the extension act for a site other than its own.
- The extension sending anything about the user's browsing besides the site's domain, and only when the
  user asks for an alias.
- Another site getting the key handed over by pretending to be the connect page.

Problems in the delitesco service itself belong to
[delitesco/app](https://github.com/delitesco/app) and, for mail handling,
[delitesco/core](https://github.com/delitesco/core).
