import { StickyNote } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { ScratchModule, type ScratchData } from "@/components/ScratchModule";

registerModule<ScratchData>({
  type: "scratch",
  label: "Scratch",
  description: "A quiet notepad that stays on this device.",
  icon: StickyNote,
  defaultSpan: "half",
  lane: "notes",
  defaultData: () => ({ text: "" }),
  render: ({ data, onChange, leading, menu, className }) => (
    <ScratchModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
