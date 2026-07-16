/** Minimal ICS (iCalendar) parser for upcoming events — no dependencies. */

export interface CalendarEvent {
  id: string;
  title: string;
  startAt: number;
  endAt: number | null;
  allDay: boolean;
  location?: string;
  url?: string;
}

export class IcsError extends Error {
  kind: "cors" | "http" | "parse" | "offline";
  constructor(kind: IcsError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

/** Normalize webcal:// and trim. */
export function normalizeCalendarUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^webcal:\/\//i.test(trimmed)) {
    return trimmed.replace(/^webcal:\/\//i, "https://");
  }
  return trimmed;
}

function unfold(ics: string): string {
  return ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

type PropMap = Record<string, { params: string; value: string }>;

function parseProps(block: string): PropMap {
  const props: PropMap = {};
  for (const line of block.split("\n")) {
    if (!line || line.startsWith("BEGIN:") || line.startsWith("END:")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const semi = left.indexOf(";");
    const name = (semi >= 0 ? left.slice(0, semi) : left).toUpperCase();
    const params = semi >= 0 ? left.slice(semi + 1) : "";
    // Keep first occurrence (DTSTART etc.)
    if (!props[name]) props[name] = { params, value };
  }
  return props;
}

function hasParam(params: string, key: string, expect?: string): boolean {
  const parts = params.split(";");
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k?.toUpperCase() === key.toUpperCase()) {
      if (expect == null) return true;
      return (v ?? "").toUpperCase() === expect.toUpperCase();
    }
  }
  return false;
}

function parseIcsDate(value: string, params: string): { at: number; allDay: boolean } | null {
  const raw = value.trim();
  const allDay = hasParam(params, "VALUE", "DATE") || /^\d{8}$/.test(raw);

  if (allDay) {
    const m = raw.slice(0, 8).match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) return null;
    const at = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0).getTime();
    return { at, allDay: true };
  }

  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/i);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6]);
  const at = m[7]
    ? Date.UTC(y, mo, d, h, mi, s)
    : new Date(y, mo, d, h, mi, s).getTime();
  return { at, allDay: false };
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

function parseByDay(rule: Record<string, string>): number[] | null {
  const raw = rule.BYDAY;
  if (!raw) return null;
  const map: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const days: number[] = [];
  for (const part of raw.split(",")) {
    const code = part.replace(/^-?\d+/, "").toUpperCase();
    if (code in map) days.push(map[code]!);
  }
  return days.length ? days : null;
}

function parseRrule(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.toUpperCase()] = v;
  }
  return out;
}

/** Expand a single VEVENT into occurrences within [windowStart, windowEnd]. */
function expandEvent(
  props: PropMap,
  windowStart: number,
  windowEnd: number
): CalendarEvent[] {
  const startProp = props.DTSTART;
  if (!startProp) return [];
  const start = parseIcsDate(startProp.value, startProp.params);
  if (!start) return [];

  const endProp = props.DTEND;
  const durationMs = endProp
    ? (() => {
        const end = parseIcsDate(endProp.value, endProp.params);
        return end ? end.at - start.at : start.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
      })()
    : start.allDay
      ? 24 * 60 * 60 * 1000
      : 60 * 60 * 1000;

  const title = unescapeText(props.SUMMARY?.value ?? "Event");
  const location = props.LOCATION ? unescapeText(props.LOCATION.value) : undefined;
  const url = props.URL?.value?.trim() || undefined;
  const uid = props.UID?.value ?? `${title}|${startProp.value}`;

  const rruleRaw = props.RRULE?.value;
  const starts: number[] = [];

  if (!rruleRaw) {
    if (start.at + durationMs >= windowStart && start.at <= windowEnd) {
      starts.push(start.at);
    }
  } else {
    const rule = parseRrule(rruleRaw);
    const freq = (rule.FREQ ?? "").toUpperCase();
    const interval = Math.max(1, Number.parseInt(rule.INTERVAL ?? "1", 10) || 1);
    const count = rule.COUNT ? Number.parseInt(rule.COUNT, 10) : null;
    const until = rule.UNTIL
      ? parseIcsDate(rule.UNTIL, rule.UNTIL.length === 8 ? "VALUE=DATE" : "")?.at ?? null
      : null;
    const byday = parseByDay(rule);

    let emitted = 0;
    const maxIter = 400;

    if (freq === "DAILY") {
      let cursor = start.at;
      for (let i = 0; i < maxIter; i++) {
        if (until != null && cursor > until) break;
        if (count != null && emitted >= count) break;
        if (cursor > windowEnd) break;
        if (cursor + durationMs >= windowStart) starts.push(cursor);
        emitted++;
        cursor = addDays(cursor, interval);
      }
    } else if (freq === "WEEKLY") {
      const weekdays = byday ?? [new Date(start.at).getDay()];
      // Walk day-by-day from start date, honor interval in weeks from DTSTART week
      const startDay = new Date(start.at);
      startDay.setHours(0, 0, 0, 0);
      const origin = startDay.getTime();
      let day = origin;
      for (let i = 0; i < maxIter; i++) {
        if (until != null && day > until) break;
        if (day > windowEnd) break;
        const weeks = Math.floor((day - origin) / (7 * 24 * 60 * 60 * 1000));
        if (weeks % interval === 0 && weekdays.includes(new Date(day).getDay())) {
          const occ = new Date(day);
          if (!start.allDay) {
            const s = new Date(start.at);
            occ.setHours(s.getHours(), s.getMinutes(), s.getSeconds(), 0);
          }
          const at = occ.getTime();
          if (at >= start.at - 1000) {
            if (count != null && emitted >= count) break;
            if (at + durationMs >= windowStart && at <= windowEnd) starts.push(at);
            emitted++;
          }
        }
        day = addDays(day, 1);
      }
    } else {
      // Unsupported freq — show seed if in window
      if (start.at + durationMs >= windowStart && start.at <= windowEnd) {
        starts.push(start.at);
      }
    }
  }

  // EXDATE — drop exclusions
  const ex = props.EXDATE?.value;
  if (ex) {
    const banned = new Set(
      ex.split(",").map((part) => {
        const p = parseIcsDate(part.trim(), start.allDay ? "VALUE=DATE" : "");
        return p ? dayKey(p.at) + (start.allDay ? "" : `@${p.at}`) : "";
      })
    );
    return starts
      .filter((at) => {
        const key = start.allDay ? dayKey(at) : dayKey(at) + `@${at}`;
        // also try day-only ban
        return !banned.has(key) && !banned.has(dayKey(at));
      })
      .map((at) => ({
        id: `${uid}|${at}`,
        title,
        startAt: at,
        endAt: at + durationMs,
        allDay: start.allDay,
        location,
        url,
      }));
  }

  return starts.map((at) => ({
    id: `${uid}|${at}`,
    title,
    startAt: at,
    endAt: at + durationMs,
    allDay: start.allDay,
    location,
    url,
  }));
}

export function parseIcs(text: string, now = Date.now()): CalendarEvent[] {
  const body = unfold(text);
  if (!/BEGIN:VCALENDAR/i.test(body)) {
    throw new IcsError("parse", "That doesn’t look like an iCalendar (.ics) file.");
  }

  const windowStart = now - 2 * 60 * 60 * 1000; // include events that started recently
  const windowEnd = now + 21 * 24 * 60 * 60 * 1000;
  const events: CalendarEvent[] = [];

  const re = /BEGIN:VEVENT\n([\s\S]*?)END:VEVENT/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    const props = parseProps(match[1] ?? "");
    if (props.STATUS?.value?.toUpperCase() === "CANCELLED") continue;
    events.push(...expandEvent(props, windowStart, windowEnd));
  }

  events.sort((a, b) => a.startAt - b.startAt);
  // Dedupe by id
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return e.endAt == null || e.endAt >= now - 30 * 60 * 1000;
  });
}

export async function fetchCalendar(url: string): Promise<CalendarEvent[]> {
  const normalized = normalizeCalendarUrl(url);
  let res: Response;
  try {
    res = await fetch(normalized, { headers: { Accept: "text/calendar, text/plain, */*" } });
  } catch {
    if (!navigator.onLine) throw new IcsError("offline", "You’re offline.");
    throw new IcsError("cors", "Couldn’t fetch that calendar (blocked or unreachable).");
  }
  if (!res.ok) throw new IcsError("http", `Calendar returned ${res.status}.`);
  const text = await res.text();
  try {
    return parseIcs(text);
  } catch (err) {
    if (err instanceof IcsError) throw err;
    throw new IcsError("parse", "Couldn’t parse that calendar.");
  }
}

export function formatEventWhen(event: CalendarEvent, now = Date.now()): { day: string; time: string } {
  const start = new Date(event.startAt);
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  let day: string;
  if (sameDay(start, today)) day = "Today";
  else if (sameDay(start, tomorrow)) day = "Tomorrow";
  else {
    day = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(start);
  }

  if (event.allDay) return { day, time: "All day" };

  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);

  return { day, time };
}
