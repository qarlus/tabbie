import { useCallback, useEffect, useState } from "react";
import { CircleAlert, KeyRound, Loader2, RefreshCw, SquareKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStoredState } from "@/lib/storage";
import { fastLinkProps } from "@/lib/fast-link";
import { relativeTime } from "@/lib/github";
import { fetchLinear, LinearError, type LinearCache, type LinearConfig } from "@/lib/linear";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";

const PRIORITY_LABEL: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Med",
  4: "Low",
};

export function LinearPanel({
  className,
  leading,
  menu,
}: {
  className?: string;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  const [config, setConfig] = useStoredState<LinearConfig>("linear-config", { token: "" });
  const [cache, setCache] = useStoredState<LinearCache | null>("linear-cache", null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftToken, setDraftToken] = useState(config.token);

  const configured = config.token.trim().length > 0;

  const refresh = useCallback(
    async (override?: LinearConfig) => {
      const cfg = override ?? config;
      if (!cfg.token.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLinear(cfg);
        setCache(data);
      } catch (e) {
        if (e instanceof LinearError) setError(e.message);
        else setError("Something went wrong talking to Linear.");
      } finally {
        setLoading(false);
      }
    },
    [config, setCache]
  );

  useEffect(() => {
    if (!configured) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  useEffect(() => {
    setDraftToken(config.token);
  }, [config.token]);

  async function saveToken() {
    const next = { token: draftToken.trim() };
    setConfig(next);
    setSettingsOpen(false);
    if (next.token) await refresh(next);
    else setCache(null);
  }

  const issues = cache?.issues ?? [];

  return (
    <Panel
      title="Linear"
      icon={<SquareKanban className="h-3.5 w-3.5" />}
      leading={leading}
      className={cn("min-h-[22rem]", className)}
      badge={
        issues.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac normal-case tracking-normal">
            {issues.length} open
          </span>
        ) : null
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {settingsOpen ? "Done" : "Key"}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading || !configured}
            className="h-7 gap-1.5 px-2 text-xs"
            aria-label="Refresh Linear"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
          {menu}
        </>
      }
    >
      {settingsOpen && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-black/5 bg-black/[0.03] p-3 dark:border-white/5 dark:bg-white/[0.03]">
          <Label htmlFor="linear-token" className="text-[11px] text-muted-foreground">
            Personal API key
          </Label>
          <div className="flex gap-2">
            <Input
              id="linear-token"
              type="password"
              value={draftToken}
              onChange={(e) => setDraftToken(e.target.value)}
              placeholder="lin_api_…"
              className="h-8 text-xs"
              autoComplete="off"
            />
            <Button type="button" size="sm" className="h-8 shrink-0" onClick={() => void saveToken()}>
              Save
            </Button>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            Create a key in Linear → Settings → Account → Security & access. Stored only in this
            browser. Fetches issues assigned to you that aren’t done or canceled.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!configured ? (
          <ModuleEmpty
            icon={KeyRound}
            title="Connect Linear"
            hint="Paste a personal API key to see issues assigned to you."
            action={
              !settingsOpen ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Add key
                </Button>
              ) : null
            }
          />
        ) : loading && !cache ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading issues…
          </p>
        ) : issues.length === 0 ? (
          <ModuleEmpty
            icon={SquareKanban}
            title="Inbox clear"
            hint="No open issues assigned to you right now."
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {issues.map((issue) => (
              <li key={issue.id}>
                <a
                  {...fastLinkProps(issue.url, { newTab: true })}
                  className="group flex flex-col gap-0.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <span className="truncate text-sm text-foreground">{issue.title}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] text-foreground/70">{issue.identifier}</span>
                    <span className="opacity-40">·</span>
                    <span className="truncate">{issue.state}</span>
                    {PRIORITY_LABEL[issue.priority] ? (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="shrink-0">{PRIORITY_LABEL[issue.priority]}</span>
                      </>
                    ) : null}
                    {issue.updatedAt > 0 ? (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="shrink-0">{relativeTime(issue.updatedAt)}</span>
                      </>
                    ) : null}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
