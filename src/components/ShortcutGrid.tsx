import { useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isValidUrl, normalizeUrl, uid } from "@/lib/search";
import { warmUrl } from "@/lib/fast-link";
import type { Shortcut } from "@/lib/types";
import { SiteIcon } from "./SiteIcon";

export interface ShortcutEditorState {
  open: boolean;
  /** null = adding a new shortcut */
  editing: Shortcut | null;
}

interface ShortcutGridProps {
  shortcuts: Shortcut[];
  setShortcuts: (next: Shortcut[] | ((prev: Shortcut[]) => Shortcut[])) => void;
  editor: ShortcutEditorState;
  setEditor: (next: ShortcutEditorState) => void;
}

/** Compact destination strip — stays in the first glance with search. */
export function ShortcutGrid({ shortcuts, setShortcuts, editor, setEditor }: ShortcutGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function remove(id: string) {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setShortcuts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex > dragIndex ? targetIndex - 1 : targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <>
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        {shortcuts.map((s, i) => (
          <div key={s.id} className="relative">
            {dropIndex === i && dragIndex !== null && dragIndex !== i && (
              <div className="absolute -left-1 top-1 bottom-1 w-0.5 rounded-full bg-ac" aria-hidden />
            )}
            <ShortcutChip
              shortcut={s}
              dragging={dragIndex === i}
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(i);
              }}
              onDrop={() => onDrop(i)}
              onEdit={() => setEditor({ open: true, editing: s })}
              onDelete={() => remove(s.id)}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => setEditor({ open: true, editing: null })}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 dark:hover:bg-white/[0.06]"
          aria-label="Add shortcut"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <ShortcutEditorDialog
        editor={editor}
        setEditor={setEditor}
        onSave={(shortcut) => {
          setShortcuts((prev) => {
            const exists = prev.some((s) => s.id === shortcut.id);
            return exists ? prev.map((s) => (s.id === shortcut.id ? shortcut : s)) : [...prev, shortcut];
          });
        }}
      />
    </>
  );
}

function ShortcutChip({
  shortcut,
  dragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEdit,
  onDelete,
}: {
  shortcut: Shortcut;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn("group/chip relative inline-flex items-center", dragging && "opacity-40")}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <a
        href={shortcut.url}
        draggable
        onPointerEnter={() => warmUrl(shortcut.url)}
        onFocus={() => warmUrl(shortcut.url)}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className="inline-flex h-8 max-w-[11rem] items-center gap-2 rounded-md border border-transparent px-2 transition-colors hover:border-black/8 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 dark:hover:border-white/10 dark:hover:bg-white/[0.04]"
      >
        <SiteIcon url={shortcut.url} name={shortcut.name} size={16} />
        <span className="truncate text-xs text-foreground/80">{shortcut.name}</span>
      </a>

      {/* Sit beside the chip — never over the label */}
      <span className="pointer-events-none ml-0.5 flex w-0 items-center gap-0.5 overflow-hidden opacity-0 transition-[width,opacity] duration-150 group-hover/chip:pointer-events-auto group-hover/chip:w-[2.75rem] group-hover/chip:opacity-100 group-focus-within/chip:pointer-events-auto group-focus-within/chip:w-[2.75rem] group-focus-within/chip:opacity-100">
        <button
          type="button"
          aria-label={`Edit ${shortcut.name}`}
          data-no-fast-nav
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/[0.08]"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${shortcut.name}`}
          data-no-fast-nav
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}

function ShortcutEditorDialog({
  editor,
  setEditor,
  onSave,
}: {
  editor: ShortcutEditorState;
  setEditor: (next: ShortcutEditorState) => void;
  onSave: (shortcut: Shortcut) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editor.open) {
      setName(editor.editing?.name ?? "");
      setUrl(editor.editing?.url ?? "");
      setError("");
    }
  }, [editor.open, editor.editing]);

  function save() {
    const normalized = normalizeUrl(url);
    if (!name.trim()) {
      setError("Give the shortcut a name.");
      return;
    }
    if (!isValidUrl(normalized)) {
      setError("That doesn't look like a valid URL — try something like github.com.");
      return;
    }
    onSave({ id: editor.editing?.id ?? uid(), name: name.trim(), url: normalized });
    setEditor({ open: false, editing: null });
  }

  return (
    <Dialog open={editor.open} onOpenChange={(open) => setEditor({ open, editing: open ? editor.editing : null })}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editor.editing ? "Edit shortcut" : "Add shortcut"}</DialogTitle>
          <DialogDescription>Stored only in this browser, on this device.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="shortcut-name">Name</Label>
            <Input
              id="shortcut-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GitHub"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shortcut-url">URL</Label>
            <Input
              id="shortcut-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="github.com"
              inputMode="url"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit">{editor.editing ? "Save changes" : "Add shortcut"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
