import { BookMarked } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { LinksModule } from "@/components/LinksModule";
import type { LinksData } from "@/components/LinksModule";

registerModule<LinksData>({
  type: "links",
  label: "Link group",
  description: "A named set of destinations beyond the shortcut strip.",
  icon: BookMarked,
  defaultSpan: "half",
  lane: "notes",
  defaultData: () => ({ title: "Links", links: [] }),
  render: ({ data, onChange, leading, menu, className }) => (
    <LinksModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
