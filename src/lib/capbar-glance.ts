/**
 * Capbar glance — local loopback bridge.
 *
 * CapTab fetches a tiny JSON snapshot from Capbar on 127.0.0.1 only.
 * On success it caches under `captab:capbar-glance`. Capbar down → soft empty state.
 *
 * Contract (Capbar must implement):
 *   GET http://127.0.0.1:17823/glance
 *   CORS: Access-Control-Allow-Origin: *  (or chrome-extension://*)
 *   Body JSON:
 *   {
 *     "lines": [{ "label": "Claude", "detail": "2h left" }],
 *     "updatedAt": 1710000000000
 *   }
 */

import { readKey, writeKey } from "@/lib/storage";

export type CapbarGlanceLine = {
  label: string;
  detail: string;
};

export type CapbarGlance = {
  lines: CapbarGlanceLine[];
  updatedAt: number | null;
};

export const EMPTY_CAPBAR_GLANCE: CapbarGlance = { lines: [], updatedAt: null };

/** Fixed loopback port — Capbar must bind this (127.0.0.1 only). */
export const CAPBAR_GLANCE_PORT = 17823;
export const CAPBAR_GLANCE_PATH = "/glance";
export const CAPBAR_GLANCE_URL = `http://127.0.0.1:${CAPBAR_GLANCE_PORT}${CAPBAR_GLANCE_PATH}`;

/** Re-fetch at most this often while CapTab stays open. */
const FRESH_MS = 60_000;
/** Treat cached lines older than this as stale (still shown, marked). */
export const CAPBAR_GLANCE_STALE_MS = 15 * 60 * 1000;

const STORAGE_KEY = "capbar-glance";

export function normalizeCapbarGlance(raw: unknown): CapbarGlance {
  if (!raw || typeof raw !== "object") return EMPTY_CAPBAR_GLANCE;
  const rec = raw as Record<string, unknown>;
  const linesRaw = Array.isArray(rec.lines) ? rec.lines : [];
  const lines: CapbarGlanceLine[] = [];
  for (const line of linesRaw) {
    if (!line || typeof line !== "object") continue;
    const l = line as Record<string, unknown>;
    if (typeof l.label !== "string" || typeof l.detail !== "string") continue;
    const label = l.label.trim();
    const detail = l.detail.trim();
    if (!label && !detail) continue;
    lines.push({ label: label || "Capbar", detail });
  }
  const updatedAt =
    typeof rec.updatedAt === "number" && Number.isFinite(rec.updatedAt) ? rec.updatedAt : null;
  return { lines: lines.slice(0, 6), updatedAt };
}

export function readCachedCapbarGlance(): CapbarGlance {
  return normalizeCapbarGlance(readKey(STORAGE_KEY, EMPTY_CAPBAR_GLANCE));
}

export function writeCachedCapbarGlance(glance: CapbarGlance): void {
  writeKey(STORAGE_KEY, glance);
}

export function isCapbarGlanceStale(glance: CapbarGlance, now = Date.now()): boolean {
  if (!glance.updatedAt || glance.lines.length === 0) return false;
  return now - glance.updatedAt > CAPBAR_GLANCE_STALE_MS;
}

export type CapbarFetchResult =
  | { ok: true; glance: CapbarGlance }
  | { ok: false; reason: "offline" | "bad" | "timeout" };

/**
 * Pull glance from Capbar. Never throws. Caches successful responses.
 * Uses AbortSignal timeout so a missing Capbar fails fast.
 */
export async function fetchCapbarGlance(opts?: {
  force?: boolean;
  timeoutMs?: number;
}): Promise<CapbarFetchResult> {
  const cached = readCachedCapbarGlance();
  if (
    !opts?.force &&
    cached.lines.length > 0 &&
    cached.updatedAt != null &&
    Date.now() - cached.updatedAt < FRESH_MS
  ) {
    return { ok: true, glance: cached };
  }

  const timeoutMs = opts?.timeoutMs ?? 800;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(CAPBAR_GLANCE_URL, {
      method: "GET",
      signal: ctrl.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, reason: "bad" };
    const json: unknown = await res.json();
    const glance = normalizeCapbarGlance(json);
    if (glance.lines.length === 0) {
      // Empty but reachable — clear cache so UI shows "connected empty" vs stale
      const empty: CapbarGlance = {
        lines: [],
        updatedAt: typeof (json as { updatedAt?: number })?.updatedAt === "number"
          ? (json as { updatedAt: number }).updatedAt
          : Date.now(),
      };
      writeCachedCapbarGlance(empty);
      return { ok: true, glance: empty };
    }
    const withTime: CapbarGlance = {
      lines: glance.lines,
      updatedAt: glance.updatedAt ?? Date.now(),
    };
    writeCachedCapbarGlance(withTime);
    return { ok: true, glance: withTime };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "offline" };
  } finally {
    window.clearTimeout(timer);
  }
}
