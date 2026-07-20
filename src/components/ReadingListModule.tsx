import { useState } from "react";
import { BookOpen, Check, Clock, Plus, RotateCcw, X } from "lucide-react";
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
import { hostnameOf, isValidUrl, normalizeUrl, uid } from "@/lib/search";
import { fastLinkProps } from "@/lib/fast-link";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";
import { SiteIcon } from "./SiteIcon";

export type TriageStatus = "open" | "later" | "done";

export interface ReadingItem {
  id: string;
  title: string;
  url: string;
  /** @deprecated migrated to status */
  done?: boolean;
  status?: TriageStatus;
  addedAt: number;
}

export interface ReadingListData {
  items: ReadingItem[];
}

interface ReadingListModuleProps {
  data: ReadingListData;
  onChange: (next: ReadingListData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

function statusOf(item: ReadingItem): TriageStatus {
  if (item.status === "open" || item.status === "later" || item.status === "done") return item.status;
  return item.done ? "done" : "open";
}

function normalizeItems(items: ReadingItem[]): ReadingItem[] {
  return items.map((i) => ({
    id: i.id,
    title: i.title,
    url: i.url,
    addedAt: i.addedAt,
    status: statusOf(i),
  }));
}

export function ReadingListModule({
  data,
  onChange,
  leading,
  menu,
  className,
}: ReadingListModuleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const items = normalizeItems(data.items);
  const open = items.filter((i) => statusOf(i) === "open");
  const later = items.filter((i) => statusOf(i) === "later");
  const done = items.filter((i) => statusOf(i) === "done");
  const toDeal = open.length;

  function commit(nextItems: ReadingItem[]) {
    onChange({ items: normalizeItems(nextItems) });
  }

  function addItem(item: Omit<ReadingItem, "id" | "status" | "addedAt">) {
    commit([
      { id: uid(), ...item, status: "open", addedAt: Date.now() },
      ...items,
    ]);
  }

  function setStatus(id: string, status: TriageStatus) {
    commit(items.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  function remove(id: string) {
    commit(items.filter((i) => i.id !== id));
  }

  function clearDone() {
    commit(items.filter((i) => statusOf(i) !== "done"));
  }

  const ordered = [...open, ...later, ...done];

  return (
    <Panel
      title="Triage"
      icon={<BookOpen className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        toDeal > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">
            {toDeal} to deal with
          </span>
        ) : null
      }
      actions={
        <>
          {done.length > 0 ? (
            <button
              type="button"
              onClick={clearDone}
              className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear done
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Add to triage"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
          {menu}
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <ModuleEmpty
            icon={BookOpen}
            title="Inbox clear"
            hint="Drop links to deal with — Done or Later. Not another notes app."
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add link
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {ordered.map((item) => {
              const status = statusOf(item);
              return (
                <li key={item.id}>
                  <div
                    className={`group flex items-center gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${
                      status === "done" ? "opacity-55" : ""
                    }`}
                  >
                    <a
                      {...fastLinkProps(item.url)}
                      className="flex min-w-0 flex-1 items-center gap-2.5"
                    >
                      <SiteIcon url={item.url} name={item.title} size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${
                            status === "done" ? "line-through" : "font-medium text-foreground"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {status === "later" ? "Later · " : ""}
                          {hostnameOf(item.url)}
                        </span>
                      </span>
                    </a>
                    {status !== "done" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, "done")}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity hover:bg-ac/15 hover:text-ac group-hover:opacity-100"
                        aria-label="Done"
                      >
                        Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, "open")}
                        className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        aria-label="Reopen"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                    {status === "open" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, "later")}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity hover:bg-black/5 hover:text-foreground group-hover:opacity-100 dark:hover:bg-white/10"
                        aria-label="Later"
                      >
                        Later
                      </button>
                    ) : status === "later" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(item.id, "open")}
                        className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        aria-label="Back to inbox"
                      >
                        <Clock className="h-3 w-3" />
                      </button>
                    ) : null}
                    {status === "done" ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded border border-ac bg-ac text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label="Remove"
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

      <AddReadingDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={addItem} />
    </Panel>
  );
}

function AddReadingDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: { title: string; url: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setTitle("");
    setUrl("");
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url.trim());
    if (!isValidUrl(normalized)) {
      setError("Enter a valid URL");
      return;
    }
    const label = title.trim() || hostnameOf(normalized) || "Untitled";
    onSave({ title: label, url: normalized });
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
            <DialogTitle>Add to triage</DialogTitle>
            <DialogDescription>Capture a link to deal with. Stays on this device.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reading-url">URL</Label>
              <Input
                id="reading-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reading-title">Title (optional)</Label>
              <Input
                id="reading-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Defaults to the site name"
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
