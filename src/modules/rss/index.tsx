import { Rss } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { RssModule, type RssData } from "./RssModule";

registerModule<RssData>({
  type: "rss",
  label: "RSS / Atom feeds",
  description: "Follow releases, blogs, or Mastodon accounts via feed URLs.",
  icon: Rss,
  defaultSpan: "full",
  lane: "follow",
  defaultData: () => ({ feeds: [], cache: null }),
  render: ({ data, onChange, leading, menu, className }) => (
    <RssModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
