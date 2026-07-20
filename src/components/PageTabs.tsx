import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createPage, type PagesState } from "@/lib/pages";

interface PageTabsProps {
  pages: PagesState;
  onChange: (next: PagesState) => void;
  className?: string;
}

/** Dashboard page switcher — quiet chips, rename on double-click. */
export function PageTabs({ pages, onChange, className }: PageTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  // Hide until there is more than one page or the user adds one — keeps first-run calm.
  // Always show once any page exists beyond a single Home with modules (caller gates hasModules).

  function switchPage(id: string) {
    if (id === pages.activeId) return;
    onChange({ ...pages, activeId: id });
  }

  function addPage() {
    const page = createPage(`Page ${pages.pages.length + 1}`);
    onChange({ activeId: page.id, pages: [...pages.pages, page] });
  }

  function removePage(id: string) {
    if (pages.pages.length <= 1) return;
    const nextPages = pages.pages.filter((p) => p.id !== id);
    const activeId = pages.activeId === id ? nextPages[0]!.id : pages.activeId;
    onChange({ activeId, pages: nextPages });
  }

  function startRename(id: string, name: string) {
    setRenamingId(id);
    setDraftName(name);
  }

  function commitRename() {
    if (!renamingId) return;
    const name = draftName.trim() || "Page";
    onChange({
      ...pages,
      pages: pages.pages.map((p) => (p.id === renamingId ? { ...p, name } : p)),
    });
    setRenamingId(null);
  }

  const multi = pages.pages.length > 1;

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-black/5 pb-2 dark:border-white/8",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
        {pages.pages.map((page) => {
          const active = page.id === pages.activeId;
          if (renamingId === page.id) {
            return (
              <Input
                key={page.id}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="h-7 w-28 px-2 text-xs"
                autoFocus
              />
            );
          }
          return (
            <div key={page.id} className="group/page relative flex items-center">
              <button
                type="button"
                onClick={() => switchPage(page.id)}
                onDoubleClick={() => startRename(page.id, page.name)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "bg-foreground/[0.07] font-medium text-foreground dark:bg-white/10"
                    : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground dark:hover:bg-white/[0.05]"
                )}
                title="Double-click to rename"
              >
                {page.name}
              </button>
              {multi ? (
                <button
                  type="button"
                  onClick={() => removePage(page.id)}
                  className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 text-muted-foreground/50 opacity-0 shadow-sm ring-1 ring-black/8 transition-opacity hover:text-destructive group-hover/page:opacity-100 dark:ring-white/10"
                  aria-label={`Remove ${page.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
        onClick={addPage}
        title="Add dashboard page"
      >
        <Plus className="h-3 w-3" />
        <span className="hidden sm:inline">Page</span>
      </Button>
    </div>
  );
}

/** Stable id for the default home page. */
export const HOME_PAGE_ID = "home";
