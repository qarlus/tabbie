import { uid } from "@/lib/search";
import { normalizeLayout, type LayoutState, type PlacedModule } from "@/lib/modules";
import { readKey } from "@/lib/storage";

export type DashboardPage = { id: string; name: string; modules: PlacedModule[] };
export type PagesState = { activeId: string; pages: DashboardPage[] };

export const DEFAULT_PAGES: PagesState = {
  activeId: "home",
  pages: [{ id: "home", name: "Home", modules: [] }],
};

function normalizePage(raw: unknown): DashboardPage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  const modules = normalizeLayout({ modules: Array.isArray(r.modules) ? r.modules : [] }).modules;
  return { id: r.id, name: r.name.trim() || "Page", modules };
}

/** Load pages from storage, migrating from legacy layout when needed. */
export function loadPagesState(): PagesState {
  const raw = readKey<Partial<PagesState> | null>("pages", null);
  if (raw?.pages && Array.isArray(raw.pages) && raw.pages.length > 0) {
    const pages = raw.pages.map(normalizePage).filter((p): p is DashboardPage => p != null);
    if (pages.length > 0) {
      const activeId =
        typeof raw.activeId === "string" && pages.some((p) => p.id === raw.activeId)
          ? raw.activeId
          : pages[0]!.id;
      return { activeId, pages };
    }
  }

  // Migrate from legacy layout key
  const layout = normalizeLayout(readKey<LayoutState>("layout", { modules: [] }));
  if (layout.modules.length > 0) {
    return {
      activeId: "home",
      pages: [{ id: "home", name: "Home", modules: layout.modules }],
    };
  }

  return DEFAULT_PAGES;
}

export function normalizePagesState(raw: Partial<PagesState> | null | undefined): PagesState {
  if (!raw?.pages || !Array.isArray(raw.pages) || raw.pages.length === 0) {
    return loadPagesState();
  }
  const pages = raw.pages.map(normalizePage).filter((p): p is DashboardPage => p != null);
  if (pages.length === 0) return DEFAULT_PAGES;
  const activeId =
    typeof raw.activeId === "string" && pages.some((p) => p.id === raw.activeId)
      ? raw.activeId
      : pages[0]!.id;
  return { activeId, pages };
}

export function activePageModules(state: PagesState): PlacedModule[] {
  const page = state.pages.find((p) => p.id === state.activeId);
  return page?.modules ?? [];
}

export function updateActivePageModules(
  state: PagesState,
  modules: PlacedModule[]
): PagesState {
  return {
    ...state,
    pages: state.pages.map((p) => (p.id === state.activeId ? { ...p, modules } : p)),
  };
}

export function createPage(name?: string): DashboardPage {
  return { id: uid(), name: name?.trim() || "New page", modules: [] };
}

/** Keep legacy layout key in sync with the active page. */
export function layoutFromPages(state: PagesState): LayoutState {
  return { modules: activePageModules(state) };
}
