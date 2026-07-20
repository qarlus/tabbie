import { useEffect, useMemo, useRef, useState } from "react";
import { Background } from "@/components/Background";
import { TopBar } from "@/components/TopBar";
import { SearchBar } from "@/components/SearchBar";
import { ShortcutGrid, type ShortcutEditorState } from "@/components/ShortcutGrid";
import { AiShortcuts } from "@/components/AiShortcuts";
import { PageTabs } from "@/components/PageTabs";
import { ModuleDock } from "@/components/ModuleDock";
import { CommandPalette } from "@/components/CommandPalette";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useStoredState, writeKey } from "@/lib/storage";
import { touchOpenStreak } from "@/lib/open-streak";
import { pushRecent } from "@/lib/search";
import { normalizeLayout, type LayoutState } from "@/lib/modules";
import {
  layoutFromPages,
  loadPagesState,
  normalizePagesState,
  updateActivePageModules,
  type PagesState,
} from "@/lib/pages";
import { pullChromeSync, syncIfEnabled } from "@/lib/chrome-sync";
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
  const [pagesRaw, setPagesRaw] = useStoredState<PagesState>("pages", loadPagesState());
  const pages = useMemo(() => normalizePagesState(pagesRaw), [pagesRaw]);

  const layout = useMemo(() => layoutFromPages(pages), [pages]);

  const setLayout = (next: LayoutState | ((prev: LayoutState) => LayoutState)) => {
    setPagesRaw((prevPages) => {
      const current = layoutFromPages(normalizePagesState(prevPages));
      const resolved = typeof next === "function" ? next(current) : next;
      const normalized = normalizeLayout(resolved);
      const updated = updateActivePageModules(normalizePagesState(prevPages), normalized.modules);
      writeKey("layout", normalized);
      return updated;
    });
  };

  const setPages = (next: PagesState | ((prev: PagesState) => PagesState)) => {
    setPagesRaw((prev) => {
      const current = normalizePagesState(prev);
      const resolved = typeof next === "function" ? next(current) : next;
      const normalized = normalizePagesState(resolved);
      writeKey("layout", layoutFromPages(normalized));
      return normalized;
    });
  };

  const hasModules = layout.modules.length > 0;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editor, setEditor] = useState<ShortcutEditorState>({ open: false, editing: null });

  const searchRef = useRef<HTMLInputElement>(null);
  const syncPulledRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.font = settings.font;
    root.dataset.surface = settings.surface;
    delete root.dataset.accent;
    delete root.dataset.bg;

    const stack = settings.customFontStack.trim();
    if (stack) {
      root.style.setProperty("--captab-font", stack);
    } else {
      root.style.removeProperty("--captab-font");
    }
  }, [settings.theme, settings.font, settings.surface, settings.customFontStack]);

  useEffect(() => {
    const href = settings.customFaviconDataUrl.trim();
    let link = document.querySelector<HTMLLinkElement>("link[data-captab-favicon]");
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.captabFavicon = "1";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [settings.customFaviconDataUrl]);

  useEffect(() => {
    touchOpenStreak();
  }, []);

  useEffect(() => {
    if (!settings.chromeSync || syncPulledRef.current) return;
    syncPulledRef.current = true;
    void pullChromeSync().then((pulled) => {
      if (pulled) window.location.reload();
    });
  }, [settings.chromeSync]);

  useEffect(() => {
    syncIfEnabled(settings, shortcuts);
  }, [settings, shortcuts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
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
      {settings.customCss.trim() ? (
        <style id="captab-custom-css">{settings.customCss}</style>
      ) : null}
      <Background
        surface={settings.surface}
        wallpaper={settings.wallpaper}
        customWallpaperDataUrl={settings.customWallpaperDataUrl}
      />
      <TopBar
        settings={settings}
        onOpenSettings={() => setSettingsOpen(true)}
        className="captab-enter"
      />

      <main
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-5 pb-10 pt-[4.25rem]",
          hasModules
            ? cn(
                "justify-start gap-4 sm:gap-5 sm:pb-12",
                settings.layoutMode === "magazine" || settings.layoutMode === "bento"
                  ? "max-w-7xl"
                  : settings.layoutMode === "islands"
                    ? "max-w-6xl"
                    : "max-w-6xl"
              )
            : "max-w-3xl items-center justify-center gap-5 pb-16"
        )}
      >
        <div
          className={cn(
            "captab-enter flex w-full flex-col gap-3.5",
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
          <div className="captab-enter captab-enter-delay-1 w-full">
            <ShortcutGrid shortcuts={shortcuts} setShortcuts={setShortcuts} editor={editor} setEditor={setEditor} />
          </div>
          {settings.showAiShortcuts ? (
            <AiShortcuts className="captab-enter captab-enter-delay-1" />
          ) : null}
        </div>

        {hasModules ? (
          <PageTabs pages={pages} onChange={setPages} className="captab-enter w-full" />
        ) : null}

        <div className="captab-enter captab-enter-delay-2 w-full">
          <ModuleDock
            layout={layout}
            setLayout={setLayout}
            settings={settings}
            layoutMode={settings.layoutMode}
          />
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        shortcuts={shortcuts}
        onOpenSettings={() => setSettingsOpen(true)}
        locale={settings.locale}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} setSettings={setSettings} />
    </div>
  );
}
