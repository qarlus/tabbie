export interface WorldClockCity {
  id: string;
  city: string;
  /** Short label for the TopBar (e.g. NYC). */
  label: string;
  /** IANA timezone id. */
  timeZone: string;
}

/** Curated major-city catalog for world clocks. */
export const WORLD_CLOCK_CITIES: WorldClockCity[] = [
  { id: "new-york", city: "New York", label: "NYC", timeZone: "America/New_York" },
  { id: "los-angeles", city: "Los Angeles", label: "LA", timeZone: "America/Los_Angeles" },
  { id: "chicago", city: "Chicago", label: "CHI", timeZone: "America/Chicago" },
  { id: "toronto", city: "Toronto", label: "YYZ", timeZone: "America/Toronto" },
  { id: "sao-paulo", city: "São Paulo", label: "SAO", timeZone: "America/Sao_Paulo" },
  { id: "london", city: "London", label: "LON", timeZone: "Europe/London" },
  { id: "paris", city: "Paris", label: "PAR", timeZone: "Europe/Paris" },
  { id: "berlin", city: "Berlin", label: "BER", timeZone: "Europe/Berlin" },
  { id: "dubai", city: "Dubai", label: "DXB", timeZone: "Asia/Dubai" },
  { id: "mumbai", city: "Mumbai", label: "BOM", timeZone: "Asia/Kolkata" },
  { id: "singapore", city: "Singapore", label: "SIN", timeZone: "Asia/Singapore" },
  { id: "hong-kong", city: "Hong Kong", label: "HKG", timeZone: "Asia/Hong_Kong" },
  { id: "tokyo", city: "Tokyo", label: "TYO", timeZone: "Asia/Tokyo" },
  { id: "sydney", city: "Sydney", label: "SYD", timeZone: "Australia/Sydney" },
  { id: "utc", city: "UTC", label: "UTC", timeZone: "UTC" },
];

const byId = new Map(WORLD_CLOCK_CITIES.map((c) => [c.id, c]));

export function worldClockById(id: string): WorldClockCity | undefined {
  return byId.get(id);
}

/** Resolve selected ids to catalog entries, dropping unknowns and preserving order. */
export function resolveWorldClocks(ids: string[]): WorldClockCity[] {
  const seen = new Set<string>();
  const out: WorldClockCity[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const city = byId.get(id);
    if (!city) continue;
    seen.add(id);
    out.push(city);
  }
  return out;
}

export function isWorldClockId(id: string): boolean {
  return byId.has(id);
}

/** Format a time in an optional IANA zone. Omit timeZone for local PC time. */
export function formatClock(date: Date, clock24: boolean, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: clock24 ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !clock24,
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

/** Calendar day key (yyyy-mm-dd) in a zone — used for ±day badges. */
export function dayKey(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

/**
 * Day offset vs local calendar day: -1 yesterday, 0 same day, +1 tomorrow.
 * Used when a world clock has already rolled into the next/previous date.
 */
export function dayOffsetVsLocal(date: Date, timeZone: string): -1 | 0 | 1 {
  const local = dayKey(date);
  const remote = dayKey(date, timeZone);
  if (remote === local) return 0;
  // Compare as ISO dates (en-CA → yyyy-mm-dd)
  return remote > local ? 1 : -1;
}
