import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowUpCircle,
  Bookmark,
  Download,
  Github,
  KeyRound,
  Loader2,
  SquareKanban,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { downloadBackup, importAll, resetAll, useStoredState, writeKey } from "@/lib/storage";
import { ENGINES } from "@/lib/search";
import { WORLD_CLOCK_CITIES } from "@/lib/clocks";
import { THEMES } from "@/lib/themes";
import { FONTS, SURFACES } from "@/lib/look";
import { LAYOUT_MODES, WALLPAPERS } from "@/lib/scene";
import {
  RELEASES_URL,
  checkForUpdate,
  getCurrentVersion,
  type UpdateInfo,
} from "@/lib/updates";
import {
  hasPermission,
  isExtension,
  removePermission,
  requestPermission,
} from "@/lib/chrome";
import { createStarterPack } from "@/lib/modules";
import type { LinearConfig } from "@/lib/linear";
import type {
  FontId,
  GithubConfig,
  LayoutModeId,
  Settings,
  SurfaceId,
  ThemeId,
  WallpaperId,
  WorldClocksDisplay,
} from "@/lib/types";
import { CapTabMark } from "./CapTabMark";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  setSettings: (next: Settings | ((prev: Settings) => Settings)) => void;
}

const EMPTY_GITHUB: GithubConfig = { username: "", token: "" };
const EMPTY_LINEAR: LinearConfig = { token: "" };

export function SettingsDialog({ open, onOpenChange, settings, setSettings }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmStarter, setConfirmStarter] = useState(false);
  const [tab, setTab] = useState("general");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "current" | "error">("idle");
  const [updateError, setUpdateError] = useState("");
  const version = getCurrentVersion();

  const [githubConfig, setGithubConfig] = useStoredState<GithubConfig>("github-config", EMPTY_GITHUB);
  const [linearConfig, setLinearConfig] = useStoredState<LinearConfig>("linear-config", EMPTY_LINEAR);
  const [ghUser, setGhUser] = useState(githubConfig.username);
  const [ghToken, setGhToken] = useState(githubConfig.token);
  const [linToken, setLinToken] = useState(linearConfig.token);
  const [ghSaved, setGhSaved] = useState(false);
  const [linSaved, setLinSaved] = useState(false);
  const [bookmarksAllowed, setBookmarksAllowed] = useState(false);
  const [bookmarksBusy, setBookmarksBusy] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const extension = isExtension();

  useEffect(() => {
    if (!open) return;
    setGhUser(githubConfig.username);
    setGhToken(githubConfig.token);
    setLinToken(linearConfig.token);
    setGhSaved(false);
    setLinSaved(false);
    setCacheCleared(false);
  }, [open, githubConfig.username, githubConfig.token, linearConfig.token]);

  useEffect(() => {
    if (!open || tab !== "connections") return;
    let cancelled = false;
    void hasPermission("bookmarks").then((ok) => {
      if (!cancelled) setBookmarksAllowed(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  useEffect(() => {
    if (!open || tab !== "data") return;
    let cancelled = false;
    setUpdateStatus("checking");
    setUpdateError("");
    void checkForUpdate()
      .then((info) => {
        if (cancelled) return;
        setUpdateInfo(info);
        setUpdateStatus(info ? "idle" : "current");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setUpdateInfo(null);
        setUpdateStatus("error");
        setUpdateError(err instanceof Error ? err.message : "Could not check for updates");
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab]);

  async function refreshUpdateCheck() {
    setUpdateStatus("checking");
    setUpdateError("");
    try {
      const info = await checkForUpdate({ force: true });
      setUpdateInfo(info);
      setUpdateStatus(info ? "idle" : "current");
    } catch (err: unknown) {
      setUpdateInfo(null);
      setUpdateStatus("error");
      setUpdateError(err instanceof Error ? err.message : "Could not check for updates");
    }
  }

  async function doImport(file: File) {
    setImportError("");
    const text = await file.text();
    const result = importAll(text);
    if (result.ok) {
      window.location.reload();
    } else {
      setImportError(result.error);
    }
  }

  function saveGithub() {
    setGithubConfig({ username: ghUser.trim(), token: ghToken.trim() });
    setGhSaved(true);
  }

  function saveLinear() {
    setLinearConfig({ token: linToken.trim() });
    setLinSaved(true);
  }

  function clearApiCaches() {
    writeKey("github-cache", null);
    writeKey("linear-cache", null);
    setCacheCleared(true);
  }

  function restoreStarterLayout() {
    const pack = createStarterPack();
    writeKey("layout", pack.layout);
    writeKey("module-data", pack.data);
    writeKey("starter-done", true);
    setConfirmStarter(false);
    onOpenChange(false);
  }

  async function toggleBookmarks() {
    if (!extension) return;
    setBookmarksBusy(true);
    try {
      if (bookmarksAllowed) {
        const ok = await removePermission("bookmarks");
        if (ok) setBookmarksAllowed(false);
      } else {
        const ok = await requestPermission("bookmarks");
        if (ok) setBookmarksAllowed(true);
      }
    } finally {
      setBookmarksBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-black/6 px-6 py-4 dark:border-white/8">
            <div className="flex items-center gap-2.5">
              <CapTabMark className="h-7 w-7 shrink-0 rounded-[7px] shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
              <div className="min-w-0">
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>Stored only in this browser, on this device.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="shrink-0 px-6 pt-3">
              <TabsList className="grid h-9 w-full grid-cols-5">
                <TabsTrigger value="general" className="px-1 text-[11px] sm:text-xs">
                  General
                </TabsTrigger>
                <TabsTrigger value="look" className="px-1 text-[11px] sm:text-xs">
                  Look
                </TabsTrigger>
                <TabsTrigger value="clocks" className="px-1 text-[11px] sm:text-xs">
                  Clocks
                </TabsTrigger>
                <TabsTrigger value="connections" className="px-1 text-[11px] sm:text-xs">
                  Connect
                </TabsTrigger>
                <TabsTrigger value="data" className="px-1 text-[11px] sm:text-xs">
                  Data
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="general" className="captab-tab-enter mt-0 flex flex-col gap-5">
                <Field label="Display name" htmlFor="settings-name">
                  <Input
                    id="settings-name"
                    value={settings.name}
                    onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Optional"
                  />
                </Field>

                <Field label="Default search engine">
                  <Select
                    value={settings.engine}
                    onValueChange={(v) => setSettings((s) => ({ ...s, engine: v as Settings["engine"] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENGINES.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Clock format">
                  <ToggleGroup
                    type="single"
                    value={settings.clock24 ? "24" : "12"}
                    onValueChange={(v) => v && setSettings((s) => ({ ...s, clock24: v === "24" }))}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="12">12-hour</ToggleGroupItem>
                    <ToggleGroupItem value="24">24-hour</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <p className="rounded-lg bg-black/[0.03] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                  Press{" "}
                  <kbd className="rounded border border-black/10 bg-background px-1 py-0.5 font-mono text-[10px] text-foreground dark:border-white/15">
                    /
                  </kbd>{" "}
                  anywhere on the page to focus search.
                </p>
              </TabsContent>

              <TabsContent value="look" className="captab-tab-enter mt-0 flex flex-col gap-5">
                <Field label="Appearance">
                  <ToggleGroup
                    type="single"
                    value={theme ?? "system"}
                    onValueChange={(v) => v && setTheme(v)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="system">System</ToggleGroupItem>
                    <ToggleGroupItem value="light">Light</ToggleGroupItem>
                    <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field label="Theme" hint="Page wash and accent, as a pair.">
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {THEMES.map((t) => {
                      const selected = settings.theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          title={`${t.name} — ${t.hint}`}
                          aria-label={`Theme: ${t.name}`}
                          aria-pressed={selected}
                          onClick={() => setSettings((s) => ({ ...s, theme: t.id as ThemeId }))}
                          className={cn(
                            "flex flex-col gap-1 rounded-lg p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                            selected
                              ? "bg-black/5 dark:bg-white/10"
                              : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                          )}
                        >
                          <span
                            className={cn(
                              "relative h-7 w-full overflow-hidden rounded-md",
                              selected && "ring-2 ring-ac"
                            )}
                            style={{ background: t.preview }}
                          >
                            <span
                              className="absolute bottom-1 right-1 h-2 w-2 rounded-full shadow-sm ring-1 ring-black/10"
                              style={{ backgroundColor: t.accent }}
                            />
                          </span>
                          <span className="px-0.5 text-[11px] text-foreground/75">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field
                  label="Wallpaper"
                  hint="Handmade scenic art under the theme wash. Default is Impasto."
                >
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {WALLPAPERS.map((w) => {
                      const selected = settings.wallpaper === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          title={w.hint}
                          aria-label={`Wallpaper: ${w.name}`}
                          aria-pressed={selected}
                          onClick={() =>
                            setSettings((s) => ({ ...s, wallpaper: w.id as WallpaperId }))
                          }
                          className={cn(
                            "flex flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                            selected
                              ? "border-ac/40 bg-ac/10"
                              : "border-black/8 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                          )}
                        >
                          <span
                            className={cn(
                              "relative h-12 w-full overflow-hidden rounded-md bg-cover bg-center",
                              selected && "ring-2 ring-ac"
                            )}
                            style={
                              w.src
                                ? { backgroundImage: `url(${w.src})` }
                                : { background: w.preview }
                            }
                          />
                          <span className="px-0.5">
                            <span className="block text-sm font-medium text-foreground">{w.name}</span>
                            <span className="block text-[10px] leading-snug text-muted-foreground">
                              {w.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field
                  label="Layout"
                  hint="How modules arrange — your module order and sizes stay the same."
                >
                  <div className="grid grid-cols-2 gap-1.5">
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
                            "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                            selected
                              ? "border-ac/40 bg-ac/10"
                              : "border-black/8 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                          )}
                        >
                          <LayoutModeGlyph mode={m.id} active={selected} />
                          <span className="text-sm font-medium text-foreground">{m.name}</span>
                          <span className="text-[10px] leading-snug text-muted-foreground">
                            {m.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field
                  label="Surface"
                  hint="Greyscale texture over the theme wash — colour comes from your theme."
                >
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {SURFACES.map((s) => {
                      const selected = settings.surface === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          title={s.hint}
                          aria-label={`Surface: ${s.name}`}
                          aria-pressed={selected}
                          onClick={() => setSettings((prev) => ({ ...prev, surface: s.id as SurfaceId }))}
                          className={cn(
                            "flex flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                            selected
                              ? "border-ac/40 bg-ac/10"
                              : "border-black/8 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.05]"
                          )}
                        >
                          <span
                            className={cn(
                              "relative h-10 w-full overflow-hidden rounded-md",
                              selected && "ring-2 ring-ac"
                            )}
                            style={{
                              background: selected
                                ? undefined
                                : "linear-gradient(160deg, hsl(var(--page-bg)), hsl(var(--ac) / 0.2))",
                            }}
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
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                                Flat
                              </span>
                            )}
                          </span>
                          <span className="px-0.5">
                            <span className="block text-sm font-medium text-foreground">{s.name}</span>
                            <span className="block text-[10px] leading-snug text-muted-foreground">
                              {s.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Font" hint="System faces only — no font downloads.">
                  <div className="flex flex-col gap-1">
                    {FONTS.map((f) => {
                      const selected = settings.font === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          aria-label={`Font: ${f.name}`}
                          aria-pressed={selected}
                          onClick={() => setSettings((prev) => ({ ...prev, font: f.id as FontId }))}
                          className={cn(
                            "flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
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
                            className="truncate text-sm text-foreground/80"
                            style={{ fontFamily: f.stack }}
                          >
                            The quick brown fox
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </TabsContent>

              <TabsContent value="clocks" className="captab-tab-enter mt-0 flex flex-col gap-5">
                <Field
                  label="World clocks"
                  hint="Local time stays in the top bar. Add cities to show beside it."
                >
                  <ToggleGroup
                    type="single"
                    value={settings.worldClocksDisplay}
                    onValueChange={(v) =>
                      v && setSettings((s) => ({ ...s, worldClocksDisplay: v as WorldClocksDisplay }))
                    }
                    className="justify-start"
                  >
                    <ToggleGroupItem value="hover">On hover</ToggleGroupItem>
                    <ToggleGroupItem value="always">Always</ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <div className="flex flex-wrap gap-1.5">
                  {WORLD_CLOCK_CITIES.map((city) => {
                    const selected = settings.worldClocks.includes(city.id);
                    return (
                      <button
                        key={city.id}
                        type="button"
                        aria-pressed={selected}
                        title={city.city}
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            worldClocks: selected
                              ? s.worldClocks.filter((id) => id !== city.id)
                              : [...s.worldClocks, city.id],
                          }))
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac/60",
                          selected
                            ? "bg-ac/15 text-foreground ring-1 ring-ac/35"
                            : "bg-black/[0.04] text-muted-foreground hover:bg-black/[0.07] hover:text-foreground dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                        )}
                      >
                        <span className="font-medium">{city.city}</span>
                        <span className="font-clock text-[10px] tabular-nums opacity-55">{city.label}</span>
                      </button>
                    );
                  })}
                </div>

                {settings.worldClocks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No cities selected yet.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {settings.worldClocks.length} selected
                    {settings.worldClocksDisplay === "hover" ? " · reveal on hover" : " · always visible"}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="connections" className="captab-tab-enter mt-0 flex flex-col gap-6">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Opt-in accounts for Resume modules. Keys stay in this browser — never uploaded by
                  CapTab. Agenda feeds, RSS, and weather stay on each module.
                </p>

                <ConnectionBlock
                  icon={Github}
                  title="GitHub"
                  hint="Username loads public activity. A token unlocks Actions and notifications."
                >
                  <div className="flex flex-col gap-2">
                    <Input
                      value={ghUser}
                      onChange={(e) => {
                        setGhUser(e.target.value);
                        setGhSaved(false);
                      }}
                      placeholder="username"
                      aria-label="GitHub username"
                      className="h-9"
                      autoComplete="off"
                    />
                    <Input
                      type="password"
                      value={ghToken}
                      onChange={(e) => {
                        setGhToken(e.target.value);
                        setGhSaved(false);
                      }}
                      placeholder="Personal access token (optional)"
                      aria-label="GitHub personal access token"
                      className="h-9"
                      autoComplete="off"
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" className="h-8" onClick={saveGithub}>
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Save
                      </Button>
                      {ghSaved ? (
                        <span className="text-[11px] text-muted-foreground">Saved</span>
                      ) : null}
                      {githubConfig.username.trim() ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-muted-foreground"
                          onClick={() => {
                            setGhUser("");
                            setGhToken("");
                            setGithubConfig(EMPTY_GITHUB);
                            writeKey("github-cache", null);
                            setGhSaved(false);
                          }}
                        >
                          Disconnect
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </ConnectionBlock>

                <ConnectionBlock
                  icon={SquareKanban}
                  title="Linear"
                  hint="Personal API key from Linear → Settings → Security & access."
                >
                  <div className="flex flex-col gap-2">
                    <Input
                      type="password"
                      value={linToken}
                      onChange={(e) => {
                        setLinToken(e.target.value);
                        setLinSaved(false);
                      }}
                      placeholder="lin_api_…"
                      aria-label="Linear personal API key"
                      className="h-9"
                      autoComplete="off"
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" className="h-8" onClick={saveLinear}>
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Save
                      </Button>
                      {linSaved ? (
                        <span className="text-[11px] text-muted-foreground">Saved</span>
                      ) : null}
                      {linearConfig.token.trim() ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-muted-foreground"
                          onClick={() => {
                            setLinToken("");
                            setLinearConfig(EMPTY_LINEAR);
                            writeKey("linear-cache", null);
                            setLinSaved(false);
                          }}
                        >
                          Disconnect
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </ConnectionBlock>

                <ConnectionBlock
                  icon={Bookmark}
                  title="Bookmarks"
                  hint={
                    extension
                      ? "Chrome only reads bookmarks when you allow it. Nothing is uploaded."
                      : "Install CapTab as an extension to enable bookmark access."
                  }
                >
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={bookmarksAllowed ? "outline" : "default"}
                      className="h-8"
                      disabled={!extension || bookmarksBusy}
                      onClick={() => void toggleBookmarks()}
                    >
                      {bookmarksBusy ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {bookmarksAllowed ? "Revoke access" : "Allow bookmarks"}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      {!extension
                        ? "Unavailable here"
                        : bookmarksAllowed
                          ? "Allowed"
                          : "Not allowed"}
                    </span>
                  </div>
                </ConnectionBlock>
              </TabsContent>

              <TabsContent value="data" className="captab-tab-enter mt-0 flex flex-col gap-5">
                <Field label="Version" hint={`Installed ${version}`}>
                  {updateInfo ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-ac/25 bg-ac/10 px-3.5 py-3">
                      <div className="flex items-start gap-2.5">
                        <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-ac" />
                        <div className="min-w-0 flex-1 text-xs leading-relaxed">
                          <p className="font-medium text-foreground">
                            Update available · v{updateInfo.latestVersion}
                          </p>
                          <p className="mt-0.5 text-muted-foreground">
                            Download the zip, then load the unpacked folder in{" "}
                            <span className="text-foreground/80">chrome://extensions</span>.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" asChild>
                          <a
                            href={updateInfo.zipUrl ?? RELEASES_URL}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Download v
                            {updateInfo.latestVersion}
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                            Releases
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {updateStatus === "checking" ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
                        </span>
                      ) : updateStatus === "current" ? (
                        <span className="text-xs text-muted-foreground">You’re up to date.</span>
                      ) : updateStatus === "error" ? (
                        <span className="text-xs text-destructive">{updateError}</span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => void refreshUpdateCheck()}
                      >
                        Check again
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7" asChild>
                        <a href={RELEASES_URL} target="_blank" rel="noreferrer">
                          Releases
                        </a>
                      </Button>
                    </div>
                  )}
                </Field>

                <Field
                  label="Layout"
                  hint="Replace the module dock with the calm first-run set (Focus, Checklist, Weather)."
                >
                  <Button type="button" variant="outline" size="sm" onClick={() => setConfirmStarter(true)}>
                    Restore starter layout
                  </Button>
                </Field>

                <Field
                  label="API caches"
                  hint="Clears cached GitHub and Linear responses. Tokens and module content stay."
                >
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={clearApiCaches}>
                      Clear caches
                    </Button>
                    {cacheCleared ? (
                      <span className="text-[11px] text-muted-foreground">Cleared</span>
                    ) : null}
                  </div>
                </Field>

                <Field label="Backup">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadBackup()}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setConfirmReset(true)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Reset all
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void doImport(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {importError ? <p className="mt-2 text-xs text-destructive">{importError}</p> : null}
                </Field>

                <p className="text-xs text-muted-foreground">
                  Add modules with <span className="text-foreground/80">+ Add module</span> under search.
                  Drag to reorder; use ⋯ on a module to resize or remove. Credentials live under{" "}
                  <span className="text-foreground/80">Connect</span>.
                </p>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all CapTab data in this browser — shortcuts, settings, modules,
              and GitHub/Linear credentials. Consider exporting first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetAll();
                window.location.reload();
              }}
            >
              Reset all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmStarter} onOpenChange={setConfirmStarter}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore starter layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces your current module dock with Focus, Checklist, and Weather. Other settings,
              shortcuts, and connection keys are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={restoreStarterLayout}>Restore layout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ConnectionBlock({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/8 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ac/10 text-ac">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function LayoutModeGlyph({ mode, active }: { mode: LayoutModeId; active: boolean }) {
  const cell = cn("rounded-[2px]", active ? "bg-ac/70" : "bg-foreground/25");
  return (
    <span className="mb-0.5 flex h-7 w-full items-end gap-0.5" aria-hidden>
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
          <span className={cn(cell, "h-4 w-[22%]")} />
        </>
      ) : null}
      {mode === "magazine" ? (
        <>
          <span className={cn(cell, "h-5 w-[58%]")} />
          <span className="flex h-5 flex-1 flex-col gap-0.5">
            <span className={cn(cell, "h-2 w-full")} />
            <span className={cn(cell, "h-2.5 w-full")} />
          </span>
        </>
      ) : null}
      {mode === "islands" ? (
        <>
          <span className={cn(cell, "mb-1.5 h-3.5 flex-1")} />
          <span className={cn(cell, "mt-1.5 h-4 flex-1")} />
        </>
      ) : null}
    </span>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
