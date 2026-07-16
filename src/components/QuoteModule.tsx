import { useMemo, useState } from "react";
import { Quote as QuoteIcon, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

export interface QuoteData {
  /** Optional pinned line — when set, catalog rotation is ignored. */
  custom: string;
  /** Day key (YYYY-MM-DD) when the user last shuffled; paired with shuffleSalt. */
  shuffleDay: string;
  shuffleSalt: number;
}

interface QuoteModuleProps {
  data: QuoteData;
  onChange: (next: QuoteData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

/** Calm, short lines — no attribution noise, no network. */
const CATALOG: string[] = [
  "Do the next right thing.",
  "Slow is smooth. Smooth is fast.",
  "One thing at a time.",
  "Protect the deep work.",
  "Leave it better than you found it.",
  "Ship the small version.",
  "Clarity over cleverness.",
  "Make it easy to start again tomorrow.",
  "Less noise, more signal.",
  "Write it down so you can forget it.",
  "The work compounds.",
  "Finish the open loop.",
  "Attention is the scarce resource.",
  "Good enough today beats perfect later.",
  "Return to the breath. Return to the task.",
  "Quiet the dashboard; trust the craft.",
  "Begin before you feel ready.",
  "Subtract until it feels inevitable.",
  "Stay with the hard part a little longer.",
  "Your future self is watching.",
  "Keep the promise you made this morning.",
  "Small steps, steady pace.",
  "Close the tab. Open the work.",
  "Be kind to the person doing the work.",
  "Progress is often invisible until it isn’t.",
  "Choose depth over breadth for an hour.",
  "The blank page is permission.",
  "Let the draft be ugly.",
  "Rest is part of the loop.",
  "Name the fear, then continue.",
];

function dayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hashDay(key: string, salt: number): number {
  let h = salt | 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickQuote(data: QuoteData): string {
  const custom = data.custom.trim();
  if (custom) return custom;
  const today = dayKey();
  const salt = data.shuffleDay === today ? data.shuffleSalt : 0;
  const idx = hashDay(today, salt) % CATALOG.length;
  return CATALOG[idx]!;
}

export function QuoteModule({ data, onChange, leading, menu, className }: QuoteModuleProps) {
  const [editing, setEditing] = useState(false);
  const line = useMemo(() => pickQuote(data), [data]);
  const pinned = data.custom.trim().length > 0;

  function shuffle() {
    onChange({
      ...data,
      custom: "",
      shuffleDay: dayKey(),
      shuffleSalt: (data.shuffleSalt + 1 + Math.floor(Math.random() * 17)) | 0,
    });
  }

  return (
    <Panel
      title="Line"
      icon={<QuoteIcon className="h-3.5 w-3.5" />}
      leading={leading}
      className={cn("min-h-[10rem]", className)}
      badge={
        pinned ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac normal-case tracking-normal">
            yours
          </span>
        ) : null
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {editing ? "Done" : "Edit"}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 px-0"
            onClick={shuffle}
            aria-label="Another line"
            title="Another line"
          >
            <Shuffle className="h-3 w-3" />
          </Button>
          {menu}
        </>
      }
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          <Input
            value={data.custom}
            onChange={(e) => onChange({ ...data, custom: e.target.value })}
            placeholder="Pin your own line (leave blank for today’s)"
            maxLength={200}
            className="h-9 text-sm"
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground/70">
            Empty uses a rotating line for the day. Shuffle picks another from the local catalog.
          </p>
        </div>
      ) : (
        <blockquote className="flex flex-1 flex-col justify-center px-1 py-4">
          <p className="text-balance text-lg font-medium leading-snug tracking-tight text-foreground/90 sm:text-xl">
            {line}
          </p>
        </blockquote>
      )}
    </Panel>
  );
}
