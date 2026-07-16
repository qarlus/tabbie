import { useEffect, useMemo, useRef, useState } from "react";
import { Background } from "@/components/Background";
import { TopBar } from "@/components/TopBar";
import { SearchBar } from "@/components/SearchBar";
import { ShortcutGrid, type ShortcutEditorState } from "@/components/ShortcutGrid";
import { ModuleDock } from "@/components/ModuleDock";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useStoredState } from "@/lib/storage";
import { pushRecent } from "@/lib/search";
import { normalizeLayout, type LayoutState } from "@/lib/modules";
import { DEFAULT_SETTINGS, normalizeSettings, type Settings, type Shortcut } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "gh", name: "GitHub", url: "https://github.com" },
  { id: "gist", name: "Gist", url: "https://gist.github.com" },
  { id: "mdn", name: "MDN", url: "https://developer.mozilla.org" },
  { id: "npm", name: "npm", url: "https://www.npmjs.com" },
  { id: "so", name: "Stack Overflow", url: "https://stackoverflow.com" },
  { id: "linear", name: "Linear", url: "https://linear.app" },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export default function App() {
  const [settingsRaw, setSettingsRaw] = useStoredState<Settings>("settings", DEFAULT_SETTINGS);
  const settings = useMemo(() => normalizeSettings(settingsRaw), [settingsRaw]);
  const setSettings = (next: Settings | ((prev: Settings) => Settings)) => {
    setSettingsRaw((prev) => {
      const current = normalizeSettings(prev);
      const resolved = typeof next === "function" ? next(current) : next;
      return normalizeSettings(resolved);
    });
  };

  const [shortcuts, setShortcuts] = useStoredState<Shortcut[]>("shortcuts", DEFAULT_SHORTCUTS);
  const [recents, setRecents] = useStoredState<string[]>("recent-searches", []);
  const [layoutRaw, setLayoutRaw] = useStoredState<LayoutState>("layout", { modules: [] });
  const layout = useMemo(() => normalizeLayout(layoutRaw), [layoutRaw]);
  const setLayout = (next: LayoutState | ((prev: LayoutState) => LayoutState)) => {
    setLayoutRaw((prev) => {
      const current = normalizeLayout(prev);
      return normalizeLayout(typeof next === "function" ? next(current) : next);
    });
  };
  const hasModules = layout.modules.length > 0;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editor, setEditor] = useState<ShortcutEditorState>({ open: false, editing: null });

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.font = settings.font;
    root.dataset.surface = settings.surface;
    delete root.dataset.accent;
    delete root.dataset.bg;
  }, [settings.theme, settings.font, settings.surface]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !isEditableTarget(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative flex min-h-full flex-col">
      <Background surface={settings.surface} />
      <TopBar
        settings={settings}
        onOpenSettings={() => setSettingsOpen(true)}
        className="tabbie-enter"
      />

      <main
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-5 pb-10 pt-[4.25rem]",
          hasModules
            ? "max-w-6xl justify-start gap-4 sm:gap-5 sm:pb-12"
            : "max-w-3xl items-center justify-center gap-5 pb-16"
        )}
      >
        <div
          className={cn(
            "tabbie-enter flex w-full flex-col gap-3.5",
            hasModules ? "items-stretch" : "items-center"
          )}
        >
          <div className={cn("w-full", hasModules ? "mx-auto max-w-2xl" : "max-w-xl")}>
            <SearchBar
              settings={settings}
              shortcuts={shortcuts}
              recents={recents}
              onSearch={(q) => setRecents((prev) => pushRecent(prev, q))}
              inputRef={searchRef}
            />
          </div>
          <div className="tabbie-enter tabbie-enter-delay-1 w-full">
            <ShortcutGrid shortcuts={shortcuts} setShortcuts={setShortcuts} editor={editor} setEditor={setEditor} />
          </div>
        </div>

        <div className="tabbie-enter tabbie-enter-delay-2 w-full">
          <ModuleDock layout={layout} setLayout={setLayout} settings={settings} />
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} setSettings={setSettings} />
    </div>
  );
}
