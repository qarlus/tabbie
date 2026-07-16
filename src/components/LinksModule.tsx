import { useEffect, useState } from "react";
import { BookMarked, Plus, X } from "lucide-react";
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

export interface LinkItem {
  id: string;
  name: string;
  url: string;
}

export interface LinksData {
  title: string;
  links: LinkItem[];
}

interface LinksModuleProps {
  data: LinksData;
  onChange: (next: LinksData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

export function LinksModule({ data, onChange, leading, menu, className }: LinksModuleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Panel
      title={data.title || "Links"}
      icon={<BookMarked className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        data.links.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">
            {data.links.length}
          </span>
        ) : null
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Add link"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
          {menu}
        </>
      }
    >
      <div className="mb-1.5">
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Group name"
          className="h-8 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-black/10 focus-visible:bg-black/[0.03] dark:focus-visible:border-white/10 dark:focus-visible:bg-white/[0.03]"
          aria-label="Link group title"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {data.links.length === 0 ? (
          <ModuleEmpty
            icon={BookMarked}
            title="No links yet"
            hint="Add destinations you open often. Stored only on this device."
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add link
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {data.links.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                onDelete={() => onChange({ ...data, links: data.links.filter((l) => l.id !== link.id) })}
              />
            ))}
          </ul>
        )}
      </div>

      <AddLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(link) => onChange({ ...data, links: [...data.links, link] })}
      />
    </Panel>
  );
}

function LinkRow({ link, onDelete }: { link: LinkItem; onDelete: () => void }) {
  return (
    <li>
      <a
        {...fastLinkProps(link.url)}
        className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      >
        <SiteIcon url={link.url} name={link.name} size={16} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{link.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{hostnameOf(link.url)}</span>
        </span>
        <button
          type="button"
          aria-label={`Remove ${link.name}`}
          data-no-fast-nav
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </a>
    </li>
  );
}

function AddLinkDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (link: LinkItem) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setUrl("");
      setError("");
    }
  }, [open]);

  function save() {
    const normalized = normalizeUrl(url);
    if (!name.trim()) {
      setError("Give the link a name.");
      return;
    }
    if (!isValidUrl(normalized)) {
      setError("That doesn't look like a valid URL.");
      return;
    }
    onSave({ id: uid(), name: name.trim(), url: normalized });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add link</DialogTitle>
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
            <Label htmlFor="link-name">Name</Label>
            <Input id="link-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Docs" autoFocus />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              inputMode="url"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit">Add link</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
