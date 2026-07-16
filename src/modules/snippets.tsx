import { ClipboardCopy } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { SnippetsModule, type SnippetsData } from "@/components/SnippetsModule";

registerModule<SnippetsData>({
  type: "snippets",
  label: "Snippets",
  description: "Named pasteables — click to copy to the clipboard.",
  icon: ClipboardCopy,
  defaultSpan: "half",
  lane: "notes",
  defaultData: () => ({ items: [] }),
  render: ({ data, onChange, leading, menu, className }) => (
    <SnippetsModule
      data={data}
      onChange={onChange}
      leading={leading}
      menu={menu}
      className={className}
    />
  ),
});
