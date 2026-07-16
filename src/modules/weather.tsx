import { CloudSun } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { WeatherModule, type WeatherData } from "@/components/WeatherModule";

registerModule<WeatherData>({
  type: "weather",
  label: "Weather",
  description: "Current conditions for a place — Open-Meteo, no account. Add more for other cities.",
  icon: CloudSun,
  defaultSpan: "half",
  lane: "follow",
  defaultData: () => ({ place: null, cache: null, celsius: true }),
  render: ({ data, onChange, leading, menu, className }) => (
    <WeatherModule
      data={data}
      onChange={onChange}
      leading={leading}
      menu={menu}
      className={className}
    />
  ),
});
