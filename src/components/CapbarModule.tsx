import { useEffect, useState } from "react";
import { Flame, Loader2, Sparkles } from "lucide-react";
import {
  countVisitDayStreak,
  hasPermission,
  isExtension,
} from "@/lib/chrome";
import {
  CAPBAR_GLANCE_URL,
  fetchCapbarGlance,
  isCapbarGlanceStale,
  readCachedCapbarGlance,
  type CapbarGlance,
} from "@/lib/capbar-glance";
import { touchOpenStreak, type OpenStreak } from "@/lib/open-streak";
import { cn } from "@/lib/utils";
import { ModuleEmpty } from "./ModuleEmpty";

export type CapbarData = Record<string, never>;

interface CapbarModuleProps {
  data: CapbarData;
  onChange: (next: CapbarData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

const WORK_HOSTS = ["cursor.com", "cursor.sh", "anthropic.com", "claude.ai", "openai.com"];

type ConnState = "checking" | "online" | "offline";

export function CapbarModule({ leading, menu, className }: CapbarModuleProps) {
  const [glance, setGlance] = useState<CapbarGlance>(() => readCachedCapbarGlance());
  const [conn, setConn] = useState<ConnState>("checking");
  const [streak, setStreak] = useState<OpenStreak | null>(null);
  const [workStreak, setWorkStreak] = useState<number | null>(null);

  useEffect(() => {
    setStreak(touchOpenStreak());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pull(force = false) {
      if (!cancelled && force) setConn("checking");
      const result = await fetchCapbarGlance({ force });
      if (cancelled) return;
      if (result.ok) {
        setGlance(result.glance);
        setConn("online");
      } else {
        setGlance(readCachedCapbarGlance());
        setConn("offline");
      }
    }

    void pull(true);

    const onVis = () => {
      if (document.visibilityState === "visible") void pull(false);
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(() => void pull(false), 60_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!isExtension()) return;
    let cancelled = false;
    void (async () => {
      const ok = await hasPermission("history");
      if (!ok || cancelled) return;
      try {
        const n = await countVisitDayStreak(WORK_HOSTS);
        if (!cancelled) setWorkStreak(n > 0 ? n : null);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasGlance = glance.lines.length > 0;
  const stale = isCapbarGlanceStale(glance);

  return (
    <section
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-[rgba(92,64,48,0.12)] bg-[rgba(245,240,232,0.62)] px-2 py-1.5 backdrop-blur-md dark:border-[rgba(255,236,214,0.1)] dark:bg-[rgba(24,18,14,0.48)]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {leading}
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Capbar</span>
        {conn === "checking" ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="Checking Capbar" />
        ) : conn === "online" ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">Live</span>
        ) : hasGlance ? (
          <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:bg-white/8">
            Cached{stale ? " · stale" : ""}
          </span>
        ) : null}
        <div className="min-w-0 flex-1" />
        {menu}
      </div>

      {hasGlance ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5">
          {glance.lines.map((line, i) => (
            <span key={`${line.label}-${i}`} className="inline-flex items-baseline gap-1.5 text-[11px]">
              <span className="font-medium text-foreground/90">{line.label}</span>
              <span className="text-muted-foreground">{line.detail}</span>
            </span>
          ))}
        </div>
      ) : conn === "checking" ? (
        <p className="px-0.5 py-1 text-[11px] text-muted-foreground">Looking for Capbar on loopback…</p>
      ) : (
        <ModuleEmpty
          icon={Sparkles}
          title="Capbar not connected"
          hint={`Start Capbar — CapTab reads ${CAPBAR_GLANCE_URL} (local only).`}
          className="py-2"
        />
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-black/5 px-0.5 pt-1 dark:border-white/8">
        {streak && streak.days > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Flame className="h-3 w-3 text-ac" aria-hidden />
            CapTab · {streak.days} day{streak.days === 1 ? "" : "s"} straight
          </span>
        ) : null}
        {workStreak != null && workStreak > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Flame className="h-3 w-3 text-muted-foreground" aria-hidden />
            Deep work hosts · {workStreak} day{workStreak === 1 ? "" : "s"}
          </span>
        ) : null}
        {(!streak || streak.days === 0) && workStreak == null ? (
          <span className="text-[11px] text-muted-foreground">Streaks build as you return.</span>
        ) : null}
      </div>
    </section>
  );
}
