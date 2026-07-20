import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Shield, ShieldOff, Square, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hasPermission, isExtension, requestPermission } from "@/lib/chrome";
import {
  DEFAULT_BLOCK_HOSTS,
  writeFocusBlockState,
  type FocusBlockState,
} from "@/lib/focus-block";
import { cn } from "@/lib/utils";

export interface FocusData {
  text: string;
  blocking: boolean;
  hosts: string[];
  sessionEndsAt: number | null;
  sessionActive: boolean;
}

export function defaultFocusData(): FocusData {
  return {
    text: "",
    blocking: false,
    hosts: [],
    sessionEndsAt: null,
    sessionActive: false,
  };
}

/** Migrate legacy `{ text }` payloads and partial saves. */
export function normalizeFocusData(raw: unknown): FocusData {
  if (!raw || typeof raw !== "object") return defaultFocusData();
  const record = raw as Partial<FocusData>;
  return {
    text: typeof record.text === "string" ? record.text : "",
    blocking: Boolean(record.blocking),
    hosts: Array.isArray(record.hosts)
      ? record.hosts.filter((h): h is string => typeof h === "string")
      : [],
    sessionEndsAt: typeof record.sessionEndsAt === "number" ? record.sessionEndsAt : null,
    sessionActive: Boolean(record.sessionActive),
  };
}

interface FocusModuleProps {
  data: FocusData;
  onChange: (next: FocusData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

function effectiveHosts(data: FocusData): string[] {
  return data.hosts.length > 0 ? data.hosts : DEFAULT_BLOCK_HOSTS;
}

function hostsInputValue(hosts: string[]): string {
  return hosts.length > 0 ? hosts.join(", ") : DEFAULT_BLOCK_HOSTS.join(", ");
}

function parseHostsInput(value: string): string[] {
  return [...new Set(value.split(/[,;\s]+/).map((h) => h.trim().toLowerCase()).filter(Boolean))];
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function toBlockState(data: FocusData): FocusBlockState {
  return {
    active: true,
    endsAt: data.sessionEndsAt,
    hosts: effectiveHosts(data),
    focusText: data.text.trim(),
  };
}

/** Single-row focus strip — intentionally smaller than card modules. */
export function FocusModule({ data, onChange, leading, menu, className }: FocusModuleProps) {
  const extension = isExtension();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tabsAllowed, setTabsAllowed] = useState<boolean | null>(extension ? null : false);
  const [requestingTabs, setRequestingTabs] = useState(false);
  const [hostsDraft, setHostsDraft] = useState(() => hostsInputValue(data.hosts));
  const [now, setNow] = useState(() => Date.now());
  const dataRef = useRef(data);
  dataRef.current = data;

  const hasFocus = data.text.trim().length > 0;
  const sessionExpired =
    data.sessionActive && data.sessionEndsAt != null && data.sessionEndsAt <= now;

  useEffect(() => {
    if (!extension) {
      setTabsAllowed(false);
      return;
    }
    void hasPermission("tabs").then(setTabsAllowed);
  }, [extension]);

  const syncBlockState = useCallback(async (next: FocusData) => {
    if (next.sessionActive) {
      await writeFocusBlockState(toBlockState(next));
    } else {
      await writeFocusBlockState({
        active: false,
        endsAt: null,
        hosts: [],
        focusText: "",
      });
    }
  }, []);

  const patch = useCallback(
    (partial: Partial<FocusData>, sync = false) => {
      onChange({ ...dataRef.current, ...partial });
      if (sync) {
        void syncBlockState({ ...dataRef.current, ...partial });
      }
    },
    [onChange, syncBlockState]
  );

  useEffect(() => {
    if (!data.sessionActive) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [data.sessionActive]);

  useEffect(() => {
    if (!data.sessionActive || data.sessionEndsAt == null) return;
    if (data.sessionEndsAt > Date.now()) return;
    patch({ sessionActive: false, sessionEndsAt: null }, true);
  }, [data.sessionActive, data.sessionEndsAt, now, patch]);

  useEffect(() => {
    if (!data.sessionActive) return;
    void syncBlockState(data);
  }, [data.text, data.hosts, data.sessionActive, data.sessionEndsAt, syncBlockState, data]);

  async function enableBlocking() {
    if (!extension) {
      patch({ blocking: true, hosts: data.hosts.length ? data.hosts : [...DEFAULT_BLOCK_HOSTS] });
      setHostsDraft(hostsInputValue(data.hosts.length ? data.hosts : DEFAULT_BLOCK_HOSTS));
      return;
    }
    setRequestingTabs(true);
    try {
      const allowed = tabsAllowed === true ? true : await requestPermission("tabs");
      setTabsAllowed(allowed);
      if (!allowed) return;
      const hosts = data.hosts.length ? data.hosts : [...DEFAULT_BLOCK_HOSTS];
      setHostsDraft(hostsInputValue(hosts));
      patch({ blocking: true, hosts });
    } finally {
      setRequestingTabs(false);
    }
  }

  async function disableBlocking() {
    if (data.sessionActive) {
      patch({ blocking: false, sessionActive: false, sessionEndsAt: null }, true);
    } else {
      patch({ blocking: false });
    }
  }

  function startSession(minutes: number | null) {
    const endsAt = minutes == null ? null : Date.now() + minutes * 60_000;
    patch({ sessionActive: true, sessionEndsAt: endsAt }, true);
    setPopoverOpen(false);
  }

  function stopSession() {
    patch({ sessionActive: false, sessionEndsAt: null }, true);
  }

  function commitHosts() {
    const parsed = parseHostsInput(hostsDraft);
    const next = parsed.length > 0 ? parsed : [...DEFAULT_BLOCK_HOSTS];
    setHostsDraft(hostsInputValue(next));
    patch({ hosts: next }, data.sessionActive);
  }

  const remainingMs =
    data.sessionActive && data.sessionEndsAt != null ? data.sessionEndsAt - now : null;

  return (
    <section
      className={cn(
        "flex items-center gap-2 rounded-xl border border-[rgba(92,64,48,0.12)] bg-[rgba(245,240,232,0.62)] px-2 py-1.5 backdrop-blur-md dark:border-[rgba(255,236,214,0.1)] dark:bg-[rgba(24,18,14,0.48)]",
        className
      )}
    >
      {leading}
      <Crosshair className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Focus</span>
      <Input
        value={data.text}
        onChange={(e) => patch({ text: e.target.value })}
        placeholder="What are you working on?"
        maxLength={160}
        className={cn(
          "h-8 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none placeholder:font-normal placeholder:text-muted-foreground/50 focus-visible:ring-0 dark:bg-transparent",
          hasFocus ? "text-foreground" : "text-foreground/80"
        )}
        aria-label="Current focus"
      />

      {data.sessionActive && !sessionExpired ? (
        <>
          <span
            className="shrink-0 rounded-md bg-[rgba(139,94,60,0.12)] px-2 py-0.5 font-mono text-xs tabular-nums text-[#8b5e3c] dark:text-[#c49a72]"
            aria-live="polite"
          >
            {remainingMs != null ? formatRemaining(remainingMs) : "Open"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={stopSession}
            aria-label="Stop focus session"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        </>
      ) : null}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0",
              data.blocking || data.sessionActive
                ? "text-[#8b5e3c] dark:text-[#c49a72]"
                : "text-muted-foreground/60 hover:text-foreground"
            )}
            aria-label="Focus blocking settings"
          >
            {data.blocking || data.sessionActive ? (
              <Shield className="h-3.5 w-3.5" />
            ) : (
              <ShieldOff className="h-3.5 w-3.5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3 p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="focus-block-toggle" className="text-sm font-medium">
              Block sites
            </Label>
            <Switch
              id="focus-block-toggle"
              checked={data.blocking}
              disabled={requestingTabs}
              onCheckedChange={(checked) => {
                if (checked) void enableBlocking();
                else void disableBlocking();
              }}
            />
          </div>

          {data.blocking ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="focus-block-hosts" className="text-xs text-muted-foreground">
                  Blocked hosts
                </Label>
                <Input
                  id="focus-block-hosts"
                  value={hostsDraft}
                  onChange={(e) => setHostsDraft(e.target.value)}
                  onBlur={commitHosts}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitHosts();
                    }
                  }}
                  placeholder="twitter.com, reddit.com"
                  className="h-8 text-xs"
                />
              </div>

              {!data.sessionActive ? (
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 flex-1 text-xs"
                    onClick={() => startSession(25)}
                  >
                    Start 25m
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 flex-1 text-xs"
                    onClick={() => startSession(50)}
                  >
                    Start 50m
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 w-full text-xs"
                    onClick={() => startSession(null)}
                  >
                    Until I stop
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Session active
                  {remainingMs != null ? ` · ${formatRemaining(remainingMs)} left` : " · until you stop"}
                </p>
              )}

              {extension && tabsAllowed === false ? (
                <p className="text-xs text-muted-foreground">
                  Site blocking needs the Tabs permission to redirect distracting pages.
                </p>
              ) : null}
            </>
          ) : null}
        </PopoverContent>
      </Popover>

      {hasFocus ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:text-foreground"
          onClick={() => patch({ text: "" })}
          aria-label="Clear focus"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {menu}
    </section>
  );
}
