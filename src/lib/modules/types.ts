import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type ModuleSpan = "full" | "half";
export type ModuleLane = "resume" | "follow" | "focus" | "notes";

/** Display order in the Add-module dialog. */
export const MODULE_LANES: ModuleLane[] = ["resume", "follow", "focus", "notes"];

export interface PlacedModule {
  id: string;
  type: string;
  span: ModuleSpan;
}

export interface LayoutState {
  modules: PlacedModule[];
}

export const DEFAULT_LAYOUT: LayoutState = { modules: [] };

/** Shared chrome props injected by the dock (drag handle + overflow menu). */
export interface ModuleShellProps {
  leading?: ReactNode;
  menu?: ReactNode;
  className?: string;
}

export interface ModuleRenderProps<TData = unknown> extends ModuleShellProps {
  id: string;
  data: TData;
  onChange: (next: TData) => void;
}

export interface ModuleDefinition<TData = unknown> {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultSpan: ModuleSpan;
  singleton?: boolean;
  /** Compact modules skip the tall panel min-height and usually span full width. */
  size?: "default" | "compact";
  lane: ModuleLane;
  /**
   * Initial instance data, or null when the module uses its own storage
   * (e.g. GitHub config/cache).
   */
  defaultData: (() => TData) | null;
  render: (props: ModuleRenderProps<TData>) => ReactNode;
}

/** Opaque per-instance data keyed by placed module id. */
export type ModuleDataMap = Record<string, unknown>;
