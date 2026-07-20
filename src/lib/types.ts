import { isWorldClockId } from "./clocks";
import { isFontId, isSurfaceId, type FontId, type SurfaceId } from "./look";
import {
  isLayoutModeId,
  isWallpaperId,
  type LayoutModeId,
  type WallpaperId,
} from "./scene";

export type { FontId, SurfaceId } from "./look";
export type { LayoutModeId, WallpaperId } from "./scene";

export type EngineId = "duckduckgo" | "google" | "bing" | "brave" | "startpage";

/** Curated visual themes — replace the old accent + blotchy-background pair. */
export type ThemeId =
  | "slate"
  | "ink"
  | "ocean"
  | "sage"
  | "amber"
  | "rose"
  | "cobalt"
  | "coral"
  | "olive"
  | "berry"
  | "honey"
  | "midnight";

export const THEME_IDS: ThemeId[] = [
  "honey",
  "slate",
  "ink",
  "ocean",
  "sage",
  "amber",
  "rose",
  "cobalt",
  "coral",
  "olive",
  "berry",
  "midnight",
];

export type WorldClocksDisplay = "hover" | "always";

export type ClockFaceId = "digital" | "analog" | "binary" | "literary";

export const CLOCK_FACE_IDS: ClockFaceId[] = ["digital", "analog", "binary", "literary"];

export interface Settings {
  name: string;
  theme: ThemeId;
  font: FontId;
  surface: SurfaceId;
  /** Full-bleed scenic image under the wash. */
  wallpaper: WallpaperId;
  /** User-uploaded image/GIF as data URL — overrides wallpaper when set. */
  customWallpaperDataUrl: string;
  /** How module cards arrange — order/span stay in layout storage. */
  layoutMode: LayoutModeId;
  engine: EngineId;
  clock24: boolean;
  /** Local clock display style in the top bar. */
  clockFace: ClockFaceId;
  /** Selected world-clock city ids from the curated catalog. */
  worldClocks: string[];
  /** How secondary clocks appear next to local time. */
  worldClocksDisplay: WorldClocksDisplay;
  /** User-injected CSS scoped to the page. */
  customCss: string;
  /** Override body font-family stack when non-empty. */
  customFontStack: string;
  /** Show AI chat shortcut row under bookmarks. */
  showAiShortcuts: boolean;
  /** UI language code (i18n skeleton). */
  locale: string;
  /** Mirror settings + shortcuts via chrome.storage.sync. */
  chromeSync: boolean;
  /** Optional data-URL favicon for the new tab document. */
  customFaviconDataUrl: string;
  /**
   * @deprecated Migrated into `layout` storage.
   */
  modules?: { github?: boolean };
  /** @deprecated Use `theme`. */
  accent?: string;
  /** @deprecated Use `theme`. */
  background?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "honey",
  font: "rounded",
  surface: "grain",
  wallpaper: "riverside",
  customWallpaperDataUrl: "",
  layoutMode: "bento",
  engine: "duckduckgo",
  clock24: false,
  clockFace: "digital",
  worldClocks: [],
  worldClocksDisplay: "hover",
  customCss: "",
  customFontStack: "",
  showAiShortcuts: false,
  locale: "en",
  chromeSync: false,
  customFaviconDataUrl: "",
};

function themeFromLegacy(accent?: string, background?: string): ThemeId {
  if (background === "ember" || accent === "orange") return "amber";
  if (background === "forest" || accent === "green" || accent === "teal") return "sage";
  if (background === "mist" || accent === "blue") return "ocean";
  if (background === "paper" || accent === "pink") return "rose";
  if (accent === "violet" || background === "dusk") return "honey";
  return "honey";
}

function isThemeId(value: string | undefined): value is ThemeId {
  return !!value && (THEME_IDS as string[]).includes(value);
}

function normalizeWorldClocks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_SETTINGS.worldClocks;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || !isWorldClockId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeWorldClocksDisplay(raw: unknown): WorldClocksDisplay {
  return raw === "always" || raw === "hover" ? raw : DEFAULT_SETTINGS.worldClocksDisplay;
}

function isClockFaceId(value: string | undefined): value is ClockFaceId {
  return !!value && (CLOCK_FACE_IDS as string[]).includes(value);
}

function normalizeLocale(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_SETTINGS.locale;
  return raw.trim().slice(0, 8);
}

/** Merge stored settings with defaults so older backups stay valid. */
export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const theme = isThemeId(raw?.theme) ? raw.theme : themeFromLegacy(raw?.accent, raw?.background);
  return {
    name: typeof raw?.name === "string" ? raw.name : DEFAULT_SETTINGS.name,
    theme,
    font: isFontId(raw?.font) ? raw.font : DEFAULT_SETTINGS.font,
    surface: isSurfaceId(raw?.surface)
      ? raw.surface
      : raw?.surface === "dots"
        ? "stipple"
        : DEFAULT_SETTINGS.surface,
    wallpaper: isWallpaperId(raw?.wallpaper) ? raw.wallpaper : DEFAULT_SETTINGS.wallpaper,
    customWallpaperDataUrl:
      typeof raw?.customWallpaperDataUrl === "string" ? raw.customWallpaperDataUrl : "",
    layoutMode: isLayoutModeId(raw?.layoutMode) ? raw.layoutMode : DEFAULT_SETTINGS.layoutMode,
    engine: raw?.engine ?? DEFAULT_SETTINGS.engine,
    clock24: typeof raw?.clock24 === "boolean" ? raw.clock24 : DEFAULT_SETTINGS.clock24,
    clockFace: isClockFaceId(raw?.clockFace) ? raw.clockFace : DEFAULT_SETTINGS.clockFace,
    worldClocks: normalizeWorldClocks(raw?.worldClocks),
    worldClocksDisplay: normalizeWorldClocksDisplay(raw?.worldClocksDisplay),
    customCss: typeof raw?.customCss === "string" ? raw.customCss : DEFAULT_SETTINGS.customCss,
    customFontStack:
      typeof raw?.customFontStack === "string" ? raw.customFontStack : DEFAULT_SETTINGS.customFontStack,
    showAiShortcuts:
      typeof raw?.showAiShortcuts === "boolean" ? raw.showAiShortcuts : DEFAULT_SETTINGS.showAiShortcuts,
    locale: normalizeLocale(raw?.locale),
    chromeSync: typeof raw?.chromeSync === "boolean" ? raw.chromeSync : DEFAULT_SETTINGS.chromeSync,
    customFaviconDataUrl:
      typeof raw?.customFaviconDataUrl === "string" ? raw.customFaviconDataUrl : "",
  };
}

export interface Shortcut {
  id: string;
  name: string;
  url: string;
}

export interface GithubConfig {
  username: string;
  token: string;
}

export interface GithubItem {
  id: number;
  title: string;
  url: string;
  repo: string;
  state: string;
  number?: number;
  kind: "pr" | "issue" | "notification" | "action";
  updatedAt: string;
  /** Actions only: branch or event that triggered the run. */
  detail?: string;
}

export interface GithubCache {
  fetchedAt: number;
  prs: GithubItem[];
  issues: GithubItem[];
  notifications: GithubItem[];
  actions: GithubItem[];
}

export type {
  ModuleSpan,
  ModuleLane,
  PlacedModule,
  LayoutState,
  ModuleDataMap,
} from "./modules";
