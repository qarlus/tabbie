/**
 * Chrome extension capability layer.
 * CapTab is extension-first (new tab). Browser APIs are optional and gated.
 */

export type ChromePermission = "bookmarks" | "history" | "topSites";

type ChromeBookmarksApi = {
  getTree: (callback: (results: ChromeBookmarkNode[]) => void) => void;
  getSubTree: (id: string, callback: (results: ChromeBookmarkNode[]) => void) => void;
  getRecent: (numberOfItems: number, callback: (results: ChromeBookmarkNode[]) => void) => void;
  onCreated: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
  onRemoved: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
  onChanged: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
  onMoved: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
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

type ChromeGlobal = {
  runtime?: ChromeRuntimeApi;
  bookmarks?: ChromeBookmarksApi;
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
