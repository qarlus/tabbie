import { Columns2, MoreHorizontal, Square, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ModuleSpan } from "@/lib/modules/types";

interface ModuleMenuProps {
  span: ModuleSpan;
  onToggleSpan: () => void;
  onRemove: () => void;
  /** Compact modules have no half/full resize. */
  allowResize?: boolean;
}

export function ModuleMenu({
  span,
  onToggleSpan,
  onRemove,
  allowResize = true,
}: ModuleMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Module options"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {allowResize ? (
          <>
            <DropdownMenuItem onClick={onToggleSpan}>
              {span === "full" ? (
                <>
                  <Columns2 className="mr-2 h-3.5 w-3.5" /> Make half width
                </>
              ) : (
                <>
                  <Square className="mr-2 h-3.5 w-3.5" /> Make full width
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          onClick={onRemove}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove module
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
