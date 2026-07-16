import { useState } from "react";
import { Check, ClipboardCopy, Plus, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { uid } from "@/lib/search";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";

export interface SnippetItem {
  id: string;
  name: string;
  text: string;
}

export interface SnippetsData {
  items: SnippetItem[];
}

interface SnippetsModuleProps {
  data: SnippetsData;
  onChange: (next: SnippetsData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

export function SnippetsModule({ data, onChange, leading, menu, className }: SnippetsModuleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copySnippet(item: SnippetItem) {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === item.id ? null : cur));
      }, 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  function remove(id: string) {
    onChange({ items: data.items.filter((i) => i.id !== id) });
  }

  return (
    <Panel
      title="Snippets"
      icon={<ClipboardCopy className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        data.items.length > 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground/60">
            {data.items.length}
          </span>
        ) : null
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Add snippet"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
          {menu}
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {data.items.length === 0 ? (
          <ModuleEmpty
            icon={ClipboardCopy}
            title="No snippets yet"
            hint="Save commands and pasteables. One click copies to the clipboard."
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add snippet
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {data.items.map((item) => {
              const copied = copiedId === item.id;
              return (
                <li key={item.id}>
                  <div className="group flex items-start gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => void copySnippet(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </span>
                        {copied ? (
                          <Check className="h-3 w-3 shrink-0 text-ac" aria-label="Copied" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-2 font-mono text-[11px] leading-snug text-muted-foreground">
                        {item.text}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label="Remove snippet"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddSnippetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(item) => onChange({ items: [...data.items, { id: uid(), ...item }] })}
      />
    </Panel>
  );
}

function AddSnippetDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: { name: string; text: string }) => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setName("");
    setText("");
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const t = text.trim();
    if (!n || !t) {
      setError("Name and content are required");
      return;
    }
    onSave({ name: n, text: t });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add snippet</DialogTitle>
            <DialogDescription>
              Named pasteables — click a row later to copy. Stored only on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="snippet-name">Name</Label>
              <Input
                id="snippet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. git push force-with-lease"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="snippet-text">Content</Label>
              <Textarea
                id="snippet-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="The text to copy…"
                className="min-h-24 font-mono text-xs"
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
