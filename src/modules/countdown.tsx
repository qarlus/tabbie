import { Timer } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { CountdownModule, type CountdownData } from "@/components/CountdownModule";

registerModule<CountdownData>({
  type: "countdown",
  label: "Countdown",
  description: "One deadline or milestone on the new tab.",
  icon: Timer,
  defaultSpan: "half",
  lane: "focus",
  defaultData: () => ({
    label: "Something due",
    targetAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }),
  render: ({ data, onChange, leading, menu, className }) => (
    <CountdownModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
