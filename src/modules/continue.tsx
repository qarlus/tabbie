import { History } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { ContinueModule, type ContinueData } from "@/components/ContinueModule";

registerModule<ContinueData>({
  type: "continue",
  label: "Continue",
  description: "Recent, closed, and frequent sites — back into work in one click.",
  icon: History,
  defaultSpan: "full",
  size: "compact",
  singleton: true,
  lane: "resume",
  defaultData: () => ({ tab: "recent" }),
  render: ({ data, onChange, leading, menu, className }) => (
    <ContinueModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
