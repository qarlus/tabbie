import { useEffect, useState } from "react";
import { Archive, Loader2, Play, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  closeTabs,
  createTabs,
  hasPermission,
  isCapTabNewTabUrl,
  isExtension,
  queryCurrentWindowTabs,
  requestPermission,
  type WindowTabEntry,
} from "@/lib/chrome";
import { uid } from "@/lib/search";
import { useStoredState } from "@/lib/storage";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";

export type ParkingData = Record<string, never>;

export type ParkedSession = {
  id: string;
  name: string;
  savedAt: number;
  tabs: { title: string; url: string }[];
};

interface ParkingModuleProps {
  data: ParkingData;
  onChange: (next: ParkingData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

function stashableTabs(tabs: WindowTabEntry[]): WindowTabEntry[] {
  return tabs.filter(
    (t) => !t.pinned && !isCapTabNewTabUrl(t.url) && !t.url.startsWith("chrome://")
  );
}

export function ParkingModule({ leading, menu, className }: ParkingModuleProps) {
  const extension = isExtension();
  const [sessions, setSessions] = useStoredState<ParkedSession[]>("parked-sessions", []);
  const [allowed, setAllowed] = useState<boolean | null>(extension ? null : false);
  const [requesting, setRequesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!extension) {
      setAllowed(false);
      return;
    }
    void hasPermission("tabs").then(setAllowed);
  }, [extension]);

  async function grant() {
    setRequesting(true);
    try {
      setAllowed(await requestPermission("tabs"));
    } finally {
      setRequesting(false);
    }
  }

  async function saveSession(closeAfter: boolean) {
    if (!extension || allowed !== true) return;
    setBusy(true);
    setError("");
    try {
      const allTabs = await queryCurrentWindowTabs();
      const tabs = stashableTabs(allTabs);
      if (tabs.length === 0) {
        setError("No stashable tabs in this window (skip pinned, chrome://, and this page).");
        return;
      }
      const label =
        name.trim() ||
        `Window · ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
      const session: ParkedSession = {
        id: uid(),
        name: label,
        savedAt: Date.now(),
        tabs: tabs.map((t) => ({ title: t.title, url: t.url })),
      };
      setSessions((prev) => [session, ...prev].slice(0, 20));
      setName("");

      if (closeAfter) {
        const tabIds = tabs.map((t) => t.id).filter((id): id is number => id != null);
        await closeTabs(tabIds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : closeAfter ? "Could not stash window" : "Could not park window");
    } finally {
      setBusy(false);
    }
  }

  async function park() {
    await saveSession(false);
  }

  async function stashAndClose() {
    await saveSession(true);
  }

  async function restore(session: ParkedSession) {
    setBusy(true);
    try {
      await createTabs(
        session.tabs.map((t) => t.url),
        true
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <Panel
      title="Tab stash"
      icon={<Archive className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        sessions.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">
            {sessions.length}
          </span>
        ) : null
      }
      actions={menu}
    >
      {!extension ? (
        <ModuleEmpty
          icon={Archive}
          title="Extension only"
          hint="Install CapTab as a new tab extension to stash and restore windows."
        />
      ) : allowed === null ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
        </div>
      ) : allowed === false ? (
        <ModuleEmpty
          icon={Shield}
          title="Allow tab access"
          hint="Needed to save this window’s tabs and restore them later. Local only."
          action={
            <Button type="button" size="sm" disabled={requesting} onClick={() => void grant()}>
              {requesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
              Allow tabs
            </Button>
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex gap-1.5">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this stash…"
              className="h-8 text-sm"
              aria-label="Session name"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              disabled={busy}
              onClick={() => void stashAndClose()}
            >
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Archive className="mr-1 h-3.5 w-3.5" />}
              Stash & close
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 shrink-0"
              disabled={busy}
              onClick={() => void park()}
            >
              Park
            </Button>
          </div>
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}

          {sessions.length === 0 ? (
            <ModuleEmpty
              icon={Archive}
              title="No stashed sessions"
              hint="Vacuum open tabs into a named stash — save without closing, or stash & close to clear the window."
              className="py-4"
            />
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{session.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {session.tabs.length} tab{session.tabs.length === 1 ? "" : "s"} ·{" "}
                      {new Date(session.savedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    disabled={busy}
                    onClick={() => void restore(session)}
                  >
                    <Play className="mr-1 h-3 w-3" /> Open
                  </Button>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label={`Delete ${session.name}`}
                    onClick={() => remove(session.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
