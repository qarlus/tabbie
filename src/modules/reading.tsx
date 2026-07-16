import { BookOpen } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { ReadingListModule, type ReadingListData } from "@/components/ReadingListModule";

registerModule<ReadingListData>({
  type: "reading",
  label: "Reading list",
  description: "Save articles and docs to finish later.",
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
