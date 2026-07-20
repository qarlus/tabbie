import { useCallback, useEffect, useState } from "react";
import { Check, CircleAlert, ExternalLink, ListTodo, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { uid } from "@/lib/search";
import { fastLinkProps } from "@/lib/fast-link";
import { useStoredState } from "@/lib/storage";
import {
  completeTask,
  DEFAULT_TASKS_CONFIG,
  fetchTasks,
  TasksError,
  type TaskItem,
  type TaskProvider,
  type TasksConfig,
} from "@/lib/tasks";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";

export interface TasksLocalItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TasksData {
  items: TasksLocalItem[];
  provider: TaskProvider;
}

interface TasksModuleProps {
  data: TasksData;
  onChange: (next: TasksData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

const PROVIDER_LABEL: Record<TaskProvider, string> = {
  local: "Local",
  todoist: "Todoist",
  trello: "Trello",
  asana: "Asana",
  google: "Google Tasks",
};

export function TasksModule({ data, onChange, leading, menu, className }: TasksModuleProps) {
  const [config, setConfig] = useStoredState<TasksConfig>("tasks-config", DEFAULT_TASKS_CONFIG);
  const [remoteTasks, setRemoteTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftConfig, setDraftConfig] = useState<TasksConfig>(config);

  const provider = config.provider;
  const isLocal = provider === "local";
  const openCount = isLocal
    ? data.items.filter((i) => !i.done).length
    : remoteTasks.filter((i) => !i.done).length;

  const refresh = useCallback(
    async (override?: TasksConfig) => {
      const cfg = override ?? config;
      if (cfg.provider === "local") {
        setRemoteTasks([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const tasks = await fetchTasks(cfg);
        setRemoteTasks(tasks ?? []);
      } catch (e) {
        if (e instanceof TasksError) setError(e.message);
        else setError("Something went wrong fetching tasks.");
      } finally {
        setLoading(false);
      }
    },
    [config]
  );

  useEffect(() => {
    if (isLocal) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, isLocal]);

  useEffect(() => {
    setDraftConfig(config);
  }, [config]);

  useEffect(() => {
    if (data.provider !== provider) {
      onChange({ ...data, provider });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  function saveConfig() {
    const next: TasksConfig = {
      ...draftConfig,
      provider: draftConfig.provider,
      todoistToken: draftConfig.todoistToken.trim(),
      trelloKey: draftConfig.trelloKey.trim(),
      trelloToken: draftConfig.trelloToken.trim(),
      trelloListId: draftConfig.trelloListId.trim(),
      asanaToken: draftConfig.asanaToken.trim(),
      asanaWorkspace: draftConfig.asanaWorkspace.trim(),
      googleAccessToken: draftConfig.googleAccessToken?.trim() ?? "",
      googleTaskListId: draftConfig.googleTaskListId?.trim() ?? "",
    };
    setConfig(next);
    setSettingsOpen(false);
    void refresh(next);
  }

  function addLocalItem() {
    const text = draft.trim();
    if (!text) return;
    onChange({
      ...data,
      items: [...data.items, { id: uid(), text, done: false }],
      provider,
    });
    setDraft("");
  }

  function toggleLocal(id: string) {
    onChange({
      ...data,
      items: data.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
      provider,
    });
  }

  function removeLocal(id: string) {
    onChange({
      ...data,
      items: data.items.filter((i) => i.id !== id),
      provider,
    });
  }

  async function completeRemote(task: TaskItem) {
    setError(null);
    try {
      await completeTask(config, task.id);
      setRemoteTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (e) {
      if (e instanceof TasksError) setError(e.message);
      else setError("Couldn't mark that task complete.");
    }
  }

  return (
    <Panel
      title="Tasks"
      icon={<ListTodo className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        openCount > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac normal-case tracking-normal">
            {openCount} open
          </span>
        ) : null
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {settingsOpen ? "Done" : "Setup"}
          </button>
          {!isLocal ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
              className="h-7 gap-1.5 px-2 text-xs"
              aria-label="Refresh tasks"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
          ) : null}
          {menu}
        </>
      }
    >
      {settingsOpen && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-black/5 bg-black/[0.03] p-3 dark:border-white/5 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] text-muted-foreground">Provider</Label>
            <Select
              value={draftConfig.provider}
              onValueChange={(value) =>
                setDraftConfig((c) => ({ ...c, provider: value as TaskProvider }))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVIDER_LABEL) as TaskProvider[]).map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {PROVIDER_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draftConfig.provider === "todoist" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="todoist-token" className="text-[11px] text-muted-foreground">
                Todoist API token
              </Label>
              <Input
                id="todoist-token"
                type="password"
                value={draftConfig.todoistToken}
                onChange={(e) => setDraftConfig((c) => ({ ...c, todoistToken: e.target.value }))}
                placeholder="Bearer token…"
                className="h-8 text-xs"
                autoComplete="off"
              />
            </div>
          )}

          {draftConfig.provider === "trello" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trello-key" className="text-[11px] text-muted-foreground">
                  Trello API key
                </Label>
                <Input
                  id="trello-key"
                  type="password"
                  value={draftConfig.trelloKey}
                  onChange={(e) => setDraftConfig((c) => ({ ...c, trelloKey: e.target.value }))}
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trello-token" className="text-[11px] text-muted-foreground">
                  Trello token
                </Label>
                <Input
                  id="trello-token"
                  type="password"
                  value={draftConfig.trelloToken}
                  onChange={(e) => setDraftConfig((c) => ({ ...c, trelloToken: e.target.value }))}
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trello-list" className="text-[11px] text-muted-foreground">
                  List ID
                </Label>
                <Input
                  id="trello-list"
                  value={draftConfig.trelloListId}
                  onChange={(e) => setDraftConfig((c) => ({ ...c, trelloListId: e.target.value }))}
                  placeholder="Trello list GID…"
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {draftConfig.provider === "asana" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asana-token" className="text-[11px] text-muted-foreground">
                  Asana personal access token
                </Label>
                <Input
                  id="asana-token"
                  type="password"
                  value={draftConfig.asanaToken}
                  onChange={(e) => setDraftConfig((c) => ({ ...c, asanaToken: e.target.value }))}
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asana-workspace" className="text-[11px] text-muted-foreground">
                  Workspace GID
                </Label>
                <Input
                  id="asana-workspace"
                  value={draftConfig.asanaWorkspace}
                  onChange={(e) => setDraftConfig((c) => ({ ...c, asanaWorkspace: e.target.value }))}
                  placeholder="Workspace GID…"
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {draftConfig.provider === "google" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="google-token" className="text-[11px] text-muted-foreground">
                  Google OAuth access token
                </Label>
                <Input
                  id="google-token"
                  type="password"
                  value={draftConfig.googleAccessToken ?? ""}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, googleAccessToken: e.target.value }))
                  }
                  placeholder="From OAuth Playground · tasks scope"
                  className="h-8 text-xs"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="google-list" className="text-[11px] text-muted-foreground">
                  Task list ID (optional)
                </Label>
                <Input
                  id="google-list"
                  value={draftConfig.googleTaskListId ?? ""}
                  onChange={(e) =>
                    setDraftConfig((c) => ({ ...c, googleTaskListId: e.target.value }))
                  }
                  placeholder="@default"
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button type="button" size="sm" className="h-8" onClick={saveConfig}>
              Save
            </Button>
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            Tokens stay in this browser only. Local mode keeps a checklist here on the new tab.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLocal ? (
        <>
          <form
            className="mb-2 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              addLocalItem();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a task…"
              className="h-8 flex-1 border-black/8 bg-black/[0.03] text-sm dark:border-white/10 dark:bg-white/[0.04]"
              aria-label="New task"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5" disabled={!draft.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {data.items.length === 0 ? (
              <ModuleEmpty
                icon={ListTodo}
                title="Nothing on the list"
                hint="Local tasks live in this module. Switch provider in Setup to sync Todoist, Trello, or Asana."
              />
            ) : (
              <ul className="flex flex-col gap-0.5">
                {data.items.map((item) => (
                  <li
                    key={item.id}
                    className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleLocal(item.id)}
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        item.done
                          ? "border-ac bg-ac text-white"
                          : "border-black/20 dark:border-white/25"
                      )}
                      aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                      aria-pressed={item.done}
                    >
                      {item.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                    </button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-sm leading-snug",
                        item.done && "text-muted-foreground line-through"
                      )}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLocal(item.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label="Remove task"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && remoteTasks.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
            </p>
          ) : remoteTasks.length === 0 ? (
            <ModuleEmpty
              icon={ListTodo}
              title="Inbox clear"
              hint={`No open tasks from ${PROVIDER_LABEL[provider]} right now.`}
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void refresh()}
                  disabled={loading}
                >
                  <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
                  Refresh
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {remoteTasks.map((task) => (
                <li
                  key={task.id}
                  className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <button
                    type="button"
                    onClick={() => void completeRemote(task)}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-black/20 transition-colors hover:border-ac dark:border-white/25"
                    aria-label="Mark complete"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm leading-snug">{task.title}</span>
                  {task.url ? (
                    <a
                      {...fastLinkProps(task.url, { newTab: true })}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label="Open task"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
