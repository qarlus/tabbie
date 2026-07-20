import { Sparkles } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { CapbarModule, type CapbarData } from "@/components/CapbarModule";

registerModule<CapbarData>({
  type: "capbar",
  label: "Capbar",
  description: "Local Capbar glance and a gentle streak nudge — morning check without the tray.",
  icon: Sparkles,
  defaultSpan: "full",
  size: "compact",
  singleton: true,
  lane: "follow",
  defaultData: () => ({}),
  render: ({ data, onChange, leading, menu, className }) => (
    <CapbarModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
