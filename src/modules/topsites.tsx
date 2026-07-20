import { Globe } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { TopSitesModule, type TopSitesData } from "@/components/TopSitesModule";

registerModule<TopSitesData>({
  type: "topsites",
  label: "Top sites",
  description: "Most visited sites from this browser — local, permission-gated.",
  icon: Globe,
  defaultSpan: "half",
  singleton: true,
  lane: "resume",
  defaultData: () => ({}),
  render: ({ data, onChange, leading, menu, className }) => (
    <TopSitesModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
