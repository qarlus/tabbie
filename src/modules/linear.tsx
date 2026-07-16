import { SquareKanban } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { LinearPanel } from "@/components/LinearPanel";

registerModule({
  type: "linear",
  label: "Linear",
  description: "Open issues assigned to you — personal API key, opt-in.",
  icon: SquareKanban,
  defaultSpan: "full",
  singleton: true,
  lane: "resume",
  defaultData: null,
  render: ({ leading, menu, className }) => (
    <LinearPanel className={className ?? "min-h-[22rem]"} leading={leading} menu={menu} />
  ),
});
