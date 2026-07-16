/** Lightweight RSS/Atom parser — no dependencies, DOMParser only. */

export interface ParsedFeedItem {
  id: string;
  title: string;
  url: string;
  publishedAt: number;
  summary?: string;
}

export interface ParsedFeed {
  title: string;
  items: ParsedFeedItem[];
}

export class FeedError extends Error {
  kind: "cors" | "http" | "parse" | "offline";
  constructor(kind: FeedError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

function textContent(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

function first(parent: Element | Document, selectors: string[]): Element | null {
  for (const sel of selectors) {
    const el = parent.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function attr(el: Element | null, name: string): string {
  return el?.getAttribute(name)?.trim() ?? "";
}

function parseDate(raw: string): number {
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function hashId(parts: string[]): string {
  const s = parts.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `i${Math.abs(h)}`;
}

function parseRss(doc: Document): ParsedFeed {
  const channel = doc.querySelector("channel") ?? doc.documentElement;
  const title = textContent(first(channel, ["title"])) || "Feed";
  const items: ParsedFeedItem[] = [];

  channel.querySelectorAll("item").forEach((item) => {
    const itemTitle = textContent(first(item, ["title"])) || "Untitled";
    const link =
      textContent(first(item, ["link"])) ||
      attr(first(item, ["link"]), "href") ||
      textContent(first(item, ["guid"]));
    const published =
      textContent(first(item, ["pubDate", "published", "dc\\:date", "date"])) ||
      "";
    const guid = textContent(first(item, ["guid", "id"])) || link || itemTitle;
    const summary = textContent(first(item, ["description", "summary", "content\\:encoded"]));
    if (!link && !itemTitle) return;
    items.push({
      id: hashId([guid, link, itemTitle]),
      title: itemTitle,
      url: link || "#",
      publishedAt: parseDate(published),
      summary: summary ? summary.replace(/<[^>]+>/g, "").slice(0, 180) : undefined,
    });
  });

  return { title, items };
}

function parseAtom(doc: Document): ParsedFeed {
  const feed = doc.querySelector("feed") ?? doc.documentElement;
  const title = textContent(first(feed, ["title"])) || "Feed";
  const items: ParsedFeedItem[] = [];

  feed.querySelectorAll("entry").forEach((entry) => {
    const itemTitle = textContent(first(entry, ["title"])) || "Untitled";
    const linkEl =
      entry.querySelector("link[rel='alternate']") ||
      entry.querySelector("link[href]") ||
      entry.querySelector("link");
    const link = attr(linkEl, "href") || textContent(linkEl);
    const published =
      textContent(first(entry, ["updated", "published"])) || "";
    const guid = textContent(first(entry, ["id"])) || link || itemTitle;
    const summary = textContent(first(entry, ["summary", "content"]));
    if (!link && !itemTitle) return;
    items.push({
      id: hashId([guid, link, itemTitle]),
      title: itemTitle,
      url: link || "#",
      publishedAt: parseDate(published),
      summary: summary ? summary.replace(/<[^>]+>/g, "").slice(0, 180) : undefined,
    });
  });

  return { title, items };
}

export function parseFeedXml(xml: string): ParsedFeed {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new FeedError("parse", "That response doesn't look like an RSS or Atom feed.");

  if (doc.querySelector("feed")) return parseAtom(doc);
  if (doc.querySelector("channel") || doc.querySelector("rss")) return parseRss(doc);
  // Some Atom feeds lack a top-level sniff — try entry
  if (doc.querySelector("entry")) return parseAtom(doc);
  throw new FeedError("parse", "Couldn't recognize this as RSS or Atom.");
}

export async function fetchFeed(url: string): Promise<ParsedFeed> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/feed+json, application/atom+xml, application/rss+xml, application/xml, text/xml, */*" },
    });
  } catch {
    throw new FeedError(
      "offline",
      "Couldn't reach that feed. You may be offline, or the browser blocked the request (CORS)."
    );
  }

  if (!res.ok) {
    if (res.status === 0) {
      throw new FeedError("cors", "This feed blocked the browser request (CORS).");
    }
    throw new FeedError("http", `Feed returned HTTP ${res.status}.`);
  }

  const text = await res.text();
  return parseFeedXml(text);
}
