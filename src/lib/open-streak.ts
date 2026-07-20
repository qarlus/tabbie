import { readKey, writeKey } from "@/lib/storage";

export type OpenStreak = {
  /** Consecutive local calendar days CapTab was opened, ending on lastOpenDay. */
  days: number;
  /** YYYY-MM-DD local */
  lastOpenDay: string | null;
};

export const EMPTY_OPEN_STREAK: OpenStreak = { days: 0, lastOpenDay: null };

function localDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayKey(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - 1);
  return localDayKey(d);
}

/** Record today's CapTab open and return the updated streak. */
export function touchOpenStreak(): OpenStreak {
  const prev = readKey<OpenStreak>("open-streak", EMPTY_OPEN_STREAK);
  const today = localDayKey();
  if (prev.lastOpenDay === today) return prev;

  let days = 1;
  if (prev.lastOpenDay === yesterdayKey()) {
    days = Math.max(1, (prev.days || 0) + 1);
  }

  const next: OpenStreak = { days, lastOpenDay: today };
  writeKey("open-streak", next);
  return next;
}

export function readOpenStreak(): OpenStreak {
  return readKey<OpenStreak>("open-streak", EMPTY_OPEN_STREAK);
}
