import { useCallback, useEffect, useRef, useState } from "react";

export const PREFIX = "tabbie:";
const CHANGE_EVENT = "tabbie:storage-change";

/** All keys Tabbie may persist, relative to the prefix. */
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
] as const;

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
 * useState backed by localStorage under the `tabbie:` prefix.
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
  app: "tabbie";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

/** Serialize every `tabbie:*` localStorage entry (raw strings) to JSON. */
export function exportAll(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i);
    if (full && full.startsWith(PREFIX)) {
      data[full.slice(PREFIX.length)] = localStorage.getItem(full) ?? "";
    }
  }
  const envelope: ExportEnvelope = {
    app: "tabbie",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(envelope, null, 2);
}

export type ImportResult = { ok: true; count: number } | { ok: false; error: string };

/** Validate and apply an exported backup. Replaces all existing tabbie state. */
export function importAll(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).app !== "tabbie" ||
    typeof (parsed as Record<string, unknown>).data !== "object" ||
    (parsed as Record<string, unknown>).data === null
  ) {
    return { ok: false, error: "That file is not a Tabbie backup." };
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

/** Remove every `tabbie:*` key. */
export function resetAll(): void {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const full = localStorage.key(i);
    if (full && full.startsWith(PREFIX)) toRemove.push(full);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

/** Trigger a browser download of the full backup JSON. */
export function downloadBackup(): void {
  const blob = new Blob([exportAll()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tabbie-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
