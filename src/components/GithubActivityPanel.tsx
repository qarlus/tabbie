import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  CircleX,
  GitPullRequest,
  Github,
  KeyRound,
  Loader2,
  MinusCircle,
  Play,
  RefreshCw,
  Workflow,
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useStoredState } from "@/lib/storage";
import { fastLinkProps } from "@/lib/fast-link";
import { fetchContributions, fetchGithub, GithubError, isActionRunning, relativeTime, type ContributionCalendar } from "@/lib/github";
import { UI_EVENTS } from "@/lib/events";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";
import type { GithubCache, GithubConfig, GithubItem } from "@/lib/types";

type FeedFilter = "all" | "pr" | "issue" | "notification" | "action";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pr", label: "PRs" },
  { id: "issue", label: "Issues" },
  { id: "action", label: "Actions" },
  { id: "notification", label: "Notifs" },
];

function orgOf(repo: string): string {
  return repo.split("/")[0] || repo;
}

function normalizeCache(cache: GithubCache | null): GithubCache | null {
  if (!cache) return null;
  return { ...cache, actions: cache.actions ?? [] };
}

export function GithubActivityPanel({
  className,
  leading,
  menu,
}: {
  className?: string;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  const [config, setConfig] = useStoredState<GithubConfig>("github-config", { username: "", token: "" });
  const [cacheRaw, setCache] = useStoredState<GithubCache | null>("github-cache", null);
  const cache = useMemo(() => normalizeCache(cacheRaw), [cacheRaw]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [org, setOrg] = useState<string>("all");
  const [repo, setRepo] = useState<string>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contribOpen, setContribOpen] = useState(false);
  const [contrib, setContrib] = useState<ContributionCalendar | null>(null);
  const [contribLoading, setContribLoading] = useState(false);

  const configured = config.username.trim().length > 0;
  const hasToken = config.token.trim().length > 0;

  const refresh = useCallback(
    async (override?: GithubConfig) => {
      const cfg = override ?? config;
      if (!cfg.username.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGithub(cfg);
        setCache(data);
      } catch (e) {
        if (e instanceof GithubError) setError(e.message);
        else setError("Something went wrong talking to GitHub.");
      } finally {
        setLoading(false);
      }
    },
    [config, setCache]
  );

  useEffect(() => {
    if (!configured) return;
    // Fresh fetch on every new tab; cached feed still paints immediately.
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, config.username, config.token]);

  useEffect(() => {
    if (!hasToken || !contribOpen) return;
    let cancelled = false;
    setContribLoading(true);
    void fetchContributions(config.token)
      .then((data) => {
        if (!cancelled) setContrib(data);
      })
      .finally(() => {
        if (!cancelled) setContribLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken, contribOpen, config.token]);

  useEffect(() => {
    const onRefresh = () => void refresh();
    window.addEventListener(UI_EVENTS.refreshGithub, onRefresh);
    return () => window.removeEventListener(UI_EVENTS.refreshGithub, onRefresh);
  }, [refresh]);

  const allItems = useMemo(() => {
    if (!cache) return [];
    const merged = [...cache.prs, ...cache.issues, ...cache.notifications, ...cache.actions];
    merged.sort((a, b) => {
      const aRun = a.kind === "action" && isActionRunning(a.state) ? 0 : 1;
      const bRun = b.kind === "action" && isActionRunning(b.state) ? 0 : 1;
      if (aRun !== bRun) return aRun - bRun;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
    return merged;
  }, [cache]);

  const runningCount = useMemo(
    () => (cache?.actions ?? []).filter((a) => isActionRunning(a.state)).length,
    [cache]
  );
  const orgs = useMemo(() => {
    const set = new Set(allItems.map((i) => orgOf(i.repo)).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const repos = useMemo(() => {
    const set = new Set(
      allItems
        .filter((i) => org === "all" || orgOf(i.repo) === org)
        .map((i) => i.repo)
        .filter(Boolean)
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allItems, org]);

  // Reset repo when org changes and current repo is out of scope.
  useEffect(() => {
    if (repo !== "all" && !repos.includes(repo)) setRepo("all");
  }, [repos, repo]);

  const feed = useMemo(() => {
    return allItems.filter((i) => {
      if (filter !== "all" && i.kind !== filter) return false;
      if (org !== "all" && orgOf(i.repo) !== org) return false;
      if (repo !== "all" && i.repo !== repo) return false;
      return true;
    });
  }, [allItems, filter, org, repo]);

  const urgency = useMemo(() => {
    if (!cache) return null;
    const parts: string[] = [];
    if (runningCount) parts.push(`${runningCount} running`);
    if (cache.prs.length) parts.push(`${cache.prs.length} PR${cache.prs.length === 1 ? "" : "s"}`);
    if (cache.issues.length) parts.push(`${cache.issues.length} issue${cache.issues.length === 1 ? "" : "s"}`);
    if (cache.notifications.length)
      parts.push(`${cache.notifications.length} notif${cache.notifications.length === 1 ? "" : "s"}`);
    return parts.length ? parts.join(" · ") : "Quiet";
  }, [cache, runningCount]);

  if (!configured) {
    return (
      <Panel title="GitHub" className={className} leading={leading} actions={menu}>
        <GithubInlineSetup
          onSave={(next) => {
            setConfig(next);
          }}
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="GitHub"
      className={className}
      leading={leading}
      badge={urgency ? <span className="text-xs text-muted-foreground">{urgency}</span> : null}
      actions={
        <>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className={cn(
              "rounded-md p-1.5 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10",
              settingsOpen ? "text-foreground" : "text-muted-foreground"
            )}
            aria-expanded={settingsOpen}
            aria-label="GitHub account settings"
            title="Account & token"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-40 dark:hover:bg-white/10"
            aria-label="Refresh GitHub activity"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
          {menu}
        </>
      }
    >
      {settingsOpen && (
        <GithubAccountSettings
          config={config}
          onSave={(next) => {
            setConfig(next);
            setSettingsOpen(false);
            void refresh(next);
          }}
          onCancel={() => setSettingsOpen(false)}
        />
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {error}
            {cache ? " Showing cached data." : ""}
          </span>
        </div>
      )}

      {hasToken ? (
        <Collapsible open={contribOpen} onOpenChange={setContribOpen} className="mb-3">
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-black/6 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-black/[0.03] dark:border-white/8 dark:hover:bg-white/[0.04]">
            <span>Contributions</span>
            {contrib ? (
              <span className="font-normal text-muted-foreground">
                {contrib.totalContributions} last year
              </span>
            ) : contribLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : null}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {contribLoading && !contrib ? (
              <p className="py-3 text-center text-xs text-muted-foreground">Loading graph…</p>
            ) : contrib ? (
              <ContributionHeatmap calendar={contrib} />
            ) : (
              <p className="py-2 text-xs text-muted-foreground">Could not load contribution graph.</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-0.5" role="group" aria-label="Filter by type">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20",
                filter === f.id
                  ? "bg-foreground/[0.06] font-medium text-foreground dark:bg-white/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={org}
            onValueChange={(v) => {
              setOrg(v);
              setRepo("all");
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[7.5rem] border-black/8 bg-transparent text-xs shadow-none dark:border-white/10">
              <SelectValue placeholder="Org" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(20rem,var(--radix-select-content-available-height))]">
              <SelectItem value="all">All orgs</SelectItem>
              {orgs.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={repo} onValueChange={setRepo}>
            <SelectTrigger className="h-8 w-auto min-w-[9rem] max-w-[14rem] border-black/8 bg-transparent text-xs shadow-none dark:border-white/10">
              <SelectValue placeholder="Repo" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(20rem,var(--radix-select-content-available-height))]">
              <SelectItem value="all">{org === "all" ? "All repos" : "All in org"}</SelectItem>
              {repos.map((r) => (
                <SelectItem key={r} value={r}>
                  {org === "all" ? r : r.split("/")[1] || r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/*
        Fixed viewport height via inline style — Tailwind arbitrary values with commas
        (min()) are unreliable here, which previously left the list unscrollable.
      */}
      <div
        className="shrink-0 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]"
        style={{ height: "36rem", maxHeight: "min(36rem, calc(100vh - 16rem))" }}
        onWheel={(e) => e.stopPropagation()}
      >
        {loading && !cache ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : feed.length === 0 ? (
          <ModuleEmpty
            icon={
              filter === "pr"
                ? GitPullRequest
                : filter === "issue"
                  ? CircleDot
                  : filter === "action"
                    ? Workflow
                    : filter === "notification"
                      ? Bell
                      : Github
            }
            title={
              cache
                ? filter === "action" && !hasToken
                  ? "Token needed for Actions"
                  : "Nothing here"
                : "No activity yet"
            }
            hint={
              cache
                ? filter === "action" && !hasToken
                  ? "Add a personal access token with the key icon in the header."
                  : "Try another filter, org, or repo."
                : "Hit refresh to load PRs, issues, and more."
            }
          />
        ) : (
          <ul className="flex flex-col gap-0.5 pb-1">
            {feed.map((item) => (
              <FeedRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </div>
      {feed.length > 12 ? (
        <p className="mt-1.5 shrink-0 text-[10px] text-muted-foreground/50">
          {feed.length} items · scroll inside this list
        </p>
      ) : null}
    </Panel>
  );
}

function actionIcon(state: string) {
  if (isActionRunning(state)) return { Icon: Play, className: "text-amber-600 dark:text-amber-400" };
  if (state === "success") return { Icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" };
  if (state === "failure" || state === "timed_out")
    return { Icon: CircleX, className: "text-red-600 dark:text-red-400" };
  if (state === "cancelled" || state === "skipped")
    return { Icon: MinusCircle, className: "text-muted-foreground/60" };
  return { Icon: Workflow, className: "text-muted-foreground/70" };
}

const feedRowClass =
  "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 dark:hover:bg-white/[0.06]";

function FeedRow({ item }: { item: GithubItem }) {
  if (item.kind === "action") {
    const { Icon, className } = actionIcon(item.state);
    const running = isActionRunning(item.state);
    return (
      <li>
        <a {...fastLinkProps(item.url, { newTab: true })} className={feedRowClass}>
          <Icon className={cn("h-3.5 w-3.5 shrink-0", className, running && "animate-pulse")} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-foreground">{item.title}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {item.repo}
              {item.detail ? ` · ${item.detail}` : ""}
              {` · ${item.state.replace(/_/g, " ")}`}
            </span>
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">
            {running ? "now" : relativeTime(Date.parse(item.updatedAt))}
          </span>
        </a>
      </li>
    );
  }

  const Icon = item.kind === "pr" ? GitPullRequest : item.kind === "issue" ? CircleDot : Bell;

  return (
    <li>
      <a {...fastLinkProps(item.url, { newTab: true })} className={feedRowClass}>
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{item.title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {item.repo}
            {item.number != null && ` #${item.number}`}
            {item.kind === "notification" && ` · ${item.state.replace(/_/g, " ")}`}
          </span>
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">
          {relativeTime(Date.parse(item.updatedAt))}
        </span>
      </a>
    </li>
  );
}

function ContributionHeatmap({ calendar }: { calendar: ContributionCalendar }) {
  const cell = 10;
  const gap = 2;
  const weeks = calendar.weeks.length;
  const height = 7 * cell + 6 * gap;
  const width = weeks * cell + (weeks - 1) * gap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-md text-emerald-600/70 dark:text-emerald-500/70"
      role="img"
      aria-label={`${calendar.totalContributions} contributions in the last year`}
    >
      {calendar.weeks.map((week, wi) =>
        week.map((day, di) => (
          <rect
            key={day.date}
            x={wi * (cell + gap)}
            y={di * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill={day.count > 0 ? day.color : "currentColor"}
            opacity={day.count > 0 ? 1 : 0.12}
          >
            <title>{`${day.date}: ${day.count} contributions`}</title>
          </rect>
        ))
      )}
    </svg>
  );
}

function GithubInlineSetup({ onSave }: { onSave: (config: GithubConfig) => void }) {
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");

  return (
    <form
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-2"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = username.trim();
        if (trimmed) onSave({ username: trimmed, token: token.trim() });
      }}
    >
      <div className="flex max-w-sm flex-col items-center gap-1.5 text-center">
        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-ac/10 text-ac">
          <Github className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-foreground">Connect GitHub</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Username loads public PRs and issues. A token unlocks Actions and notifications.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          autoFocus
          aria-label="GitHub username"
          className="h-9"
        />
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Personal access token (optional)"
          aria-label="GitHub personal access token"
          className="h-9"
        />
        <Button type="submit" size="sm" className="h-9" disabled={!username.trim()}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> Connect
        </Button>
      </div>
    </form>
  );
}

function GithubAccountSettings({
  config,
  onSave,
  onCancel,
}: {
  config: GithubConfig;
  onSave: (config: GithubConfig) => void;
  onCancel: () => void;
}) {
  const [username, setUsername] = useState(config.username);
  const [token, setToken] = useState(config.token);

  return (
    <form
      className="mb-3 flex flex-col gap-3 rounded-md border border-black/8 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmedUser = username.trim();
        if (!trimmedUser) return;
        onSave({ username: trimmedUser, token: token.trim() });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gh-settings-user" className="text-xs">
          Username
        </Label>
        <Input
          id="gh-settings-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-9"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gh-settings-token" className="text-xs">
          Personal access token
        </Label>
        <Input
          id="gh-settings-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_… or fine-grained token"
          className="h-9"
          autoFocus
        />
        <p className="text-[11px] text-muted-foreground">
          Needs repo + Actions read (and notifications if you want those). Stored only in this browser.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!username.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}
