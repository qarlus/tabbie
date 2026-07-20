import { BookOpen } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { ReadingListModule, type ReadingListData } from "@/components/ReadingListModule";

registerModule<ReadingListData>({
  type: "reading",
  label: "Triage",
  description: "Quiet inbox for links — Done or Later. Not another notes app.",
  icon: BookOpen,
  defaultSpan: "half",
  lane: "notes",
  defaultData: () => ({ items: [] }),
  render: ({ data, onChange, leading, menu, className }) => (
    <ReadingListModule
      data={data}
      onChange={onChange}
      leading={leading}
      menu={menu}
      className={className}
    />
  ),
});
