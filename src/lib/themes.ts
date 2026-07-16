import type { ThemeId } from "./types";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  hint: string;
  /** Preview swatch for settings (CSS background). */
  preview: string;
  /** Accent chip on the preview. */
  accent: string;
}

/**
 * Curated themes. Each sets --ac, --page-bg, and a quiet --wash
 * used by Background — no animated blobs.
 */
export const THEMES: ThemeDefinition[] = [
  {
    id: "slate",
    name: "Slate",
    hint: "Cool neutral, steel accent",
    preview: "linear-gradient(160deg, #e8edf2 0%, #d9e0e8 100%)",
    accent: "hsl(215 18% 40%)",
  },
  {
    id: "ink",
    name: "Ink",
    hint: "Near-monochrome, sharp",
    preview: "linear-gradient(160deg, #f4f4f5 0%, #e4e4e7 100%)",
    accent: "hsl(240 4% 32%)",
  },
  {
    id: "ocean",
    name: "Ocean",
    hint: "Blue wash, teal accent",
    preview: "linear-gradient(160deg, #e2eef4 0%, #c8dbe8 100%)",
    accent: "hsl(188 42% 34%)",
  },
  {
    id: "sage",
    name: "Sage",
    hint: "Muted green, calm",
    preview: "linear-gradient(160deg, #e7eee8 0%, #d0ddd2 100%)",
    accent: "hsl(152 16% 34%)",
  },
  {
    id: "amber",
    name: "Amber",
    hint: "Warm gray, copper accent",
    preview: "linear-gradient(160deg, #efeae4 0%, #e0d5c8 100%)",
    accent: "hsl(28 48% 40%)",
  },
  {
    id: "rose",
    name: "Rose",
    hint: "Soft warm gray, dusty rose",
    preview: "linear-gradient(160deg, #f0eaea 0%, #e4d8d8 100%)",
    accent: "hsl(350 22% 46%)",
  },
  {
    id: "cobalt",
    name: "Cobalt",
    hint: "Clear blue accent",
    preview: "linear-gradient(160deg, #e4ecf6 0%, #c9d7eb 100%)",
    accent: "hsl(217 55% 42%)",
  },
  {
    id: "coral",
    name: "Coral",
    hint: "Warm coral accent",
    preview: "linear-gradient(160deg, #f3e9e6 0%, #e8d4ce 100%)",
    accent: "hsl(12 58% 48%)",
  },
  {
    id: "olive",
    name: "Olive",
    hint: "Earthy olive accent",
    preview: "linear-gradient(160deg, #ecece4 0%, #d8d9c8 100%)",
    accent: "hsl(78 22% 32%)",
  },
  {
    id: "berry",
    name: "Berry",
    hint: "Muted berry accent",
    preview: "linear-gradient(160deg, #efe8ef 0%, #e0d2e0 100%)",
    accent: "hsl(320 28% 42%)",
  },
  {
    id: "honey",
    name: "Honey",
    hint: "Golden yellow accent",
    preview: "linear-gradient(160deg, #f3efe4 0%, #e6dcc4 100%)",
    accent: "hsl(42 62% 38%)",
  },
  {
    id: "midnight",
    name: "Midnight",
    hint: "Deep indigo accent",
    preview: "linear-gradient(160deg, #e6e8f0 0%, #cfd3e2 100%)",
    accent: "hsl(235 32% 42%)",
  },
];

export function themeById(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
