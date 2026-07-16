import type { EngineId, Shortcut } from "./types";

export interface Engine {
  id: EngineId;
  name: string;
  url: (query: string) => string;
}

export const ENGINES: Engine[] = [
  { id: "duckduckgo", name: "DuckDuckGo", url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  { id: "google", name: "Google", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: "bing", name: "Bing", url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { id: "brave", name: "Brave Search", url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
  { id: "startpage", name: "Startpage", url: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}` },
];

export function engineById(id: EngineId): Engine {
  return ENGINES.find((e) => e.id === id) ?? ENGINES[0];
}

/** Bang shortcuts, usable anywhere in the query. */
export const BANGS: Record<string, { name: string; url: (query: string) => string }> = {
  "!g": { name: "Google", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  "!ddg": { name: "DuckDuckGo", url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  "!b": { name: "Bing", url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  "!br": { name: "Brave Search", url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
  "!yt": { name: "YouTube", url: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  "!gh": { name: "GitHub", url: (q) => `https://github.com/search?q=${encodeURIComponent(q)}` },
  "!w": { name: "Wikipedia", url: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}` },
  "!maps": { name: "Google Maps", url: (q) => `https://www.google.com/maps/search/${encodeURIComponent(q)}` },
  "!npm": { name: "npm", url: (q) => `https://www.npmjs.com/search?q=${encodeURIComponent(q)}` },
  "!mdn": { name: "MDN", url: (q) => `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}` },
  "!so": { name: "Stack Overflow", url: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}` },
  "!r": { name: "Reddit", url: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}` },
};

const BANG_RE = /(^|\s)(!\w+)(?=\s|$)/;

export interface ParsedQuery {
  /** Query text with the bang token removed. */
  query: string;
  /** The matched bang, if any. */
  bang: string | null;
  /** Site the search will go to. */
  targetName: string;
  /** Build the final URL for the cleaned query. */
  buildUrl: (query: string) => string;
}

/** Extract a bang token from anywhere in the input and resolve the target. */
export function parseQuery(input: string, defaultEngine: EngineId): ParsedQuery {
  const match = input.match(BANG_RE);
  if (match && BANGS[match[2]]) {
    const bang = BANGS[match[2]];
    const query = input.replace(match[0], match[1]).replace(/\s+/g, " ").trim();
    return { query, bang: match[2], targetName: bang.name, buildUrl: bang.url };
  }
  const engine = engineById(defaultEngine);
  const cleaned = input.trim();
  return { query: cleaned, bang: null, targetName: engine.name, buildUrl: engine.url };
}

/** True when the input looks like a bare URL or domain rather than a search. */
export function looksLikeUrl(input: string): boolean {
  const t = input.trim();
  if (/\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return true;
  // domain.tld or domain.tld/path, and not a known bang
  return /^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(t) && !t.startsWith("!");
}

/** Prepend https:// when the scheme is missing; returns "" for empty input. */
export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Rough validation for the add-shortcut dialog. */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && (u.hostname.includes(".") || u.hostname === "localhost");
  } catch {
    return false;
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Deterministic hue (0-359) from a string, for avatar tints. */
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
}

/** Shortcuts whose name or hostname contains the query (case-insensitive). */
export function matchShortcuts(shortcuts: Shortcut[], query: string, limit = 5): Shortcut[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return shortcuts
    .filter((s) => s.name.toLowerCase().includes(q) || hostnameOf(s.url).toLowerCase().includes(q))
    .slice(0, limit);
}

/** Recent searches containing the query, most recent first. */
export function matchRecents(recents: string[], query: string, limit = 5): string[] {
  const q = query.trim().toLowerCase();
  const pool = q ? recents.filter((r) => r.toLowerCase().includes(q) && r.toLowerCase() !== q) : recents;
  return pool.slice(0, limit);
}

/** Push a query onto the recent-searches list (unique, most-recent-first, capped). */
export function pushRecent(recents: string[], query: string, cap = 15): string[] {
  const q = query.trim();
  if (!q) return recents;
  return [q, ...recents.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, cap);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}
