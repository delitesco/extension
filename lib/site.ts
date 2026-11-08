/** Hostname without "www.", the way aliases remember their site. */
export function siteOf(url: URL | Location): string {
	return url.hostname.replace(/^www\./, '');
}
