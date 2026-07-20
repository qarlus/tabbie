import { useCallback, useEffect, useRef, useState } from "react";

export const PREFIX = "captab:";
/** Pre-rebrand prefix — migrated once into PREFIX on load. */
export const LEGACY_PREFIX = "tabbie:";
const CHANGE_EVENT = "captab:storage-change";

/** All keys CapTab may persist, relative to the prefix. */
export const KNOWN_KEYS = [
  "settings",
  "shortcuts",
  "todos",
  "notes",
  "recent-searches",
  "github-config",
  "github-cache",
  "linear-config",
  "linear-cache",
  "pinned-repos",
  "layout",
  "module-data",
  "starter-done",
  "update-check",
  "theme", // written by next-themes (storageKey)
  "clipboard-shelf",
  "parked-sessions",
  "capbar-glance",
  "open-streak",
  "tasks-config",
  "pages",
  "sync-updated-at",
] as const;

/**
 * One-time copy of `tabbie:*` → `captab:*` so existing installs keep settings.
 * Does not overwrite keys already present under the new prefix.
 */
export function migrateLegacyStorage(): void {
  try {
    const toCopy: { from: string; to: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (!full || !full.startsWith(LEGACY_PREFIX)) continue;
      const relative = full.slice(LEGACY_PREFIX.length);
      if (!relative) continue;
      const next = PREFIX + relative;
      if (localStorage.getItem(next) == null) {
        toCopy.push({ from: full, to: next });
      }
    }
    for (const { from, to } of toCopy) {
      const value = localStorage.getItem(from);
      if (value != null) localStorage.setItem(to, value);
    }
    // Drop legacy keys after a successful pass so we don't dual-write forever.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const full = localStorage.key(i);
      if (full && full.startsWith(LEGACY_PREFIX)) localStorage.removeItem(full);
    }
  } catch {
    // private mode / blocked storage — ignore
  }
}

export function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeKey<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — fail silently, state still lives in memory
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

/**
 * useState backed by localStorage under the `captab:` prefix.
 * Multiple hook instances using the same key stay in sync via a window event.
 *
 * Writes skip the emitting instance's echo listener so functional updaters
 * are never applied twice (which duplicated modules / broke drag reorder).
 */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readKey(key, fallback));
  const skipEchoRef = useRef(false);

  useEffect(() => {
    const onLocal = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== key) return;
      if (skipEchoRef.current) {
        skipEchoRef.current = false;
        return;
      }
      setValue(readKey(key, fallback));
    };
    const onExternal = (e: StorageEvent) => {
      if (e.key === PREFIX + key) setValue(readKey(key, fallback));
    };
    window.addEventListener(CHANGE_EVENT, onLocal);
    window.addEventListener("storage", onExternal);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onLocal);
      window.removeEventListener("storage", onExternal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      skipEchoRef.current = true;
      writeKey(key, resolved);
      return resolved;
    });
  }, [key]);

  return [value, set] as const;
}

/* ---------- export / import / reset ---------- */

interface ExportEnvelope {
  app: "captab" | "tabbie";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

const BACKUP_APPS = new Set(["captab", "tabbie"]);

/** Serialize every `captab:*` localStorage entry (raw strings) to JSON. */
export function exportAll(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i);
    if (full && full.startsWith(PREFIX)) {
      data[full.slice(PREFIX.length)] = localStorage.getItem(full) ?? "";
    }
  }
  const envelope: ExportEnvelope = {
    app: "captab",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(envelope, null, 2);
}

export type ImportResult = { ok: true; count: number } | { ok: false; error: string };

/** Validate and apply an exported backup. Replaces all existing CapTab state. */
export function importAll(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  const record = parsed as Record<string, unknown>;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof record.app !== "string" ||
    !BACKUP_APPS.has(record.app) ||
    typeof record.data !== "object" ||
    record.data === null
  ) {
    return { ok: false, error: "That file is not a CapTab backup." };
  }
  const data = (parsed as ExportEnvelope).data;
  const entries = Object.entries(data);
  if (entries.some(([k, v]) => typeof k !== "string" || typeof v !== "string")) {
    return { ok: false, error: "The backup file is malformed." };
  }
  resetAll();
  for (const [k, v] of entries) {
    if (k.includes("..") || k.length === 0 || k.length > 64) continue;
    localStorage.setItem(PREFIX + k, v);
  }
  return { ok: true, count: entries.length };
}

/** Remove every `captab:*` key (and any leftover `tabbie:*`). */
export function resetAll(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i);
    if (full && (full.startsWith(PREFIX) || full.startsWith(LEGACY_PREFIX))) toRemove.push(full);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

/** Trigger a browser download of the full backup JSON. */
export function downloadBackup(): void {
  const blob = new Blob([exportAll()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `captab-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
