import { Crosshair } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { FocusModule, type FocusData } from "@/components/FocusModule";

registerModule<FocusData>({
  type: "focus",
  label: "Focus",
  description: "One line for what you’re doing right now.",
  icon: Crosshair,
  defaultSpan: "full",
  size: "compact",
  singleton: true,
  lane: "focus",
  defaultData: () => ({ text: "" }),
  render: ({ data, onChange, leading, menu, className }) => (
    <FocusModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
