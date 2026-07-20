import { readKey } from "@/lib/storage";
import type { LayoutState, ModuleDataMap } from "@/lib/modules/types";
import type { AgendaData } from "@/components/AgendaModule";
import type { ChecklistData } from "@/components/ChecklistModule";
import type { PomodoroData } from "@/components/PomodoroModule";
import type { FocusData } from "@/components/FocusModule";
import type { CalendarEvent } from "@/lib/ics";

export type TodaySnapshot = {
  nextEvent: CalendarEvent | null;
  topTask: { id: string; text: string } | null;
  timer: {
    mode: "focus" | "break";
    endsAt: number | null;
    remainingMs: number | null;
    focusMin: number;
    breakMin: number;
  } | null;
  focusText: string | null;
};

function firstPlacedData<T>(
  layout: LayoutState,
  data: ModuleDataMap,
  type: string
): T | null {
  const placed = layout.modules.find((m) => m.type === type);
  if (!placed) return null;
  const raw = data[placed.id];
  return (raw as T) ?? null;
}

/** Aggregate next event / top checklist / active timer from placed modules. */
export function readTodaySnapshot(now = Date.now()): TodaySnapshot {
  const layout = readKey<LayoutState>("layout", { modules: [] });
  const data = readKey<ModuleDataMap>("module-data", {});

  const agenda = firstPlacedData<AgendaData>(layout, data, "agenda");
  const events = agenda?.cache?.events ?? [];
  const nextEvent =
    events.find((e) => {
      const end = e.endAt ?? e.startAt + 60 * 60 * 1000;
      return end >= now && e.startAt <= now + 7 * 24 * 60 * 60 * 1000;
    }) ??
    events.find((e) => e.startAt >= now) ??
    null;

  const checklist = firstPlacedData<ChecklistData>(layout, data, "checklist");
  const topTaskItem = checklist?.items.find((i) => !i.done) ?? null;
  const topTask = topTaskItem ? { id: topTaskItem.id, text: topTaskItem.text } : null;

  const pomodoro = firstPlacedData<PomodoroData>(layout, data, "pomodoro");
  const timer =
    pomodoro && (pomodoro.endsAt != null || pomodoro.remainingMs != null)
      ? {
          mode: pomodoro.mode,
          endsAt: pomodoro.endsAt,
          remainingMs: pomodoro.remainingMs,
          focusMin: pomodoro.focusMin,
          breakMin: pomodoro.breakMin,
        }
      : pomodoro
        ? {
            mode: pomodoro.mode,
            endsAt: null,
            remainingMs: null,
            focusMin: pomodoro.focusMin,
            breakMin: pomodoro.breakMin,
          }
        : null;

  const focus = firstPlacedData<FocusData>(layout, data, "focus");
  const focusText = focus?.text?.trim() ? focus.text.trim() : null;

  return { nextEvent, topTask, timer, focusText };
}
