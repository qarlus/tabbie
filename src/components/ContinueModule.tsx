import { useCallback, useEffect, useState } from "react";
import { History, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFrequentHistory,
  getRecentHistory,
  getRecentlyClosed,
  hasPermission,
  isExtension,
  requestPermission,
  type ClosedEntry,
  type HistoryEntry,
} from "@/lib/chrome";
import { fastLinkProps } from "@/lib/fast-link";
import { cn } from "@/lib/utils";
import { ModuleEmpty } from "./ModuleEmpty";
import { SiteIcon } from "./SiteIcon";

export type ContinueTab = "recent" | "closed" | "frequent";

export interface ContinueData {
  tab: ContinueTab;
}

interface ContinueModuleProps {
  data: ContinueData;
  onChange: (next: ContinueData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

type Row = { id: string; url: string; title: string };

const TABS: { id: ContinueTab; label: string; needs: "history" | "sessions" }[] = [
  { id: "recent", label: "Recent", needs: "history" },
  { id: "closed", label: "Closed", needs: "sessions" },
  { id: "frequent", label: "Frequent", needs: "history" },
];

export function ContinueModule({ data, onChange, leading, menu, className }: ContinueModuleProps) {
  const extension = isExtension();
  const tab = data.tab ?? "recent";
  const [historyOk, setHistoryOk] = useState<boolean | null>(extension ? null : false);
  const [sessionsOk, setSessionsOk] = useState<boolean | null>(extension ? null : false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!extension) {
      setHistoryOk(false);
      setSessionsOk(false);
      return;
    }
    void hasPermission("history").then(setHistoryOk);
    void hasPermission("sessions").then(setSessionsOk);
  }, [extension]);

  const need = TABS.find((t) => t.id === tab)?.needs ?? "history";
  const allowed = need === "history" ? historyOk : sessionsOk;

  const load = useCallback(async () => {
    if (!extension || allowed !== true) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "recent") {
        const items = await getRecentHistory(18);
        setRows(items.map(toRow));
      } else if (tab === "frequent") {
        const items = await getFrequentHistory(18);
        setRows(items.map(toRow));
      } else {
        const items = await getRecentlyClosed(18);
        setRows(items.map(closedToRow));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [extension, allowed, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function grant() {
    setRequesting(true);
    try {
      const ok = await requestPermission(need === "history" ? "history" : "sessions");
      if (need === "history") setHistoryOk(ok);
      else setSessionsOk(ok);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-[rgba(92,64,48,0.12)] bg-[rgba(245,240,232,0.62)] px-2 py-1.5 backdrop-blur-md dark:border-[rgba(255,236,214,0.1)] dark:bg-[rgba(24,18,14,0.48)]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {leading}
        <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">Continue</span>
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ tab: t.id })}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                tab === t.id
                  ? "bg-ac/15 font-medium text-ac"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {menu}
      </div>

      {!extension ? (
        <p className="px-1 py-2 text-[11px] text-muted-foreground">
          Install CapTab as an extension to continue where you left off.
        </p>
      ) : allowed === null ? (
        <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Checking access…
        </div>
      ) : allowed === false ? (
        <div className="flex items-center gap-2 px-1 py-1.5">
          <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
            {need === "history"
              ? "Allow history to show recent and frequent sites."
              : "Allow sessions to show recently closed tabs."}
          </p>
          <Button type="button" size="sm" className="h-7 shrink-0" disabled={requesting} onClick={() => void grant()}>
            {requesting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Shield className="mr-1 h-3 w-3" />}
            Allow
          </Button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="px-1 py-2 text-[11px] text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <ModuleEmpty
          icon={History}
          title="Nothing here yet"
          hint="Browse a bit, then come back — CapTab keeps this local."
          className="py-3"
        />
      ) : (
        <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-0.5">
          {rows.map((row) => (
            <a
              key={row.id}
              {...fastLinkProps(row.url)}
              title={row.title}
              className="flex max-w-[9.5rem] shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
            >
              <SiteIcon url={row.url} name={row.title} size={14} className="shrink-0" />
              <span className="truncate text-[11px] font-medium text-foreground/90">{row.title}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function toRow(item: HistoryEntry): Row {
  return { id: item.id, url: item.url, title: item.title };
}

function closedToRow(item: ClosedEntry): Row {
  return { id: item.id, url: item.url, title: item.title };
}
