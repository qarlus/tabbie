import { isWorldClockId } from "./clocks";
import { isFontId, isSurfaceId, type FontId, type SurfaceId } from "./look";

export type { FontId, SurfaceId } from "./look";

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
  "honey",
  "midnight",
];

export type WorldClocksDisplay = "hover" | "always";

export interface Settings {
  name: string;
  theme: ThemeId;
  font: FontId;
  surface: SurfaceId;
  engine: EngineId;
  clock24: boolean;
  /** Selected world-clock city ids from the curated catalog. */
  worldClocks: string[];
  /** How secondary clocks appear next to local time. */
  worldClocksDisplay: WorldClocksDisplay;
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
  theme: "slate",
  font: "sans",
  surface: "grain",
  engine: "duckduckgo",
  clock24: false,
  worldClocks: [],
  worldClocksDisplay: "hover",
};

function themeFromLegacy(accent?: string, background?: string): ThemeId {
  if (background === "ember" || accent === "orange") return "amber";
  if (background === "forest" || accent === "green" || accent === "teal") return "sage";
  if (background === "mist" || accent === "blue") return "ocean";
  if (background === "paper" || accent === "pink") return "rose";
  if (accent === "violet" || background === "dusk") return "slate";
  return "slate";
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
    engine: raw?.engine ?? DEFAULT_SETTINGS.engine,
    clock24: typeof raw?.clock24 === "boolean" ? raw.clock24 : DEFAULT_SETTINGS.clock24,
    worldClocks: normalizeWorldClocks(raw?.worldClocks),
    worldClocksDisplay: normalizeWorldClocksDisplay(raw?.worldClocksDisplay),
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
