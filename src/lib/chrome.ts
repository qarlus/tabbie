/**
 * Chrome extension capability layer.
 * CapTab is extension-first (new tab). Browser APIs are optional and gated.
 */

export type ChromePermission =
  | "bookmarks"
  | "history"
  | "topSites"
  | "sessions"
  | "downloads"
  | "tabs"
  | "clipboardRead";

type ChromeBookmarksApi = {
  getTree: (callback: (results: ChromeBookmarkNode[]) => void) => void;
  getSubTree: (id: string, callback: (results: ChromeBookmarkNode[]) => void) => void;
  getRecent: (numberOfItems: number, callback: (results: ChromeBookmarkNode[]) => void) => void;
  onCreated: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
  onRemoved: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
  onChanged: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
  onMoved: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
};

type ChromeHistoryItem = {
  id?: string;
  url?: string;
  title?: string;
  lastVisitTime?: number;
  visitCount?: number;
  typedCount?: number;
};

type ChromeHistoryApi = {
  search: (
    query: { text: string; maxResults?: number; startTime?: number; endTime?: number },
    callback: (results: ChromeHistoryItem[]) => void
  ) => void;
};

type ChromeTopSite = {
  url: string;
  title: string;
};

type ChromeTopSitesApi = {
  get: (callback: (data: ChromeTopSite[]) => void) => void;
};

type ChromeSessionTab = {
  url?: string;
  title?: string;
  favIconUrl?: string;
};

type ChromeSessionWindow = {
  tabs?: ChromeSessionTab[];
};

type ChromeSession = {
  lastModified?: number;
  tab?: ChromeSessionTab;
  window?: ChromeSessionWindow;
};

type ChromeSessionsApi = {
  getRecentlyClosed: (
    filter: { maxResults?: number } | undefined,
    callback: (sessions: ChromeSession[]) => void
  ) => void;
  restore?: (sessionId: string, callback?: (session: ChromeSession) => void) => void;
};

type ChromeDownloadItem = {
  id: number;
  url: string;
  filename: string;
  exists?: boolean;
  state?: string;
  endTime?: string;
  startTime?: string;
  mime?: string;
};

type ChromeDownloadsApi = {
  search: (
    query: { limit?: number; orderBy?: string[]; state?: string },
    callback: (results: ChromeDownloadItem[]) => void
  ) => void;
  show: (downloadId: number) => void;
  open?: (downloadId: number) => void;
};

type ChromeTab = {
  id?: number;
  index?: number;
  windowId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  active?: boolean;
  pinned?: boolean;
};

type ChromeTabsApi = {
  query: (
    queryInfo: { currentWindow?: boolean; active?: boolean; windowId?: number },
    callback: (tabs: ChromeTab[]) => void
  ) => void;
  create: (
    createProperties: { url?: string; active?: boolean; index?: number },
    callback?: (tab: ChromeTab) => void
  ) => void;
  update?: (tabId: number, updateProperties: { active?: boolean }, callback?: (tab: ChromeTab) => void) => void;
  remove?: (tabIds: number | number[], callback?: () => void) => void;
};

type ChromeWindowsApi = {
  update?: (windowId: number, updateInfo: { focused?: boolean }, callback?: () => void) => void;
};

type ChromePermissionsApi = {
  contains: (
    permissions: { permissions?: string[] },
    callback: (result: boolean) => void
  ) => void;
  request: (
    permissions: { permissions?: string[] },
    callback?: (granted: boolean) => void
  ) => void;
  remove: (
    permissions: { permissions?: string[] },
    callback?: (removed: boolean) => void
  ) => void;
};

type ChromeRuntimeApi = {
  id?: string;
  lastError?: { message?: string };
  getURL: (path: string) => string;
};

export type ChromeBookmarkNode = {
  id: string;
  parentId?: string;
  title: string;
  url?: string;
  dateAdded?: number;
  children?: ChromeBookmarkNode[];
};

export type HistoryEntry = {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
  typedCount: number;
};

export type ClosedEntry = {
  id: string;
  url: string;
  title: string;
  lastModified: number;
};

export type TopSiteEntry = {
  url: string;
  title: string;
};

export type DownloadEntry = {
  id: number;
  url: string;
  filename: string;
  basename: string;
  exists: boolean;
  endTime: number | null;
};

export type WindowTabEntry = {
  id: number | null;
  url: string;
  title: string;
  pinned: boolean;
};

export type OpenTabEntry = WindowTabEntry & {
  windowId: number | null;
  active: boolean;
  favIconUrl?: string;
};

export type BookmarkSearchEntry = {
  id: string;
  title: string;
  url: string;
};

type ChromeGlobal = {
  runtime?: ChromeRuntimeApi;
  bookmarks?: ChromeBookmarksApi;
  history?: ChromeHistoryApi;
  topSites?: ChromeTopSitesApi;
  sessions?: ChromeSessionsApi;
  downloads?: ChromeDownloadsApi;
  tabs?: ChromeTabsApi;
  windows?: ChromeWindowsApi;
  permissions?: ChromePermissionsApi;
};

function chromeApi(): ChromeGlobal | undefined {
  return typeof globalThis !== "undefined"
    ? (globalThis as unknown as { chrome?: ChromeGlobal }).chrome
    : undefined;
}

/** True when running as an installed extension (not a bare Vite page). */
export function isExtension(): boolean {
  try {
    return Boolean(chromeApi()?.runtime?.id);
  } catch {
    return false;
  }
}

function lastErrorMessage(): string | undefined {
  return chromeApi()?.runtime?.lastError?.message;
}

function promisify<T>(run: (cb: (value: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      run((value) => {
        const err = lastErrorMessage();
        if (err) reject(new Error(err));
        else resolve(value);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export async function hasPermission(permission: ChromePermission): Promise<boolean> {
  const permissions = chromeApi()?.permissions;
  if (!permissions?.contains) return false;
  return promisify<boolean>((cb) => permissions.contains({ permissions: [permission] }, cb));
}

/** Prompt the user for an optional permission. Must be called from a user gesture. */
export async function requestPermission(permission: ChromePermission): Promise<boolean> {
  const permissions = chromeApi()?.permissions;
  if (!permissions?.request) return false;
  return promisify<boolean>((cb) => permissions.request({ permissions: [permission] }, cb));
}

/** Drop an optional permission. Must be called from a user gesture. */
export async function removePermission(permission: ChromePermission): Promise<boolean> {
  const permissions = chromeApi()?.permissions;
  if (!permissions?.remove) return false;
  return promisify<boolean>((cb) => permissions.remove({ permissions: [permission] }, cb));
}

export async function getBookmarkTree(): Promise<ChromeBookmarkNode[]> {
  const bookmarks = chromeApi()?.bookmarks;
  if (!bookmarks?.getTree) throw new Error("Bookmarks API unavailable.");
  return promisify<ChromeBookmarkNode[]>((cb) => bookmarks.getTree(cb));
}

export async function getBookmarkSubTree(id: string): Promise<ChromeBookmarkNode | null> {
  const bookmarks = chromeApi()?.bookmarks;
  if (!bookmarks?.getSubTree) throw new Error("Bookmarks API unavailable.");
  const results = await promisify<ChromeBookmarkNode[]>((cb) => bookmarks.getSubTree(id, cb));
  return results[0] ?? null;
}

export async function getRecentBookmarks(count = 40): Promise<ChromeBookmarkNode[]> {
  const bookmarks = chromeApi()?.bookmarks;
  if (!bookmarks?.getRecent) throw new Error("Bookmarks API unavailable.");
  return promisify<ChromeBookmarkNode[]>((cb) => bookmarks.getRecent(count, cb));
}

/** Subscribe to bookmark mutations; returns an unsubscribe. */
export function watchBookmarks(onChange: () => void): () => void {
  const bookmarks = chromeApi()?.bookmarks;
  if (!bookmarks) return () => undefined;

  const events = [bookmarks.onCreated, bookmarks.onRemoved, bookmarks.onChanged, bookmarks.onMoved];
  for (const ev of events) ev.addListener(onChange);
  return () => {
    for (const ev of events) ev.removeListener(onChange);
  };
}

/** Chrome’s usual root folder ids. */
export const BOOKMARK_ROOT = {
  bar: "1",
  other: "2",
  mobile: "3",
} as const;

function isHttpUrl(url: string | undefined): url is string {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function basenamePath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

/** Recent history visits (http/https only). */
export async function getRecentHistory(count = 24): Promise<HistoryEntry[]> {
  const history = chromeApi()?.history;
  if (!history?.search) throw new Error("History API unavailable.");
  const results = await promisify<ChromeHistoryItem[]>((cb) =>
    history.search({ text: "", maxResults: Math.max(count * 2, 40), startTime: 0 }, cb)
  );
  const out: HistoryEntry[] = [];
  const seen = new Set<string>();
  for (const item of results) {
    if (!isHttpUrl(item.url)) continue;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    out.push({
      id: item.id ?? item.url,
      url: item.url,
      title: item.title?.trim() || item.url,
      lastVisitTime: item.lastVisitTime ?? 0,
      visitCount: item.visitCount ?? 0,
      typedCount: item.typedCount ?? 0,
    });
    if (out.length >= count) break;
  }
  return out;
}

/** Frequent sites from history (visitCount / typedCount). */
export async function getFrequentHistory(count = 16): Promise<HistoryEntry[]> {
  const history = chromeApi()?.history;
  if (!history?.search) throw new Error("History API unavailable.");
  const results = await promisify<ChromeHistoryItem[]>((cb) =>
    history.search({ text: "", maxResults: 200, startTime: 0 }, cb)
  );
  return results
    .filter((item): item is ChromeHistoryItem & { url: string } => isHttpUrl(item.url))
    .map((item) => ({
      id: item.id ?? item.url,
      url: item.url,
      title: item.title?.trim() || item.url,
      lastVisitTime: item.lastVisitTime ?? 0,
      visitCount: item.visitCount ?? 0,
      typedCount: item.typedCount ?? 0,
    }))
    .sort((a, b) => b.visitCount + b.typedCount * 2 - (a.visitCount + a.typedCount * 2))
    .slice(0, count);
}

/** Count distinct local days with visits to any of the given host suffixes. */
export async function countVisitDayStreak(hostSuffixes: string[]): Promise<number> {
  const history = chromeApi()?.history;
  if (!history?.search) return 0;
  const results = await promisify<ChromeHistoryItem[]>((cb) =>
    history.search(
      { text: "", maxResults: 500, startTime: Date.now() - 90 * 24 * 60 * 60 * 1000 },
      cb
    )
  );
  const days = new Set<string>();
  for (const item of results) {
    if (!isHttpUrl(item.url) || !item.lastVisitTime) continue;
    let host = "";
    try {
      host = new URL(item.url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (!hostSuffixes.some((s) => host === s || host.endsWith(`.${s}`))) continue;
    const d = new Date(item.lastVisitTime);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  // Walk consecutive days ending today or yesterday
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let i = 0; i < 90; i++) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (i === 0) {
      // Allow "yesterday" start if today has no visit yet
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

/** Recently closed tabs (flattened; http/https only). */
export async function getRecentlyClosed(count = 16): Promise<ClosedEntry[]> {
  const sessions = chromeApi()?.sessions;
  if (!sessions?.getRecentlyClosed) throw new Error("Sessions API unavailable.");
  const sessionsList = await promisify<ChromeSession[]>((cb) =>
    sessions.getRecentlyClosed({ maxResults: Math.max(count, 10) }, cb)
  );
  const out: ClosedEntry[] = [];
  let i = 0;
  for (const session of sessionsList) {
    const tabs = session.tab
      ? [session.tab]
      : session.window?.tabs ?? [];
    for (const tab of tabs) {
      if (!isHttpUrl(tab.url)) continue;
      out.push({
        id: `closed-${i++}-${tab.url}`,
        url: tab.url,
        title: tab.title?.trim() || tab.url,
        lastModified: session.lastModified ?? 0,
      });
      if (out.length >= count) return out;
    }
  }
  return out;
}

export async function getTopSites(count = 16): Promise<TopSiteEntry[]> {
  const topSites = chromeApi()?.topSites;
  if (!topSites?.get) throw new Error("Top Sites API unavailable.");
  const data = await promisify<ChromeTopSite[]>((cb) => topSites.get(cb));
  return data
    .filter((s) => isHttpUrl(s.url))
    .slice(0, count)
    .map((s) => ({ url: s.url, title: s.title?.trim() || s.url }));
}

export async function getRecentDownloads(count = 3): Promise<DownloadEntry[]> {
  const downloads = chromeApi()?.downloads;
  if (!downloads?.search) throw new Error("Downloads API unavailable.");
  const results = await promisify<ChromeDownloadItem[]>((cb) =>
    downloads.search({ limit: Math.max(count * 3, 12), orderBy: ["-startTime"], state: "complete" }, cb)
  );
  return results.slice(0, count).map((d) => ({
    id: d.id,
    url: d.url,
    filename: d.filename,
    basename: basenamePath(d.filename),
    exists: d.exists !== false,
    endTime: d.endTime ? Date.parse(d.endTime) : null,
  }));
}

export function showDownloadInFolder(downloadId: number): void {
  const downloads = chromeApi()?.downloads;
  if (!downloads?.show) throw new Error("Downloads API unavailable.");
  downloads.show(downloadId);
}

export function openDownload(downloadId: number): void {
  const downloads = chromeApi()?.downloads;
  if (!downloads?.open) throw new Error("Opening downloads is unavailable.");
  downloads.open(downloadId);
}

export type ActiveTabInfo = {
  title: string;
  url: string;
};

/** Active tab in the current window (http/https or any URL). */
export async function getActiveTab(): Promise<ActiveTabInfo | null> {
  const tabs = chromeApi()?.tabs;
  if (!tabs?.query) return null;
  const list = await promisify<ChromeTab[]>((cb) =>
    tabs.query({ active: true, currentWindow: true }, cb)
  );
  const tab = list[0];
  if (!tab?.url) return null;
  return {
    title: tab.title?.trim() || tab.url,
    url: tab.url,
  };
}

export async function queryCurrentWindowTabs(): Promise<WindowTabEntry[]> {
  const tabs = chromeApi()?.tabs;
  if (!tabs?.query) throw new Error("Tabs API unavailable.");
  const list = await promisify<ChromeTab[]>((cb) => tabs.query({ currentWindow: true }, cb));
  return list
    .filter((t) => isHttpUrl(t.url))
    .map((t) => ({
      id: t.id ?? null,
      url: t.url!,
      title: t.title?.trim() || t.url!,
      pinned: Boolean(t.pinned),
    }));
}

function historyItemToEntry(item: ChromeHistoryItem): HistoryEntry | null {
  if (!isHttpUrl(item.url)) return null;
  return {
    id: item.id ?? item.url,
    url: item.url,
    title: item.title?.trim() || item.url,
    lastVisitTime: item.lastVisitTime ?? 0,
    visitCount: item.visitCount ?? 0,
    typedCount: item.typedCount ?? 0,
  };
}

/** Search history by URL/title text (http/https only). */
export async function searchHistory(text: string, maxResults = 30): Promise<HistoryEntry[]> {
  const history = chromeApi()?.history;
  if (!history?.search) throw new Error("History API unavailable.");
  const results = await promisify<ChromeHistoryItem[]>((cb) =>
    history.search({ text, maxResults: Math.max(maxResults * 2, 40) }, cb)
  );
  const out: HistoryEntry[] = [];
  const seen = new Set<string>();
  for (const item of results) {
    const entry = historyItemToEntry(item);
    if (!entry || seen.has(entry.url)) continue;
    seen.add(entry.url);
    out.push(entry);
    if (out.length >= maxResults) break;
  }
  return out;
}

const BOOKMARK_TREE_WALK_LIMIT = 400;

function flattenBookmarkUrls(
  nodes: ChromeBookmarkNode[],
  out: BookmarkSearchEntry[],
  limit: number
): void {
  for (const node of nodes) {
    if (out.length >= limit) return;
    if (isHttpUrl(node.url)) {
      out.push({
        id: node.id,
        title: node.title?.trim() || node.url,
        url: node.url,
      });
    }
    if (node.children?.length) flattenBookmarkUrls(node.children, out, limit);
  }
}

function collectBookmarkEntries(
  nodes: ChromeBookmarkNode[]
): (BookmarkSearchEntry & { dateAdded?: number })[] {
  const flat: (BookmarkSearchEntry & { dateAdded?: number })[] = [];

  function walk(items: ChromeBookmarkNode[]) {
    for (const node of items) {
      if (isHttpUrl(node.url)) {
        flat.push({
          id: node.id,
          title: node.title?.trim() || node.url!,
          url: node.url!,
          dateAdded: node.dateAdded,
        });
      }
      if (node.children?.length) walk(node.children);
    }
  }

  walk(nodes);
  return flat;
}

/** Flatten bookmark tree; filter http(s) entries by title/url (case-insensitive). */
export async function searchBookmarks(text: string, maxResults = 30): Promise<BookmarkSearchEntry[]> {
  const tree = await getBookmarkTree();
  const q = text.trim().toLowerCase();

  if (!q) {
    const flat = collectBookmarkEntries(tree)
      .sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0))
      .slice(0, maxResults);
    return flat.map(({ id, title, url }) => ({ id, title, url }));
  }

  const matches: BookmarkSearchEntry[] = [];
  flattenBookmarkUrls(tree, matches, BOOKMARK_TREE_WALK_LIMIT);
  return matches
    .filter((b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
    .slice(0, maxResults);
}

/** All open tabs across windows. */
export async function queryAllTabs(): Promise<OpenTabEntry[]> {
  const tabs = chromeApi()?.tabs;
  if (!tabs?.query) throw new Error("Tabs API unavailable.");
  const list = await promisify<ChromeTab[]>((cb) => tabs.query({}, cb));
  return list
    .filter((t) => t.url)
    .map((t) => ({
      id: t.id ?? null,
      url: t.url!,
      title: t.title?.trim() || t.url!,
      pinned: Boolean(t.pinned),
      windowId: t.windowId ?? null,
      active: Boolean(t.active),
      favIconUrl: t.favIconUrl,
    }));
}

/** Focus a tab and optionally its window. */
export async function activateTab(tabId: number, windowId?: number | null): Promise<void> {
  const tabs = chromeApi()?.tabs;
  if (!tabs?.update) throw new Error("Tabs API unavailable.");
  await promisify<ChromeTab>((cb) => tabs.update!(tabId, { active: true }, cb));
  const windows = chromeApi()?.windows;
  if (windowId != null && windows?.update) {
    await promisify<void>((cb) => windows.update!(windowId, { focused: true }, cb));
  }
}

/** Close one or more tabs. */
export async function removeTabs(tabIds: number[]): Promise<void> {
  const tabs = chromeApi()?.tabs;
  if (!tabs?.remove) throw new Error("Tabs API unavailable.");
  if (tabIds.length === 0) return;
  await promisify<void>((cb) => tabs.remove!(tabIds, cb));
}

/** Alias for removeTabs — closes tabs by id. */
export async function closeTabs(tabIds: number[]): Promise<void> {
  return removeTabs(tabIds);
}

/** True when the URL is this extension's new-tab page. */
export function isCapTabNewTabUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const runtime = chromeApi()?.runtime;
    if (!runtime?.id || !runtime.getURL) return false;
    const capTabUrl = runtime.getURL("index.html");
    return url === capTabUrl || url.startsWith(`${capTabUrl.split("?")[0]}`);
  } catch {
    return false;
  }
}

/** Open URLs as new tabs. Returns how many were created. */
export async function createTabs(urls: string[], activeFirst = false): Promise<number> {
  const tabs = chromeApi()?.tabs;
  if (!tabs?.create) {
    // Fallback for non-extension / missing permission: window.open
    let n = 0;
    for (const url of urls) {
      window.open(url, "_blank", "noopener,noreferrer");
      n += 1;
    }
    return n;
  }
  let n = 0;
  for (let i = 0; i < urls.length; i++) {
    await promisify<ChromeTab>((cb) =>
      tabs.create({ url: urls[i], active: activeFirst && i === 0 }, cb)
    );
    n += 1;
  }
  return n;
}

/** Read clipboard text once. Requires clipboardRead when used as an extension. */
export async function readClipboardText(): Promise<string> {
  try {
    return (await navigator.clipboard.readText()).trim();
  } catch {
    return "";
  }
}
