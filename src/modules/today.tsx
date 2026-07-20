import { Sunrise } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { TodayModule, type TodayData } from "@/components/TodayModule";

registerModule<TodayData>({
  type: "today",
  label: "Today",
  description: "Next event, top checklist item, and active timer in one dense row.",
  icon: Sunrise,
  defaultSpan: "full",
  size: "compact",
  singleton: true,
  lane: "focus",
  defaultData: () => ({}),
  render: ({ data, onChange, leading, menu, className }) => (
    <TodayModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
