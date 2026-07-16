import { useEffect, useRef, useState } from "react";
import { CalendarDays, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchCalendar,
  formatEventWhen,
  normalizeCalendarUrl,
  type CalendarEvent,
  IcsError,
} from "@/lib/ics";
import { isValidUrl } from "@/lib/search";
import { fastLinkProps } from "@/lib/fast-link";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";

export interface AgendaData {
  url: string;
  cache: {
    fetchedAt: number;
    events: CalendarEvent[];
  } | null;
}

interface AgendaModuleProps {
  data: AgendaData;
  onChange: (next: AgendaData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

const MAX_EVENTS = 8;
const AGENDA_FRESH_MS = 5 * 60 * 1000;

export function AgendaModule({ data, onChange, leading, menu, className }: AgendaModuleProps) {
  const dataRef = useRef(data);
  dataRef.current = data;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [draftUrl, setDraftUrl] = useState(data.url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCalendar(url: string, opts?: { force?: boolean; silent?: boolean }) {
    const normalized = normalizeCalendarUrl(url);
    if (!isValidUrl(normalized)) {
      setError("Enter a valid https:// or webcal:// calendar URL");
      return;
    }
    if (
      !opts?.force &&
      dataRef.current.cache &&
      dataRef.current.url === normalized &&
      Date.now() - dataRef.current.cache.fetchedAt < AGENDA_FRESH_MS
    ) {
      return;
    }
    if (!opts?.silent) setLoading(true);
    setError("");
    try {
      const events = await fetchCalendar(normalized);
      onChangeRef.current({
        url: normalized,
        cache: { fetchedAt: Date.now(), events: events.slice(0, 40) },
      });
    } catch (err) {
      const message =
        err instanceof IcsError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load calendar";
      setError(message);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!data.url) return;
    void loadCalendar(data.url, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.url]);

  const events = (data.cache?.events ?? [])
    .filter((e) => (e.endAt ?? e.startAt) >= Date.now() - 30 * 60 * 1000)
    .slice(0, MAX_EVENTS);

  const configured = Boolean(data.url);

  return (
    <Panel
      title="Agenda"
      icon={<CalendarDays className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        events.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">
            {events.length}
          </span>
        ) : null
      }
      actions={
        <>
          {configured ? (
            <button
              type="button"
              onClick={() => void loadCalendar(data.url, { force: true })}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/10"
              aria-label="Refresh agenda"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          ) : null}
          {menu}
        </>
      }
    >
      {!configured ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <ModuleEmpty
            icon={CalendarDays}
            title="Connect a calendar"
            hint="Paste a private ICS link (Google Calendar → Settings → Integrate calendar). Stays on this device."
            className="py-4"
          />
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void loadCalendar(draftUrl, { force: true });
            }}
          >
            <Label htmlFor="agenda-url" className="sr-only">
              Calendar URL
            </Label>
            <Input
              id="agenda-url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://… or webcal://…"
              className="h-9 border-black/8 bg-black/[0.03] text-sm dark:border-white/10 dark:bg-white/[0.04]"
            />
            <Button type="submit" size="sm" disabled={loading || !draftUrl.trim()}>
              {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save calendar
            </Button>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </form>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {loading && events.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : events.length === 0 ? (
              <ModuleEmpty
                icon={CalendarDays}
                title="Nothing upcoming"
                hint="No events in the next few weeks — or the feed only has past items."
                className="py-6"
              />
            ) : (
              <ul className="flex flex-col gap-0.5">
                {events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-black/6 pt-2 dark:border-white/8">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                onChange({ url: "", cache: null });
                setDraftUrl("");
                setError("");
              }}
            >
              Change calendar
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const { day, time } = formatEventWhen(event);
  const inner = (
    <>
      <span className="w-16 shrink-0 pt-0.5">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {day}
        </span>
        <span className="block text-[11px] tabular-nums text-muted-foreground/80">{time}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{event.title}</span>
        {event.location ? (
          <span className="block truncate text-[11px] text-muted-foreground">{event.location}</span>
        ) : null}
      </span>
      {event.url ? (
        <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      ) : null}
    </>
  );

  if (event.url) {
    return (
      <li>
        <a
          {...fastLinkProps(event.url)}
          className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        >
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-start gap-2.5 rounded-lg px-2 py-2">{inner}</div>
    </li>
  );
}
