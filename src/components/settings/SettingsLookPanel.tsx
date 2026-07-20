import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/themes";
import { FONTS, SURFACES } from "@/lib/look";
import { LAYOUT_MODES, WALLPAPERS } from "@/lib/scene";
import type {
  FontId,
  LayoutModeId,
  Settings,
  SurfaceId,
  ThemeId,
  WallpaperId,
} from "@/lib/types";

export type LookSection = "theme" | "wallpaper" | "layout" | "type" | "advanced";

const LOOK_SECTIONS: { id: LookSection; label: string }[] = [
  { id: "theme", label: "Theme" },
  { id: "wallpaper", label: "Wallpaper" },
  { id: "layout", label: "Layout" },
  { id: "type", label: "Type" },
  { id: "advanced", label: "More" },
];

interface SettingsLookPanelProps {
  settings: Settings;
  setSettings: (next: Settings | ((prev: Settings) => Settings)) => void;
  appearance: string | undefined;
  onAppearanceChange: (value: string) => void;
  section: LookSection;
  onSectionChange: (section: LookSection) => void;
}

/** Look settings split into short panels so the dialog never becomes a long scroll. */
export function SettingsLookPanel({
  settings,
  setSettings,
  appearance,
  onAppearanceChange,
  section,
  onSectionChange,
}: SettingsLookPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Look sections"
        className="flex flex-wrap gap-1 rounded-lg bg-black/[0.04] p-1 dark:bg-white/[0.06]"
      >
        {LOOK_SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSectionChange(s.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {section === "theme" ? (
        <div className="flex flex-col gap-4">
          <Field label="Appearance">
            <ToggleGroup
              type="single"
              value={appearance ?? "system"}
              onValueChange={(v) => v && onAppearanceChange(v)}
              className="justify-start"
            >
              <ToggleGroupItem value="system">System</ToggleGroupItem>
              <ToggleGroupItem value="light">Light</ToggleGroupItem>
              <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field label="Theme" hint="Wash and accent as a pair.">
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {THEMES.map((theme) => {
                const selected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    title={`${theme.name} — ${theme.hint}`}
                    aria-label={`Theme: ${theme.name}`}
                    aria-pressed={selected}
                    onClick={() => setSettings((s) => ({ ...s, theme: theme.id as ThemeId }))}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                      selected
                        ? "bg-black/5 dark:bg-white/10"
                        : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                    )}
                  >
                    <span
                      className={cn(
                        "relative h-6 w-full overflow-hidden rounded-md",
                        selected && "ring-2 ring-ac"
                      )}
                      style={{ background: theme.preview }}
                    >
                      <span
                        className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full shadow-sm ring-1 ring-black/10"
                        style={{ backgroundColor: theme.accent }}
                      />
                    </span>
                    <span className="truncate px-0.5 text-[10px] text-foreground/75">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      ) : null}

      {section === "wallpaper" ? (
        <div className="flex flex-col gap-3">
          <Field
            label="Wallpaper"
            hint="Handmade scenes by default. Daily photo is opt-in network."
          >
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {WALLPAPERS.map((w) => {
                const selected =
                  !settings.customWallpaperDataUrl && settings.wallpaper === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    title={w.hint}
                    aria-label={`Wallpaper: ${w.name}`}
                    aria-pressed={selected}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        wallpaper: w.id as WallpaperId,
                        customWallpaperDataUrl: "",
                      }))
                    }
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                      selected
                        ? "border-ac/40 bg-ac/10"
                        : "border-black/8 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                    )}
                  >
                    <span
                      className={cn(
                        "relative h-10 w-full overflow-hidden rounded-md bg-cover bg-center",
                        selected && "ring-2 ring-ac"
                      )}
                      style={
                        w.src
                          ? { backgroundImage: `url(${w.src})` }
                          : { background: w.preview }
                      }
                    />
                    <span className="truncate px-0.5 text-[11px] font-medium text-foreground">
                      {w.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <FileChip
              label="Upload image"
              accept="image/*"
              maxBytes={1.5 * 1024 * 1024}
              tooBig="Image is larger than ~1.5 MB — try a smaller file."
              onDataUrl={(dataUrl) =>
                setSettings((s) => ({ ...s, customWallpaperDataUrl: dataUrl }))
              }
            />
            {settings.customWallpaperDataUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSettings((s) => ({ ...s, customWallpaperDataUrl: "" }))}
              >
                Clear upload
              </Button>
            ) : null}
          </div>
          {settings.customWallpaperDataUrl ? (
            <span
              className="block h-14 w-full overflow-hidden rounded-md bg-cover bg-center ring-1 ring-black/10 dark:ring-white/10"
              style={{ backgroundImage: `url(${settings.customWallpaperDataUrl})` }}
              aria-label="Custom wallpaper preview"
            />
          ) : null}
        </div>
      ) : null}

      {section === "layout" ? (
        <div className="flex flex-col gap-4">
          <Field label="Module layout" hint="Order and sizes stay the same.">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {LAYOUT_MODES.map((m) => {
                const selected = settings.layoutMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    title={m.hint}
                    aria-label={`Layout: ${m.name}`}
                    aria-pressed={selected}
                    onClick={() =>
                      setSettings((s) => ({ ...s, layoutMode: m.id as LayoutModeId }))
                    }
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                      selected
                        ? "border-ac/40 bg-ac/10"
                        : "border-black/8 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                    )}
                  >
                    <LayoutModeGlyph mode={m.id} active={selected} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{m.name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {m.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Surface" hint="Greyscale texture over the wash.">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {SURFACES.map((s) => {
                const selected = settings.surface === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    title={s.hint}
                    aria-label={`Surface: ${s.name}`}
                    aria-pressed={selected}
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, surface: s.id as SurfaceId }))
                    }
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                      selected
                        ? "border-ac/40 bg-ac/10"
                        : "border-black/8 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                    )}
                  >
                    <span
                      className={cn(
                        "relative h-8 w-full overflow-hidden rounded-md",
                        selected && "ring-2 ring-ac"
                      )}
                    >
                      <span
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(160deg, hsl(var(--page-bg)), hsl(var(--ac) / 0.25))",
                        }}
                      />
                      {s.tile ? (
                        <span
                          className="absolute inset-0 opacity-55 mix-blend-multiply dark:opacity-45 dark:mix-blend-soft-light"
                          style={{
                            backgroundImage: `url(${s.tile})`,
                            backgroundSize: s.tileSize ?? "128px 128px",
                            imageRendering: s.id === "dither" ? "pixelated" : undefined,
                          }}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground">
                          Flat
                        </span>
                      )}
                    </span>
                    <span className="truncate px-0.5 text-[10px] font-medium text-foreground">
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      ) : null}

      {section === "type" ? (
        <Field label="Font" hint="System faces only — no downloads.">
          <div className="flex flex-col gap-1">
            {FONTS.map((f) => {
              const selected = settings.font === f.id && !settings.customFontStack.trim();
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-label={`Font: ${f.name}`}
                  aria-pressed={selected}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      font: f.id as FontId,
                      customFontStack: "",
                    }))
                  }
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                    selected
                      ? "border-ac/40 bg-ac/10"
                      : "border-black/8 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{f.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{f.hint}</span>
                  </span>
                  <span
                    className="shrink-0 text-sm text-foreground/70"
                    style={{ fontFamily: f.stack }}
                  >
                    Aa
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
      ) : null}

      {section === "advanced" ? (
        <div className="flex flex-col gap-4">
          <Field label="Custom favicon" hint="Replaces the tab icon on CapTab only.">
            <div className="flex flex-wrap items-center gap-2">
              <FileChip
                label="Upload favicon"
                accept="image/*,.ico"
                maxBytes={256 * 1024}
                tooBig="Favicon larger than 256 KB — try a smaller file."
                onDataUrl={(dataUrl) =>
                  setSettings((s) => ({ ...s, customFaviconDataUrl: dataUrl }))
                }
              />
              {settings.customFaviconDataUrl ? (
                <>
                  <img
                    src={settings.customFaviconDataUrl}
                    alt=""
                    className="h-6 w-6 rounded-sm ring-1 ring-black/10 dark:ring-white/10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSettings((s) => ({ ...s, customFaviconDataUrl: "" }))}
                  >
                    Clear
                  </Button>
                </>
              ) : null}
            </div>
          </Field>

          <Field
            label="Custom font stack"
            hint='Overrides the font picker — e.g. "Georgia, serif".'
          >
            <Input
              value={settings.customFontStack}
              onChange={(e) => setSettings((s) => ({ ...s, customFontStack: e.target.value }))}
              placeholder="Optional CSS font-family"
              className="font-mono text-xs"
            />
          </Field>

          <Field
            label="Custom CSS"
            hint="Injected on the new tab page. Use sparingly."
          >
            <Textarea
              value={settings.customCss}
              onChange={(e) => setSettings((s) => ({ ...s, customCss: e.target.value }))}
              placeholder={"/* e.g. .captab-wash { opacity: 0.85; } */"}
              className="min-h-[6rem] font-mono text-xs"
              spellCheck={false}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

function FileChip({
  label,
  accept,
  maxBytes,
  tooBig,
  onDataUrl,
}: {
  label: string;
  accept: string;
  maxBytes: number;
  tooBig: string;
  onDataUrl: (dataUrl: string) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/8 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]">
      <Upload className="h-3.5 w-3.5" />
      {label}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > maxBytes) {
            window.alert(tooBig);
            e.target.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            if (dataUrl) onDataUrl(dataUrl);
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function LayoutModeGlyph({ mode, active }: { mode: LayoutModeId; active: boolean }) {
  const cell = cn("rounded-[2px]", active ? "bg-ac/70" : "bg-foreground/25");
  return (
    <span className="flex h-8 w-10 shrink-0 items-end gap-0.5" aria-hidden>
      {mode === "stack" ? (
        <>
          <span className={cn(cell, "h-4 flex-1")} />
          <span className={cn(cell, "h-5 flex-1")} />
        </>
      ) : null}
      {mode === "bento" ? (
        <>
          <span className={cn(cell, "h-5 w-[38%]")} />
          <span className="flex h-5 flex-1 flex-col gap-0.5">
            <span className={cn(cell, "h-2 w-full")} />
            <span className={cn(cell, "h-2.5 w-full")} />
          </span>
        </>
      ) : null}
      {mode === "magazine" ? (
        <>
          <span className={cn(cell, "h-5 w-[55%]")} />
          <span className="flex h-5 flex-1 flex-col gap-0.5">
            <span className={cn(cell, "h-2 w-full")} />
            <span className={cn(cell, "h-2.5 w-full")} />
          </span>
        </>
      ) : null}
      {mode === "islands" ? (
        <>
          <span className={cn(cell, "mb-1 h-3.5 flex-1")} />
          <span className={cn(cell, "mt-1 h-4 flex-1")} />
        </>
      ) : null}
      {mode === "freeform" ? (
        <span className="relative block h-7 w-full">
          <span className={cn(cell, "absolute left-0 top-1 h-2.5 w-4")} />
          <span className={cn(cell, "absolute left-[35%] top-3.5 h-3 w-5")} />
          <span className={cn(cell, "absolute right-0 top-0 h-2.5 w-3.5")} />
        </span>
      ) : null}
    </span>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Label>{label}</Label>
        {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
