import { BookMarked } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { LinksModule } from "@/components/LinksModule";
import type { LinksData } from "@/components/LinksModule";

registerModule<LinksData>({
  type: "links",
  label: "Workspace",
  description: "Named set of links — open the whole group in one click.",
  icon: BookMarked,
  defaultSpan: "half",
  lane: "notes",
  defaultData: () => ({ title: "Workspace", links: [] }),
  render: ({ data, onChange, leading, menu, className }) => (
    <LinksModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
