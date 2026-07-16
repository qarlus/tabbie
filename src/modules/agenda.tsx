import { CalendarDays } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { AgendaModule, type AgendaData } from "@/components/AgendaModule";

registerModule<AgendaData>({
  type: "agenda",
  label: "Agenda",
  description: "Upcoming events from a private ICS calendar link.",
  icon: CalendarDays,
  defaultSpan: "half",
  singleton: true,
  lane: "resume",
  defaultData: () => ({ url: "", cache: null }),
  render: ({ data, onChange, leading, menu, className }) => (
    <AgendaModule
      data={data}
      onChange={onChange}
      leading={leading}
      menu={menu}
      className={className}
    />
  ),
});
