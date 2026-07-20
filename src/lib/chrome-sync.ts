import { isExtension } from "@/lib/chrome";
import { readKey, writeKey } from "@/lib/storage";
import { normalizeSettings, type Settings, type Shortcut } from "@/lib/types";

const SYNC_KEY = "captab-sync";

export interface SyncPayload {
  updatedAt: number;
  settings: Settings;
  shortcuts: Shortcut[];
}

type ChromeStorageSync = {
  get: (keys: string | string[] | Record<string, unknown>, callback: (items: Record<string, unknown>) => void) => void;
  set: (items: Record<string, unknown>, callback?: () => void) => void;
};

function syncApi(): ChromeStorageSync | undefined {
  const chrome = (globalThis as { chrome?: { storage?: { sync?: ChromeStorageSync } } }).chrome;
  return chrome?.storage?.sync;
}

/** Pull settings + shortcuts from chrome.storage.sync if newer than local. */
export async function pullChromeSync(): Promise<boolean> {
  if (!isExtension()) return false;
  const api = syncApi();
  if (!api) return false;

  const localUpdated = readKey<number>("sync-updated-at", 0);

  return new Promise((resolve) => {
    api.get([SYNC_KEY], (items) => {
      const raw = items[SYNC_KEY];
      if (!raw || typeof raw !== "object") {
        resolve(false);
        return;
      }
      const payload = raw as SyncPayload;
      if (typeof payload.updatedAt !== "number" || payload.updatedAt <= localUpdated) {
        resolve(false);
        return;
      }
      if (payload.settings) writeKey("settings", normalizeSettings(payload.settings));
      if (Array.isArray(payload.shortcuts)) writeKey("shortcuts", payload.shortcuts);
      writeKey("sync-updated-at", payload.updatedAt);
      resolve(true);
    });
  });
}

/** Push settings + shortcuts to chrome.storage.sync (size-limited). */
export async function pushChromeSync(
  settings: Settings,
  shortcuts: Shortcut[]
): Promise<boolean> {
  if (!isExtension()) return false;
  const api = syncApi();
  if (!api) return false;

  const payload: SyncPayload = {
    updatedAt: Date.now(),
    settings: normalizeSettings(settings),
    shortcuts,
  };

  return new Promise((resolve) => {
    api.set({ [SYNC_KEY]: payload }, () => {
      writeKey("sync-updated-at", payload.updatedAt);
      resolve(true);
    });
  });
}

/** Called on settings/shortcuts change when chromeSync is enabled. */
export function syncIfEnabled(settings: Settings, shortcuts: Shortcut[]): void {
  if (!settings.chromeSync) return;
  void pushChromeSync(settings, shortcuts);
}
