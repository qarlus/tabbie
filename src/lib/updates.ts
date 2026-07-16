import { readKey, writeKey } from "@/lib/storage";

/** Public GitHub repo that publishes extension zips on Releases. */
export const UPDATE_REPO = "qarlus/tabbie";
export const RELEASES_URL = `https://github.com/${UPDATE_REPO}/releases`;
export const LATEST_RELEASE_API = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;

const CACHE_KEY = "update-check";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  zipUrl: string | null;
  checkedAt: number;
}

interface UpdateCache {
  checkedAt: number;
  latestVersion: string;
  releaseUrl: string;
  zipUrl: string | null;
}

function chromeManifestVersion(): string | null {
  try {
    const runtime = (
      globalThis as {
        chrome?: { runtime?: { getManifest?: () => { version?: string } } };
      }
    ).chrome?.runtime;
    const version = runtime?.getManifest?.()?.version;
    return typeof version === "string" && version ? version : null;
  } catch {
    return null;
  }
}

/** Installed / built version — prefers Chrome manifest when running as extension. */
export function getCurrentVersion(): string {
  return chromeManifestVersion() ?? __APP_VERSION__;
}

/** Compare dotted versions; returns true when `latest` is newer than `current`. */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.replace(/^v/i, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const b = current.replace(/^v/i, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}

function zipAssetUrl(assets: { name?: string; browser_download_url?: string }[] | undefined): string | null {
  if (!assets?.length) return null;
  const zip = assets.find((a) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".zip"));
  return zip?.browser_download_url ?? null;
}

/**
 * Check GitHub Releases for a newer build.
 * Uses a 24h localStorage cache so we stay local-first by default.
 */
export async function checkForUpdate(options?: {
  force?: boolean;
}): Promise<UpdateInfo | null> {
  const currentVersion = getCurrentVersion();
  const cached = readKey<UpdateCache | null>(CACHE_KEY, null);
  const now = Date.now();

  if (
    !options?.force &&
    cached &&
    typeof cached.checkedAt === "number" &&
    now - cached.checkedAt < CHECK_INTERVAL_MS
  ) {
    if (!isNewerVersion(cached.latestVersion, currentVersion)) return null;
    return {
      currentVersion,
      latestVersion: cached.latestVersion,
      releaseUrl: cached.releaseUrl,
      zipUrl: cached.zipUrl,
      checkedAt: cached.checkedAt,
    };
  }

  const res = await fetch(LATEST_RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new Error(`Update check failed (${res.status})`);
  }

  const data = (await res.json()) as {
    tag_name?: string;
    html_url?: string;
    assets?: { name?: string; browser_download_url?: string }[];
  };

  const latestVersion = (data.tag_name ?? "").replace(/^v/i, "");
  if (!latestVersion) return null;

  const info: UpdateCache = {
    checkedAt: now,
    latestVersion,
    releaseUrl: data.html_url ?? RELEASES_URL,
    zipUrl: zipAssetUrl(data.assets),
  };
  writeKey(CACHE_KEY, info);

  if (!isNewerVersion(latestVersion, currentVersion)) return null;

  return {
    currentVersion,
    latestVersion,
    releaseUrl: info.releaseUrl,
    zipUrl: info.zipUrl,
    checkedAt: now,
  };
}
