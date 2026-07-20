/** Scenic wallpapers + page layout modes — local assets only. */

import type { SurfaceId } from "./look";

export type WallpaperId = "none" | "riverside" | "marsh" | "meadow";

/** How modules arrange on the page — does not change stored module order/span. */
export type LayoutModeId = "stack" | "bento" | "magazine" | "islands";

export interface WallpaperDefinition {
  id: WallpaperId;
  name: string;
  hint: string;
  /** Path under public/, omitted for none. */
  src?: string;
  /** Soft preview gradient when no thumbnail. */
  preview: string;
}

export interface LayoutModeDefinition {
  id: LayoutModeId;
  name: string;
  hint: string;
}

export const WALLPAPERS: WallpaperDefinition[] = [
  {
    id: "none",
    name: "None",
    hint: "Theme wash only",
    preview: "linear-gradient(160deg, hsl(36 28% 95%), hsl(30 20% 90%))",
  },
  {
    id: "riverside",
    name: "Impasto",
    hint: "Thick oil-paint Pantanal wetland — default",
    src: "./wallpapers/riverside.jpg",
    preview: "linear-gradient(160deg, #e8dcc4 0%, #7a9a68 45%, #3a5848 100%)",
  },
  {
    id: "marsh",
    name: "Stipple",
    hint: "Grainy sunny reed marsh",
    src: "./wallpapers/marsh.jpg",
    preview: "linear-gradient(160deg, #5aa0d0 0%, #e89840 45%, #2a6840 100%)",
  },
  {
    id: "meadow",
    name: "Fiber",
    hint: "Fuzzy scribble dusk meadow",
    src: "./wallpapers/meadow.jpg",
    preview: "linear-gradient(160deg, #f0c8a8 0%, #e898b0 40%, #1a1814 100%)",
  },
];

export const LAYOUT_MODES: LayoutModeDefinition[] = [
  {
    id: "stack",
    name: "Stack",
    hint: "Classic two-column cards under a strip",
  },
  {
    id: "bento",
    name: "Bento",
    hint: "Dense three-column mosaic",
  },
  {
    id: "magazine",
    name: "Magazine",
    hint: "Wide featured lead, then columns",
  },
  {
    id: "islands",
    name: "Islands",
    hint: "Airy staggered cards with more space",
  },
];

export const WALLPAPER_IDS = WALLPAPERS.map((w) => w.id);
export const LAYOUT_MODE_IDS = LAYOUT_MODES.map((m) => m.id);

export function isWallpaperId(value: string | undefined): value is WallpaperId {
  return !!value && (WALLPAPER_IDS as string[]).includes(value);
}

export function isLayoutModeId(value: string | undefined): value is LayoutModeId {
  return !!value && (LAYOUT_MODE_IDS as string[]).includes(value);
}

export function wallpaperById(id: WallpaperId): WallpaperDefinition {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]!;
}

export function layoutModeById(id: LayoutModeId): LayoutModeDefinition {
  return LAYOUT_MODES.find((m) => m.id === id) ?? LAYOUT_MODES[0]!;
}

/** Re-export surface type for Settings consumers that import from scene. */
export type { SurfaceId };
