import { ListTodo } from "lucide-react";
import { registerModule } from "@/lib/modules/registry";
import { TasksModule, type TasksData } from "@/components/TasksModule";

registerModule<TasksData>({
  type: "tasks",
  label: "Tasks",
  description: "Local checklist or sync from Todoist, Trello, or Asana.",
  icon: ListTodo,
  defaultSpan: "half",
  lane: "notes",
  defaultData: () => ({ items: [], provider: "local" }),
  render: ({ data, onChange, leading, menu, className }) => (
    <TasksModule
      data={data}
      onChange={onChange}
      leading={leading}
      menu={menu}
      className={className}
    />
  ),
});
