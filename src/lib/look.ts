/** Local-first look options — system fonts only, no CDN. */

export type FontId = "sans" | "serif" | "mono" | "rounded" | "editorial";
/**
 * Greyscale material tiles — each has a distinct craft.
 * Colour comes from the theme wash via mix-blend.
 */
export type SurfaceId = "none" | "grain" | "dither" | "stipple" | "paper" | "hatch";

export interface FontDefinition {
  id: FontId;
  name: string;
  hint: string;
  /** CSS font-family stack (installed system faces). */
  stack: string;
}

export interface SurfaceDefinition {
  id: SurfaceId;
  name: string;
  hint: string;
  /** Greyscale tile under public/surfaces/ */
  tile?: string;
  /** CSS background-size — must match how the tile was authored. */
  tileSize?: string;
}

export const FONTS: FontDefinition[] = [
  {
    id: "sans",
    name: "Sans",
    hint: "System UI",
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "serif",
    name: "Serif",
    hint: "Classic reading",
    stack: 'ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif',
  },
  {
    id: "mono",
    name: "Mono",
    hint: "Terminal calm",
    stack: 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace',
  },
  {
    id: "rounded",
    name: "Rounded",
    hint: "Calm Capbar UI",
    stack: '"Segoe UI Variable Text", "Segoe UI", system-ui, "Trebuchet MS", "Lucida Grande", sans-serif',
  },
  {
    id: "editorial",
    name: "Editorial",
    hint: "Display serif",
    stack: 'Charter, "Bitstream Charter", "Sitka Text", Georgia, "Times New Roman", serif',
  },
];

export const SURFACES: SurfaceDefinition[] = [
  { id: "none", name: "None", hint: "Clean wash only" },
  {
    id: "grain",
    name: "Grain",
    hint: "Sharp film emulsion",
    tile: "./surfaces/grain.png",
    tileSize: "512px 512px",
  },
  {
    id: "dither",
    name: "Dither",
    hint: "Bayer print screen",
    tile: "./surfaces/dither.png",
    tileSize: "8px 8px",
  },
  {
    id: "stipple",
    name: "Stipple",
    hint: "Ink-dot gallery print",
    tile: "./surfaces/stipple.png",
    tileSize: "512px 512px",
  },
  {
    id: "paper",
    name: "Paper",
    hint: "Cold-press fibre",
    tile: "./surfaces/paper.png",
    tileSize: "512px 512px",
  },
  {
    id: "hatch",
    name: "Hatch",
    hint: "Irregular pen engraving",
    tile: "./surfaces/hatch.png",
    tileSize: "384px 384px",
  },
];

export const FONT_IDS = FONTS.map((f) => f.id);
export const SURFACE_IDS = SURFACES.map((s) => s.id);

export function isFontId(value: string | undefined): value is FontId {
  return !!value && (FONT_IDS as string[]).includes(value);
}

export function isSurfaceId(value: string | undefined): value is SurfaceId {
  return !!value && (SURFACE_IDS as string[]).includes(value);
}

export function surfaceById(id: SurfaceId): SurfaceDefinition {
  return SURFACES.find((s) => s.id === id) ?? SURFACES[0]!;
}
