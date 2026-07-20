import { uid } from "@/lib/search";
import type { LayoutState, ModuleDataMap, ModuleDefinition, ModuleSpan, PlacedModule } from "./types";
import { DEFAULT_LAYOUT } from "./types";

const registry = new Map<string, ModuleDefinition>();

/** First-run dock: Focus strip + Checklist + Weather. */
export const STARTER_MODULE_TYPES = ["focus", "checklist", "weather"] as const;

export function registerModule<TData>(def: ModuleDefinition<TData>): void {
  if (registry.has(def.type)) {
    console.warn(`[captab] module "${def.type}" was registered twice; keeping the first.`);
    return;
  }
  registry.set(def.type, def as ModuleDefinition);
}

export function getModule(type: string): ModuleDefinition | undefined {
  return registry.get(type);
}

export function listModules(): ModuleDefinition[] {
  return [...registry.values()];
}

export function catalogEntry(type: string): ModuleDefinition | undefined {
  return registry.get(type);
}

export function createPlacedModule(type: string): {
  placed: PlacedModule;
  data: unknown | null;
} {
  const entry = registry.get(type);
  if (!entry) throw new Error(`Unknown module type: ${type}`);
  return {
    placed: { id: uid(), type, span: entry.defaultSpan },
    data: entry.defaultData ? entry.defaultData() : null,
  };
}

export function normalizeLayout(raw: Partial<LayoutState> | null | undefined): LayoutState {
  const modules = Array.isArray(raw?.modules) ? raw.modules : [];
  const known = new Set(registry.keys());
  return {
    modules: modules
      .filter(
        (m): m is PlacedModule =>
          !!m &&
          typeof m === "object" &&
          typeof m.id === "string" &&
          typeof m.type === "string" &&
          (m.span === "full" || m.span === "half") &&
          // Drop unknown types only after registry is loaded; if empty registry, keep all
          (known.size === 0 || known.has(m.type))
      )
      .map((m) => {
        const out: PlacedModule = {
          id: m.id,
          type: m.type,
          span: m.span as ModuleSpan,
        };
        if (typeof m.x === "number" && Number.isFinite(m.x)) {
          out.x = Math.min(100, Math.max(0, m.x));
        }
        if (typeof m.y === "number" && Number.isFinite(m.y)) {
          out.y = Math.min(100, Math.max(0, m.y));
        }
        return out;
      }),
  };
}

/** Migrate legacy settings.modules.github → a layout entry once. */
export function layoutFromLegacyGithub(enabled: boolean): LayoutState {
  if (!enabled) return DEFAULT_LAYOUT;
  if (!registry.has("github")) return DEFAULT_LAYOUT;
  const { placed } = createPlacedModule("github");
  return { modules: [placed] };
}

/** Build the default first-run layout + instance data. */
export function createStarterPack(): { layout: LayoutState; data: ModuleDataMap } {
  const modules: PlacedModule[] = [];
  const data: ModuleDataMap = {};
  for (const type of STARTER_MODULE_TYPES) {
    if (!registry.has(type)) continue;
    const { placed, data: instance } = createPlacedModule(type);
    modules.push(placed);
    if (instance != null) data[placed.id] = instance;
  }
  return { layout: { modules }, data };
}
