import { Download } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { DownloadsModule, type DownloadsData } from "@/components/DownloadsModule";

registerModule<DownloadsData>({
  type: "downloads",
  label: "Downloads",
  description: "Last few downloads — open, show in folder, or copy path.",
  icon: Download,
  defaultSpan: "half",
  singleton: true,
  lane: "resume",
  defaultData: () => ({}),
  render: ({ data, onChange, leading, menu, className }) => (
    <DownloadsModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
