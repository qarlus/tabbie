import { CheckSquare } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { ChecklistModule, type ChecklistData } from "@/components/ChecklistModule";

registerModule<ChecklistData>({
  type: "checklist",
  label: "Checklist",
  description: "A short list for today — check off items as you go.",
  icon: CheckSquare,
  defaultSpan: "half",
  lane: "notes",
  defaultData: () => ({ items: [] }),
  render: ({ data, onChange, leading, menu, className }) => (
    <ChecklistModule
      data={data}
      onChange={onChange}
      leading={leading}
      menu={menu}
      className={className}
    />
  ),
});
