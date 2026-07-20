export type FocusBlockState = {
  active: boolean;
  endsAt: number | null;
  hosts: string[];
  focusText: string;
};

export const DEFAULT_BLOCK_HOSTS = [
  "x.com",
  "twitter.com",
  "reddit.com",
  "youtube.com",
  "www.youtube.com",
  "instagram.com",
  "tiktok.com",
  "facebook.com",
  "www.facebook.com",
  "netflix.com",
];

export const FOCUS_BLOCK_STORAGE_KEY = "captab-focus-block";

const INACTIVE: FocusBlockState = {
  active: false,
  endsAt: null,
  hosts: [],
  focusText: "",
};

type ChromeStorageLocal = {
  get: (
    keys: string | string[] | Record<string, unknown>,
    callback: (items: Record<string, unknown>) => void
  ) => void;
  set: (items: Record<string, unknown>, callback?: () => void) => void;
};

function chromeStorageLocal(): ChromeStorageLocal | undefined {
  return typeof globalThis !== "undefined"
    ? (globalThis as { chrome?: { storage?: { local?: ChromeStorageLocal } } }).chrome?.storage?.local
    : undefined;
}

function lastErrorMessage(): string | undefined {
  return (globalThis as { chrome?: { runtime?: { lastError?: { message?: string } } } }).chrome?.runtime
    ?.lastError?.message;
}

/** Lowercase hostname without a leading `www.` */
export function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

/** True when `url` is http(s) and its host matches any entry in `hosts`. */
export function hostMatches(url: string, hosts: string[]): boolean {
  if (!url || hosts.length === 0) return false;
  try {
    const u = new URL(url);
    if (u.protocol === "chrome:" || u.protocol === "chrome-extension:" || u.protocol === "about:") {
      return false;
    }
    const host = normalizeHost(u.hostname);
    return hosts.some((entry) => {
      const normalized = normalizeHost(entry);
      if (!normalized) return false;
      return host === normalized || host.endsWith(`.${normalized}`);
    });
  } catch {
    return false;
  }
}

function parseStoredState(raw: unknown): FocusBlockState {
  if (!raw || typeof raw !== "object") return { ...INACTIVE };
  const record = raw as Partial<FocusBlockState>;
  return {
    active: Boolean(record.active),
    endsAt: typeof record.endsAt === "number" ? record.endsAt : null,
    hosts: Array.isArray(record.hosts)
      ? record.hosts.filter((h): h is string => typeof h === "string")
      : [],
    focusText: typeof record.focusText === "string" ? record.focusText : "",
  };
}

export async function writeFocusBlockState(state: FocusBlockState): Promise<void> {
  const storage = chromeStorageLocal();
  if (storage?.set) {
    await new Promise<void>((resolve, reject) => {
      storage.set({ [FOCUS_BLOCK_STORAGE_KEY]: state }, () => {
        const err = lastErrorMessage();
        if (err) reject(new Error(err));
        else resolve();
      });
    });
  }
  try {
    localStorage.setItem(FOCUS_BLOCK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // dev / private mode — ignore
  }
}

export async function readFocusBlockState(): Promise<FocusBlockState> {
  const storage = chromeStorageLocal();
  if (storage?.get) {
    return new Promise((resolve) => {
      storage.get(FOCUS_BLOCK_STORAGE_KEY, (result) => {
        resolve(parseStoredState(result[FOCUS_BLOCK_STORAGE_KEY]));
      });
    });
  }
  try {
    const raw = localStorage.getItem(FOCUS_BLOCK_STORAGE_KEY);
    if (raw != null) return parseStoredState(JSON.parse(raw));
  } catch {
    // ignore
  }
  return { ...INACTIVE };
}
