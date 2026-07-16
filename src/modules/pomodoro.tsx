import { AlarmClock } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { PomodoroModule, type PomodoroData } from "@/components/PomodoroModule";

registerModule<PomodoroData>({
  type: "pomodoro",
  label: "Timer",
  description: "Focus and break timer — pairs with Focus.",
  icon: AlarmClock,
  defaultSpan: "half",
  singleton: true,
  lane: "focus",
  defaultData: () => ({
    focusMin: 25,
    breakMin: 5,
    mode: "focus",
    endsAt: null,
    remainingMs: null,
    completed: 0,
  }),
  render: ({ data, onChange, leading, menu, className }) => (
    <PomodoroModule data={data} onChange={onChange} leading={leading} menu={menu} className={className} />
  ),
});
