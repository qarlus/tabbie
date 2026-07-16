import { Bookmark } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { BookmarksModule, type BookmarksData } from "@/components/BookmarksModule";
import { BOOKMARK_ROOT } from "@/lib/chrome";

registerModule<BookmarksData>({
  type: "bookmarks",
  label: "Bookmarks",
  description: "Your Chrome bookmark bar and folders — read directly from this browser.",
  icon: Bookmark,
  defaultSpan: "half",
  singleton: true,
  lane: "resume",
  defaultData: () => ({ view: "bar", folderId: BOOKMARK_ROOT.bar }),
  render: ({ data, onChange, leading, menu, className }) => (
    <BookmarksModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
