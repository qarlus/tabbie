import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Settings } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SiteIcon } from "@/components/SiteIcon";
import {
  activateTab,
  createTabs,
  hasPermission,
  isExtension,
  queryAllTabs,
  searchBookmarks,
  searchHistory,
  type BookmarkSearchEntry,
  type HistoryEntry,
  type OpenTabEntry,
} from "@/lib/chrome";
import { navigateFast } from "@/lib/fast-link";
import { hostnameOf, matchShortcuts } from "@/lib/search";
import type { Shortcut } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: Shortcut[];
  onOpenSettings?: () => void;
  locale?: string;
}

function filterTabs(tabs: OpenTabEntry[], query: string): OpenTabEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...tabs].sort((a, b) => Number(b.active) - Number(a.active)).slice(0, 20);
  }
  return tabs
    .filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q) ||
        hostnameOf(t.url).toLowerCase().includes(q)
    )
    .slice(0, 20);
}

function isMacPlatform(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

export function CommandPalette({ open, onOpenChange, shortcuts, onOpenSettings, locale = "en" }: CommandPaletteProps) {
  const extension = isExtension();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyOk, setHistoryOk] = useState<boolean | null>(null);
  const [bookmarksOk, setBookmarksOk] = useState<boolean | null>(null);
  const [tabsOk, setTabsOk] = useState<boolean | null>(null);

  const [historyRows, setHistoryRows] = useState<HistoryEntry[]>([]);
  const [bookmarkRows, setBookmarkRows] = useState<BookmarkSearchEntry[]>([]);
  const [tabRows, setTabRows] = useState<OpenTabEntry[]>([]);

  const shortcutRows = useMemo(() => {
    const q = query.trim();
    if (!q) return shortcuts.slice(0, 8);
    return matchShortcuts(shortcuts, q, 12);
  }, [shortcuts, query]);

  const modKey = isMacPlatform() ? "⌘" : "Ctrl";

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (!extension) {
      setHistoryOk(false);
      setBookmarksOk(false);
      setTabsOk(false);
      return;
    }
    void Promise.all([
      hasPermission("history"),
      hasPermission("bookmarks"),
      hasPermission("tabs"),
    ]).then(([h, b, t]) => {
      setHistoryOk(h);
      setBookmarksOk(b);
      setTabsOk(t);
    });
  }, [open, extension]);

  const fetchResults = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const tasks: Promise<void>[] = [];

      if (extension && historyOk) {
        tasks.push(
          searchHistory(query, 20)
            .then(setHistoryRows)
            .catch(() => setHistoryRows([]))
        );
      } else {
        setHistoryRows([]);
      }

      if (extension && bookmarksOk) {
        tasks.push(
          searchBookmarks(query, 20)
            .then(setBookmarkRows)
            .catch(() => setBookmarkRows([]))
        );
      } else {
        setBookmarkRows([]);
      }

      if (extension && tabsOk) {
        tasks.push(
          queryAllTabs()
            .then((tabs) => setTabRows(filterTabs(tabs, query)))
            .catch(() => setTabRows([]))
        );
      } else {
        setTabRows([]);
      }

      await Promise.all(tasks);
    } finally {
      setLoading(false);
    }
  }, [open, query, extension, historyOk, bookmarksOk, tabsOk]);

  useEffect(() => {
    if (!open) return;
    if (extension && (historyOk === null || bookmarksOk === null || tabsOk === null)) return;
    const timer = window.setTimeout(() => {
      void fetchResults();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, query, extension, historyOk, bookmarksOk, tabsOk, fetchResults]);

  function close() {
    onOpenChange(false);
  }

  async function openUrl(url: string) {
    close();
    navigateFast(url);
  }

  async function openTab(tab: OpenTabEntry) {
    close();
    if (extension && tab.id != null) {
      try {
        await activateTab(tab.id, tab.windowId);
        return;
      } catch {
        // fall through
      }
    }
    navigateFast(tab.url);
  }

  async function openNewTab() {
    close();
    if (extension) {
      await createTabs(["chrome://newtab"], true);
    }
  }

  function openSettings() {
    close();
    onOpenSettings?.();
  }

  const missingPerms =
    extension &&
    (historyOk === false || bookmarksOk === false || tabsOk === false);

  const permissionHint = extension
    ? "Allow History, Bookmarks, and Tabs in Settings → Connect."
    : "Install CapTab as an extension to search tabs, bookmarks, and history.";

  const hasResults =
    shortcutRows.length > 0 ||
    tabRows.length > 0 ||
    bookmarkRows.length > 0 ||
    historyRows.length > 0 ||
    Boolean(onOpenSettings) ||
    extension;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>{t("commandPalette.title", locale)}</DialogTitle>
        <DialogDescription>Search tabs, bookmarks, history, and shortcuts</DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "overflow-hidden p-0 sm:max-w-lg",
          "border-[rgba(92,64,48,0.12)] bg-[rgba(245,240,232,0.96)] dark:border-[rgba(255,236,214,0.1)] dark:bg-[rgba(18,13,10,0.96)]"
        )}
      >
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput
            placeholder="Search tabs, bookmarks, history…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[min(360px,50vh)]">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Searching…
              </div>
            )}

            {!loading && !hasResults && (
              <CommandEmpty className="px-4 text-muted-foreground">
                {permissionHint}
              </CommandEmpty>
            )}

            {!loading && (
              <>
                <CommandGroup heading="Actions">
                  {onOpenSettings && (
                    <CommandItem value="action-settings" onSelect={openSettings}>
                      <Settings className="h-4 w-4 opacity-60" aria-hidden />
                      <span>Open Settings</span>
                    </CommandItem>
                  )}
                  {extension && (
                    <CommandItem value="action-new-tab" onSelect={() => void openNewTab()}>
                      <Plus className="h-4 w-4 opacity-60" aria-hidden />
                      <span>New tab</span>
                    </CommandItem>
                  )}
                </CommandGroup>

                {tabRows.length > 0 && (
                  <CommandGroup heading="Open tabs">
                    {tabRows.map((tab) => (
                      <CommandItem
                        key={`tab-${tab.id ?? tab.url}`}
                        value={`tab-${tab.id ?? tab.url}`}
                        onSelect={() => void openTab(tab)}
                      >
                        <SiteIcon url={tab.url} name={tab.title} size={14} />
                        <span className="min-w-0 flex-1 truncate">{tab.title}</span>
                        <span className="truncate text-xs text-muted-foreground/70">
                          {hostnameOf(tab.url)}
                        </span>
                        {tab.active && (
                          <CommandShortcut className="tracking-normal">Active</CommandShortcut>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {bookmarkRows.length > 0 && (
                  <CommandGroup heading="Bookmarks">
                    {bookmarkRows.map((row) => (
                      <CommandItem
                        key={`bm-${row.id}`}
                        value={`bm-${row.id}`}
                        onSelect={() => void openUrl(row.url)}
                      >
                        <SiteIcon url={row.url} name={row.title} size={14} />
                        <span className="min-w-0 flex-1 truncate">{row.title}</span>
                        <span className="truncate text-xs text-muted-foreground/70">
                          {hostnameOf(row.url)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {historyRows.length > 0 && (
                  <CommandGroup heading="History">
                    {historyRows.map((row) => (
                      <CommandItem
                        key={`hist-${row.id}`}
                        value={`hist-${row.id}`}
                        onSelect={() => void openUrl(row.url)}
                      >
                        <SiteIcon url={row.url} name={row.title} size={14} />
                        <span className="min-w-0 flex-1 truncate">{row.title}</span>
                        <span className="truncate text-xs text-muted-foreground/70">
                          {hostnameOf(row.url)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {shortcutRows.length > 0 && (
                  <CommandGroup heading="Shortcuts">
                    {shortcutRows.map((row) => (
                      <CommandItem
                        key={`sc-${row.id}`}
                        value={`sc-${row.id}`}
                        onSelect={() => void openUrl(row.url)}
                      >
                        <SiteIcon url={row.url} name={row.name} size={14} />
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <span className="truncate text-xs text-muted-foreground/70">
                          {hostnameOf(row.url)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {!loading &&
                  query.trim() &&
                  tabRows.length === 0 &&
                  bookmarkRows.length === 0 &&
                  historyRows.length === 0 &&
                  shortcutRows.length === 0 && (
                    <CommandEmpty>No matches.</CommandEmpty>
                  )}

                {!loading && missingPerms && !query.trim() && (
                  <p className="px-3 pb-3 text-center text-xs text-muted-foreground/80">
                    {permissionHint}
                  </p>
                )}
              </>
            )}
          </CommandList>
          <div className="flex items-center justify-between border-t border-[rgba(92,64,48,0.08)] px-3 py-2 text-[11px] text-muted-foreground/70 dark:border-[rgba(255,236,214,0.08)]">
            <span>Navigate · Enter</span>
            <span>
              {modKey}K · palette
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
