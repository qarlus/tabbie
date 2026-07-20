import { Volume2 } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import {
  SoundModule,
  defaultSoundData,
  type SoundData,
} from "@/components/SoundModule";

registerModule<SoundData>({
  type: "sound",
  label: "Ambient",
  description: "Soft rain, café, or forest noise — generated in-browser.",
  icon: Volume2,
  defaultSpan: "half",
  singleton: true,
  lane: "focus",
  defaultData: defaultSoundData,
  render: ({ data, onChange, leading, menu, className }) => (
    <SoundModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
