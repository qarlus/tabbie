import { Archive } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { ParkingModule, type ParkingData } from "@/components/ParkingModule";

registerModule<ParkingData>({
  type: "parking",
  label: "Tab stash",
  description: "Vacuum open tabs into a named stash — save without closing or stash & close.",
  icon: Archive,
  defaultSpan: "half",
  singleton: true,
  lane: "notes",
  defaultData: () => ({}),
  render: ({ data, onChange, leading, menu, className }) => (
    <ParkingModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
