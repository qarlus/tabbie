import { ClipboardPaste } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { ClipboardModule, type ClipboardData } from "@/components/ClipboardModule";

registerModule<ClipboardData>({
  type: "clipboard",
  label: "Clipboard",
  description: "Last few copied links and snippets — local shelf, no polling.",
  icon: ClipboardPaste,
  defaultSpan: "half",
  singleton: true,
  lane: "notes",
  defaultData: () => ({}),
  render: ({ data, onChange, leading, menu, className }) => (
    <ClipboardModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
