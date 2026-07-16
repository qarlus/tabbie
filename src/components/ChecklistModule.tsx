import { useState } from "react";
import { Check, CheckSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/search";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistData {
  items: ChecklistItem[];
}

interface ChecklistModuleProps {
  data: ChecklistData;
  onChange: (next: ChecklistData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

export function ChecklistModule({ data, onChange, leading, menu, className }: ChecklistModuleProps) {
  const [draft, setDraft] = useState("");
  const open = data.items.filter((i) => !i.done).length;
  const done = data.items.filter((i) => i.done).length;

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    onChange({ items: [...data.items, { id: uid(), text, done: false }] });
    setDraft("");
  }

  function toggle(id: string) {
    onChange({
      items: data.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    });
  }

  function remove(id: string) {
    onChange({ items: data.items.filter((i) => i.id !== id) });
  }

  function clearDone() {
    onChange({ items: data.items.filter((i) => !i.done) });
  }

  return (
    <Panel
      title="Checklist"
      icon={<CheckSquare className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        data.items.length > 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground/60">
            {open} open{done > 0 ? ` · ${done} done` : ""}
          </span>
        ) : null
      }
      actions={
        <>
          {done > 0 ? (
            <button
              type="button"
              onClick={clearDone}
              className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear done
            </button>
          ) : null}
          {menu}
        </>
      }
    >
      <form
        className="mb-2 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          addItem();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item…"
          className="h-8 flex-1 border-black/8 bg-black/[0.03] text-sm dark:border-white/10 dark:bg-white/[0.04]"
          aria-label="New checklist item"
        />
        <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5" disabled={!draft.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {data.items.length === 0 ? (
          <ModuleEmpty
            icon={CheckSquare}
            title="Nothing on the list"
            hint="A short list for today. Stored only on this device."
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    item.done
                      ? "border-ac bg-ac text-white"
                      : "border-black/20 dark:border-white/25"
                  )}
                  aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                  aria-pressed={item.done}
                >
                  {item.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </button>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm leading-snug",
                    item.done && "text-muted-foreground line-through"
                  )}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label="Remove item"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
