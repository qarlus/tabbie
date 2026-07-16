/**
 * Module system — import this barrel once so all modules register.
 * Adding a module: create src/modules/<name>.tsx and import it below.
 */

// Side-effect registrations first (order = Add-module dialog order by lane)
import "@/modules/github";
import "@/modules/linear";
import "@/modules/bookmarks";
import "@/modules/agenda";
import "@/modules/rss";
import "@/modules/weather";
import "@/modules/focus";
import "@/modules/pomodoro";
import "@/modules/countdown";
import "@/modules/quote";
import "@/modules/checklist";
import "@/modules/reading";
import "@/modules/snippets";
import "@/modules/links";
import "@/modules/scratch";

export type {
  ModuleSpan,
  ModuleLane,
  PlacedModule,
  LayoutState,
  ModuleShellProps,
  ModuleRenderProps,
  ModuleDefinition,
  ModuleDataMap,
} from "./types";
export { DEFAULT_LAYOUT, MODULE_LANES } from "./types";
export {
  registerModule,
  getModule,
  listModules,
  catalogEntry,
  createPlacedModule,
  normalizeLayout,
  layoutFromLegacyGithub,
  createStarterPack,
  STARTER_MODULE_TYPES,
} from "./registry";
