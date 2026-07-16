import { registerModule } from "@/lib/modules/registry";
import { Github } from "lucide-react";
import { GithubActivityPanel } from "@/components/GithubActivityPanel";

registerModule({
  type: "github",
  label: "GitHub",
  description: "Recent PRs, issues, Actions, and optional notifications.",
  icon: Github,
  defaultSpan: "full",
  singleton: true,
  lane: "resume",
  defaultData: null,
  render: ({ leading, menu, className }) => (
    <GithubActivityPanel className={className ?? "min-h-[22rem]"} leading={leading} menu={menu} />
  ),
});
