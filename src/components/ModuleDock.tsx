import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { readKey, useStoredState, writeKey } from "@/lib/storage";
import {
  createPlacedModule,
  createStarterPack,
  getModule,
  layoutFromLegacyGithub,
  listModules,
  MODULE_LANES,
  normalizeLayout,
  type LayoutState,
  type ModuleDataMap,
  type ModuleDefinition,
  type ModuleLane,
  type PlacedModule,
} from "@/lib/modules";
import type { Settings } from "@/lib/types";
import type { LayoutModeId } from "@/lib/scene";
import { ModuleMenu } from "./ModuleMenu";
import { CapTabMark } from "./CapTabMark";

const EMPTY_DATA: ModuleDataMap = {};

const LANE_LABEL: Record<ModuleLane, string> = {
  resume: "Resume",
  follow: "Follow",
  focus: "Focus",
  notes: "Notes",
};

const LANE_HINT: Record<ModuleLane, string> = {
  resume: "Work and calendar",
  follow: "Feeds and weather",
  focus: "Intention and time",
  notes: "Lists, links, scraps",
};

interface ModuleDockProps {
  layout: LayoutState;
  setLayout: (next: LayoutState | ((prev: LayoutState) => LayoutState)) => void;
  settings: Settings;
  layoutMode?: LayoutModeId;
}

function cardGridClass(mode: LayoutModeId): string {
  switch (mode) {
    case "bento":
      return "grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3";
    case "magazine":
      return "grid grid-cols-1 items-start gap-4 md:grid-cols-12";
    case "islands":
      return "grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8";
    case "stack":
    default:
      return "grid grid-cols-1 items-start gap-3 md:grid-cols-2";
  }
}

function cardSpanClass(
  mode: LayoutModeId,
  span: "full" | "half",
  compact: boolean,
  index: number
): string {
  if (compact) return "w-full";
  switch (mode) {
    case "bento":
      // Full = 2 cols on lg; half = 1. First full can lead the mosaic.
      return span === "full" ? "sm:col-span-2 lg:col-span-2" : "sm:col-span-1";
    case "magazine":
      // Lead card spans wide; half cards share the remaining rhythm.
      if (index === 0 || span === "full") return "md:col-span-12 lg:col-span-8";
      return "md:col-span-6 lg:col-span-4";
    case "islands":
      return span === "full"
        ? "sm:col-span-2"
        : index % 2 === 1
          ? "sm:col-span-1 sm:translate-y-4"
          : "sm:col-span-1";
    case "stack":
    default:
      return span === "full" ? "md:col-span-2" : "md:col-span-1";
  }
}

/**
 * Draggable module dock under the fixed search/shortcuts band.
 * Compact modules (e.g. Focus) render in a strip above card modules.
 * Layout mode only changes visual arrangement — module order/span persist.
 */
export function ModuleDock({
  layout: layoutRaw,
  setLayout,
  settings,
  layoutMode = "stack",
}: ModuleDockProps) {
  const [dataRaw, setDataRaw] = useStoredState<ModuleDataMap>("module-data", EMPTY_DATA);
  const layout = useMemo(() => normalizeLayout(layoutRaw), [layoutRaw]);
  const [addOpen, setAddOpen] = useState(false);
  const migratedRef = useRef(false);
  const catalog = useMemo(() => listModules(), []);

  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    if (normalizeLayout(layoutRaw).modules.length > 0) {
      if (!readKey("starter-done", false)) writeKey("starter-done", true);
      return;
    }
    // Legacy: old settings.modules.github flag
    if (settings.modules?.github) {
      setLayout(layoutFromLegacyGithub(true));
      writeKey("starter-done", true);
      return;
    }
    // First run — seed a calm default dock once.
    if (!readKey("starter-done", false)) {
      const pack = createStarterPack();
      setLayout(pack.layout);
      setDataRaw((prev) => ({ ...prev, ...pack.data }));
      writeKey("starter-done", true);
    }
  }, [layoutRaw, setLayout, setDataRaw, settings.modules?.github]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function setModules(updater: (prev: PlacedModule[]) => PlacedModule[]) {
    setLayout((prev) => {
      const current = normalizeLayout(prev).modules;
      return { modules: updater(current) };
    });
  }

  function setInstanceData(id: string, next: unknown) {
    setDataRaw((prev) => ({ ...prev, [id]: next }));
  }

  function addModule(type: string) {
    const entry = getModule(type);
    if (!entry) return;
    if (entry.singleton && layout.modules.some((m) => m.type === type)) {
      setAddOpen(false);
      return;
    }
    const { placed, data } = createPlacedModule(type);
    setModules((prev) => {
      // Compact modules pin to the top of the dock on add.
      if (entry.size === "compact") return [placed, ...prev];
      return [...prev, placed];
    });
    if (data != null) setInstanceData(placed.id, data);
    setAddOpen(false);
  }

  function removeModule(id: string) {
    setModules((prev) => prev.filter((m) => m.id !== id));
    setDataRaw((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function toggleSpan(id: string) {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, span: m.span === "full" ? "half" : "full" } : m))
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setModules((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === active.id);
      const newIndex = prev.findIndex((m) => m.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const aSize = getModule(prev[oldIndex]!.type)?.size ?? "default";
      const bSize = getModule(prev[newIndex]!.type)?.size ?? "default";
      // Compact strips and cards stay in separate bands.
      if (aSize !== bSize) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const available = catalog.filter(
    (c) => !(c.singleton && layout.modules.some((m) => m.type === c.type))
  );
  const grouped = MODULE_LANES.map((lane) => ({
    lane,
    items: available.filter((c) => c.lane === lane),
  })).filter((g) => g.items.length > 0);

  const compactMods = layout.modules.filter((m) => getModule(m.type)?.size === "compact");
  const cardMods = layout.modules.filter((m) => getModule(m.type)?.size !== "compact");

  function renderModule(mod: PlacedModule, index: number) {
    const def = getModule(mod.type);
    return (
      <SortableModule
        key={mod.id}
        module={mod}
        def={def}
        layoutMode={layoutMode}
        cardIndex={index}
        data={
          dataRaw[mod.id] ?? (def?.defaultData ? def.defaultData() : undefined)
        }
        onDataChange={(next) => setInstanceData(mod.id, next)}
        onRemove={() => removeModule(mod.id)}
        onToggleSpan={() => toggleSpan(mod.id)}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {layout.modules.length === 0 ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(92,64,48,0.18)] bg-[rgba(245,240,232,0.35)] px-6 py-10 text-center transition-colors hover:border-[rgba(92,64,48,0.28)] hover:bg-[rgba(245,240,232,0.55)] dark:border-[rgba(255,236,214,0.12)] dark:bg-[rgba(24,18,14,0.28)] dark:hover:border-[rgba(255,236,214,0.2)] dark:hover:bg-[rgba(24,18,14,0.45)]"
        >
          <span className="mb-1">
            <CapTabMark className="h-10 w-10 rounded-[10px] shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
          </span>
          <span className="text-sm font-medium text-foreground/85">Add your first module</span>
          <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Focus, checklist, weather, agenda — build the new tab around what you glance at.
          </span>
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={layout.modules.map((m) => m.id)} strategy={rectSortingStrategy}>
            <div className="flex flex-col gap-3">
              {compactMods.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {compactMods.map((m, i) => renderModule(m, i))}
                </div>
              ) : null}
              {cardMods.length > 0 ? (
                <div className={cardGridClass(layoutMode)}>
                  {cardMods.map((m, i) => renderModule(m, i))}
                </div>
              ) : null}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {layout.modules.length > 0 ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-black/[0.03] hover:text-foreground dark:hover:bg-white/[0.04]"
        >
          <Plus className="h-3.5 w-3.5" /> Add module
        </button>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[min(90dvh,44rem)] flex-col gap-4 overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <div className="flex items-start gap-2.5">
              <CapTabMark className="mt-0.5 h-7 w-7 shrink-0 rounded-[7px] shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
              <div className="min-w-0">
                <DialogTitle>Add a module</DialogTitle>
                <DialogDescription>
                  Compact strips sit above cards. Drag to reorder within each band; use ⋯ to resize
                  or remove.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              All available modules are already on the page.
            </p>
          ) : (
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              <div className="flex flex-col gap-5 pb-1">
                {grouped.map(({ lane, items }) => (
                  <div key={lane} className="flex flex-col gap-1.5">
                    <div className="sticky top-0 z-[1] bg-background/95 px-1 py-0.5 backdrop-blur-sm">
                      <p className="text-xs font-medium text-foreground/80">{LANE_LABEL[lane]}</p>
                      <p className="text-[11px] text-muted-foreground">{LANE_HINT[lane]}</p>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {items.map((c) => {
                        const Icon = c.icon;
                        return (
                          <li key={c.type}>
                            <button
                              type="button"
                              onClick={() => addModule(c.type)}
                              className="group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 dark:hover:bg-white/[0.06]"
                            >
                              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ac/10 text-ac transition-colors group-hover:bg-ac/15">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{c.label}</span>
                                  {c.size === "compact" ? (
                                    <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.08]">
                                      strip
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                                  {c.description}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableModule({
  module,
  def,
  data,
  layoutMode,
  cardIndex,
  onDataChange,
  onRemove,
  onToggleSpan,
}: {
  module: PlacedModule;
  def: ModuleDefinition | undefined;
  data: unknown;
  layoutMode: LayoutModeId;
  cardIndex: number;
  onDataChange: (next: unknown) => void;
  onRemove: () => void;
  onToggleSpan: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handle = (
    <button
      type="button"
      className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground active:cursor-grabbing dark:hover:bg-white/10"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );

  const compact = def?.size === "compact";
  const menu = (
    <ModuleMenu
      span={module.span}
      onToggleSpan={onToggleSpan}
      onRemove={onRemove}
      allowResize={!compact}
    />
  );
  const spanClass = cardSpanClass(layoutMode, module.span, !!compact, cardIndex);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "captab-module-enter",
        !compact && "min-h-[11rem]",
        layoutMode === "islands" && !compact && "transition-transform duration-300",
        spanClass,
        isDragging && "z-20 opacity-80"
      )}
    >
      {def ? (
        def.render({
          id: module.id,
          data,
          onChange: onDataChange,
          leading: handle,
          menu,
        })
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-[rgba(92,64,48,0.12)] bg-[rgba(245,240,232,0.62)] p-4 text-sm text-muted-foreground dark:border-[rgba(255,236,214,0.1)] dark:bg-[rgba(24,18,14,0.48)]">
          Unknown module: {module.type}
        </div>
      )}
    </div>
  );
}
