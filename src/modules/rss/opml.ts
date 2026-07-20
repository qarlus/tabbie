/** Parse OPML outline xml for RSS feed URLs. */

export interface OpmlFeed {
  title: string;
  url: string;
}

function attrValue(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m?.[1]?.trim() ?? null;
}

/** Extract xmlUrl / htmlUrl from OPML outline elements. */
export function parseOpml(xml: string): OpmlFeed[] {
  const feeds: OpmlFeed[] = [];
  const seen = new Set<string>();

  // Match self-closing and paired outline tags
  const outlineRe = /<outline\b[^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = outlineRe.exec(xml)) !== null) {
    const tag = match[0];
    const xmlUrl = attrValue(tag, "xmlUrl") ?? attrValue(tag, "xmlurl");
    if (!xmlUrl || seen.has(xmlUrl)) continue;
    seen.add(xmlUrl);
    const title =
      attrValue(tag, "title") ??
      attrValue(tag, "text") ??
      attrValue(tag, "htmlUrl") ??
      xmlUrl;
    feeds.push({ title, url: xmlUrl });
  }

  return feeds;
}
