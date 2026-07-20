import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowUpCircle,
  Bookmark,
  ClipboardPaste,
  Download,
  Github,
  Globe,
  History,
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { downloadBackup, importAll, resetAll, useStoredState, writeKey } from "@/lib/storage";
import { ENGINES } from "@/lib/search";
import { WORLD_CLOCK_CITIES } from "@/lib/clocks";
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
  type ChromePermission,
} from "@/lib/chrome";
import { createStarterPack } from "@/lib/modules";
import type { LinearConfig } from "@/lib/linear";
import { LOCALES, t } from "@/lib/i18n";
import { GITHUB_TOKEN_URL, LINEAR_API_KEYS_URL, OAUTH_NOTE } from "@/lib/oauth";
import { clockFaceLabel } from "@/lib/clock-faces";
import type {
  ClockFaceId,
  GithubConfig,
  Settings,
  WorldClocksDisplay,
} from "@/lib/types";
import { CLOCK_FACE_IDS } from "@/lib/types";
import { CapTabMark } from "./CapTabMark";
import { SettingsLookPanel, type LookSection } from "./settings/SettingsLookPanel";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  setSettings: (next: Settings | ((prev: Settings) => Settings)) => void;
}

const EMPTY_GITHUB: GithubConfig = { username: "", token: "" };
const EMPTY_LINEAR: LinearConfig = { token: "" };

type PermissionRow = {
  id: ChromePermission;
  title: string;
  hint: string;
  icon: typeof Bookmark;
};

const BROWSER_PERMISSIONS: PermissionRow[] = [
  {
    id: "bookmarks",
    title: "Bookmarks",
    hint: "Bookmark bar and folders for the Bookmarks module.",
    icon: Bookmark,
  },
  {
    id: "history",
    title: "History",
    hint: "Recent and frequent sites for Continue, plus optional streak hints.",
    icon: History,
  },
  {
    id: "sessions",
    title: "Sessions",
    hint: "Recently closed tabs in the Continue strip.",
    icon: History,
  },
  {
    id: "topSites",
    title: "Top sites",
    hint: "Most-visited sites from this browser.",
    icon: Globe,
  },
  {
    id: "downloads",
    title: "Downloads",
    hint: "Last few downloads — open, show folder, copy path.",
    icon: Download,
  },
  {
    id: "clipboardRead",
    title: "Clipboard",
    hint: "Snapshot clipboard when you open a new tab — local shelf only.",
    icon: ClipboardPaste,
  },
];

export function SettingsDialog({ open, onOpenChange, settings, setSettings }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmStarter, setConfirmStarter] = useState(false);
  const [tab, setTab] = useState("general");
  const [lookSection, setLookSection] = useState<LookSection>("theme");
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
  const [permState, setPermState] = useState<Partial<Record<ChromePermission, boolean>>>({});
  const [permBusy, setPermBusy] = useState<ChromePermission | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);
  const extension = isExtension();

  useEffect(() => {
    if (tab === "clocks") setTab("general");
  }, [tab]);

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
    void Promise.all(
      BROWSER_PERMISSIONS.map(async (row) => {
        const ok = await hasPermission(row.id);
        return [row.id, ok] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setPermState(Object.fromEntries(entries));
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

  async function togglePermission(id: ChromePermission) {
    if (!extension) return;
    setPermBusy(id);
    try {
      const allowed = permState[id] === true;
      if (allowed) {
        const ok = await removePermission(id);
        if (ok) setPermState((prev) => ({ ...prev, [id]: false }));
      } else {
        const ok = await requestPermission(id);
        if (ok) setPermState((prev) => ({ ...prev, [id]: true }));
      }
    } finally {
      setPermBusy(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(88vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-black/6 px-6 py-4 dark:border-white/8">
            <div className="flex items-center gap-2.5">
              <CapTabMark className="h-7 w-7 shrink-0 rounded-[7px] shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
              <div className="min-w-0">
                <DialogTitle>{t("settings.title", settings.locale)}</DialogTitle>
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
              <TabsList className="grid h-9 w-full grid-cols-4">
                <TabsTrigger value="general" className="text-xs">
                  {t("settings.general", settings.locale)}
                </TabsTrigger>
                <TabsTrigger value="look" className="text-xs">
                  {t("settings.look", settings.locale)}
                </TabsTrigger>
                <TabsTrigger value="connections" className="text-xs">
                  {t("settings.connect", settings.locale)}
                </TabsTrigger>
                <TabsTrigger value="data" className="text-xs">
                  {t("settings.data", settings.locale)}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="general" className="captab-tab-enter mt-0 flex flex-col gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Display name" htmlFor="settings-name">
                    <Input
                      id="settings-name"
                      value={settings.name}
                      onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Optional"
                    />
                  </Field>

                  <Field label={t("language", settings.locale)}>
                    <Select
                      value={settings.locale}
                      onValueChange={(v) => setSettings((s) => ({ ...s, locale: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCALES.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Default search engine">
                  <Select
                    value={settings.engine}
                    onValueChange={(v) =>
                      setSettings((s) => ({ ...s, engine: v as Settings["engine"] }))
                    }
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

                <div className="flex items-center justify-between gap-3 rounded-lg border border-black/6 px-3 py-2.5 dark:border-white/8">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">AI chat shortcuts</p>
                    <p className="text-[11px] text-muted-foreground">
                      ChatGPT, Claude, Gemini, and Copilot under your shortcuts.
                    </p>
                  </div>
                  <Switch
                    checked={settings.showAiShortcuts}
                    onCheckedChange={(v) => setSettings((s) => ({ ...s, showAiShortcuts: v }))}
                    aria-label="AI chat shortcuts"
                  />
                </div>

                <div className="rounded-xl border border-black/6 p-3.5 dark:border-white/8">
                  <p className="mb-3 text-sm font-medium text-foreground">Clock</p>
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Format">
                        <ToggleGroup
                          type="single"
                          value={settings.clock24 ? "24" : "12"}
                          onValueChange={(v) =>
                            v && setSettings((s) => ({ ...s, clock24: v === "24" }))
                          }
                          className="justify-start"
                        >
                          <ToggleGroupItem value="12">12-hour</ToggleGroupItem>
                          <ToggleGroupItem value="24">24-hour</ToggleGroupItem>
                        </ToggleGroup>
                      </Field>
                      <Field label="Face">
                        <ToggleGroup
                          type="single"
                          value={settings.clockFace}
                          onValueChange={(v) =>
                            v && setSettings((s) => ({ ...s, clockFace: v as ClockFaceId }))
                          }
                          className="flex flex-wrap justify-start gap-1"
                        >
                          {CLOCK_FACE_IDS.map((face) => (
                            <ToggleGroupItem key={face} value={face} className="text-xs">
                              {clockFaceLabel(face)}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </Field>
                    </div>

                    <Field
                      label="World clocks"
                      hint="Shown beside local time in the top bar."
                    >
                      <ToggleGroup
                        type="single"
                        value={settings.worldClocksDisplay}
                        onValueChange={(v) =>
                          v &&
                          setSettings((s) => ({
                            ...s,
                            worldClocksDisplay: v as WorldClocksDisplay,
                          }))
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
                            <span className="font-clock text-[10px] tabular-nums opacity-55">
                              {city.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="rounded-lg bg-black/[0.03] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
                  <kbd className="rounded border border-black/10 bg-background px-1 py-0.5 font-mono text-[10px] text-foreground dark:border-white/15">
                    /
                  </kbd>{" "}
                  focuses search ·{" "}
                  <kbd className="rounded border border-black/10 bg-background px-1 py-0.5 font-mono text-[10px] text-foreground dark:border-white/15">
                    ⌘K
                  </kbd>{" "}
                  opens the command palette.
                </p>
              </TabsContent>

              <TabsContent value="look" className="captab-tab-enter mt-0">
                <SettingsLookPanel
                  settings={settings}
                  setSettings={setSettings}
                  appearance={theme}
                  onAppearanceChange={setTheme}
                  section={lookSection}
                  onSectionChange={setLookSection}
                />
              </TabsContent>

              <TabsContent value="connections" className="captab-tab-enter mt-0 flex flex-col gap-5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Opt-in accounts for Resume modules. Keys stay in this browser. {OAUTH_NOTE}
                </p>

                <ConnectionBlock
                  icon={Github}
                  title="GitHub"
                  hint="Username loads public activity. A token unlocks Actions, notifications, and the contribution graph."
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" className="h-8" onClick={saveGithub}>
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> {t("save", settings.locale)}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8" asChild>
                        <a href={GITHUB_TOKEN_URL} target="_blank" rel="noreferrer">
                          Open GitHub token page
                        </a>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" className="h-8" onClick={saveLinear}>
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> {t("save", settings.locale)}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8" asChild>
                        <a href={LINEAR_API_KEYS_URL} target="_blank" rel="noreferrer">
                          Open Linear API keys
                        </a>
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
                  title="Browser access"
                  hint={
                    extension
                      ? "Optional Chrome permissions. CapTab only reads what you allow — nothing is uploaded."
                      : "Install CapTab as an extension to enable browser access."
                  }
                >
                  <div className="flex flex-col gap-2.5">
                    {BROWSER_PERMISSIONS.map((row) => {
                      const Icon = row.icon;
                      const allowed = permState[row.id] === true;
                      const busy = permBusy === row.id;
                      return (
                        <div
                          key={row.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-black/6 px-3 py-2.5 dark:border-white/8"
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                              {row.title}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                              {row.hint}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={allowed ? "outline" : "default"}
                            className="h-8 shrink-0"
                            disabled={!extension || busy}
                            onClick={() => void togglePermission(row.id)}
                          >
                            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                            {!extension ? "N/A" : allowed ? "Revoke" : "Allow"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ConnectionBlock>
              </TabsContent>

              <TabsContent value="data" className="captab-tab-enter mt-0 flex flex-col gap-5">
                <Field
                  label="Chrome sync"
                  hint="Mirror settings and shortcuts via chrome.storage.sync (extension only, size-limited)."
                >
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-black/6 px-3 py-2.5 dark:border-white/8">
                    <span className="text-sm text-foreground">Sync settings via Chrome sync</span>
                    <Switch
                      checked={settings.chromeSync}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, chromeSync: v }))}
                      aria-label="Chrome sync"
                    />
                  </div>
                </Field>

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
