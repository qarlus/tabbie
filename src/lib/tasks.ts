export type TaskProvider = "local" | "todoist" | "trello" | "asana" | "google";

export interface TaskItem {
  id: string;
  title: string;
  url?: string;
  done: boolean;
}

export interface TasksConfig {
  provider: TaskProvider;
  todoistToken: string;
  trelloKey: string;
  trelloToken: string;
  trelloListId: string;
  asanaToken: string;
  asanaWorkspace: string;
  /** Google OAuth access token with tasks scope (paste from OAuth Playground). */
  googleAccessToken: string;
  /** Optional Google Tasks list id; empty = @default. */
  googleTaskListId: string;
}

export const DEFAULT_TASKS_CONFIG: TasksConfig = {
  provider: "local",
  todoistToken: "",
  trelloKey: "",
  trelloToken: "",
  trelloListId: "",
  asanaToken: "",
  asanaWorkspace: "",
  googleAccessToken: "",
  googleTaskListId: "",
};

export class TasksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TasksError";
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function trelloParams(config: TasksConfig): string {
  const key = config.trelloKey.trim();
  const token = config.trelloToken.trim();
  return `key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
}

export async function fetchTasks(config: TasksConfig): Promise<TaskItem[] | null> {
  const cfg: TasksConfig = { ...DEFAULT_TASKS_CONFIG, ...config };
  if (cfg.provider === "local") return null;
  switch (cfg.provider) {
    case "todoist":
      return fetchTodoistTasks(cfg);
    case "trello":
      return fetchTrelloTasks(cfg);
    case "asana":
      return fetchAsanaTasks(cfg);
    case "google":
      return fetchGoogleTasks(cfg);
    default:
      return null;
  }
}

async function fetchTodoistTasks(config: TasksConfig): Promise<TaskItem[]> {
  const token = config.todoistToken.trim();
  if (!token) throw new TasksError("Add a Todoist API token to continue.");

  let res: Response;
  try {
    res = await fetch("https://api.todoist.com/rest/v2/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new TasksError("Couldn't reach Todoist. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Todoist rejected that API token.");
  }
  if (!res.ok) {
    throw new TasksError(`Todoist returned ${res.status}. Try again in a moment.`);
  }

  const json = (await readJson(res)) as Array<{ id: string; content: string; url: string }> | null;
  if (!Array.isArray(json)) throw new TasksError("Unexpected response from Todoist.");

  return json.map((task) => ({
    id: task.id,
    title: task.content,
    url: task.url,
    done: false,
  }));
}

async function fetchTrelloTasks(config: TasksConfig): Promise<TaskItem[]> {
  const listId = config.trelloListId.trim();
  const key = config.trelloKey.trim();
  const token = config.trelloToken.trim();
  if (!listId || !key || !token) {
    throw new TasksError("Add Trello key, token, and list ID to continue.");
  }

  let res: Response;
  try {
    res = await fetch(
      `https://api.trello.com/1/lists/${encodeURIComponent(listId)}/cards?${trelloParams(config)}`
    );
  } catch {
    throw new TasksError("Couldn't reach Trello. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Trello rejected those credentials.");
  }
  if (!res.ok) {
    throw new TasksError(`Trello returned ${res.status}. Try again in a moment.`);
  }

  const json = (await readJson(res)) as Array<{ id: string; name: string; shortUrl?: string; url?: string }> | null;
  if (!Array.isArray(json)) throw new TasksError("Unexpected response from Trello.");

  return json.map((card) => ({
    id: card.id,
    title: card.name,
    url: card.shortUrl || card.url,
    done: false,
  }));
}

async function fetchAsanaTasks(config: TasksConfig): Promise<TaskItem[]> {
  const token = config.asanaToken.trim();
  const workspace = config.asanaWorkspace.trim();
  if (!token) throw new TasksError("Add an Asana personal access token to continue.");
  if (!workspace) throw new TasksError("Add an Asana workspace GID to continue.");

  const params = new URLSearchParams({
    assignee: "me",
    workspace,
    completed_since: "now",
    opt_fields: "name,permalink_url,completed",
  });

  let res: Response;
  try {
    res = await fetch(`https://app.asana.com/api/1.0/tasks?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new TasksError("Couldn't reach Asana. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Asana rejected that access token.");
  }
  if (!res.ok) {
    throw new TasksError(`Asana returned ${res.status}. Try again in a moment.`);
  }

  const json = (await readJson(res)) as {
    data?: Array<{ gid: string; name: string; permalink_url?: string; completed?: boolean }>;
  } | null;
  const rows = json?.data;
  if (!Array.isArray(rows)) throw new TasksError("Unexpected response from Asana.");

  return rows
    .filter((task) => !task.completed)
    .map((task) => ({
      id: task.gid,
      title: task.name,
      url: task.permalink_url,
      done: false,
    }));
}

async function fetchGoogleTasks(config: TasksConfig): Promise<TaskItem[]> {
  const token = config.googleAccessToken.trim();
  if (!token) throw new TasksError("Add a Google OAuth access token (tasks scope) to continue.");

  const listId = config.googleTaskListId.trim() || "@default";
  const params = new URLSearchParams({ showCompleted: "false", maxResults: "40" });

  let res: Response;
  try {
    res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    throw new TasksError("Couldn't reach Google Tasks. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Google rejected that access token. Tokens expire — refresh in OAuth Playground.");
  }
  if (!res.ok) {
    throw new TasksError(`Google Tasks returned ${res.status}. Try again in a moment.`);
  }

  const json = (await readJson(res)) as {
    items?: Array<{ id?: string; title?: string; status?: string; selfLink?: string }>;
  } | null;
  const rows = json?.items ?? [];
  return rows
    .filter((t) => t.id && t.title && t.status !== "completed")
    .map((t) => ({
      id: t.id!,
      title: t.title!,
      url: `https://tasks.google.com/embed/?origin=https://mail.google.com&fullWidth=1`,
      done: false,
    }));
}

export async function completeTask(config: TasksConfig, taskId: string): Promise<void> {
  if (config.provider === "local") return;

  switch (config.provider) {
    case "todoist":
      return completeTodoistTask(config, taskId);
    case "trello":
      return completeTrelloTask(config, taskId);
    case "asana":
      return completeAsanaTask(config, taskId);
    case "google":
      return completeGoogleTask(config, taskId);
  }
}

async function completeGoogleTask(config: TasksConfig, taskId: string): Promise<void> {
  const token = config.googleAccessToken.trim();
  if (!token) throw new TasksError("Add a Google OAuth access token to continue.");
  const listId = config.googleTaskListId.trim() || "@default";

  let res: Response;
  try {
    res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      }
    );
  } catch {
    throw new TasksError("Couldn't reach Google Tasks. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Google rejected that access token.");
  }
  if (!res.ok) {
    throw new TasksError(`Google Tasks returned ${res.status}. Try again in a moment.`);
  }
}

async function completeTodoistTask(config: TasksConfig, taskId: string): Promise<void> {
  const token = config.todoistToken.trim();
  if (!token) throw new TasksError("Add a Todoist API token to continue.");

  let res: Response;
  try {
    res = await fetch(`https://api.todoist.com/rest/v2/tasks/${encodeURIComponent(taskId)}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new TasksError("Couldn't reach Todoist. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Todoist rejected that API token.");
  }
  if (!res.ok && res.status !== 204) {
    throw new TasksError(`Todoist returned ${res.status}. Try again in a moment.`);
  }
}

async function completeTrelloTask(config: TasksConfig, taskId: string): Promise<void> {
  const key = config.trelloKey.trim();
  const token = config.trelloToken.trim();
  if (!key || !token) throw new TasksError("Add Trello key and token to continue.");

  let res: Response;
  try {
    res = await fetch(
      `https://api.trello.com/1/cards/${encodeURIComponent(taskId)}?closed=true&${trelloParams(config)}`,
      { method: "PUT" }
    );
  } catch {
    throw new TasksError("Couldn't reach Trello. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Trello rejected those credentials.");
  }
  if (!res.ok) {
    throw new TasksError(`Trello returned ${res.status}. Try again in a moment.`);
  }
}

async function completeAsanaTask(config: TasksConfig, taskId: string): Promise<void> {
  const token = config.asanaToken.trim();
  if (!token) throw new TasksError("Add an Asana personal access token to continue.");

  let res: Response;
  try {
    res = await fetch(`https://app.asana.com/api/1.0/tasks/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { completed: true } }),
    });
  } catch {
    throw new TasksError("Couldn't reach Asana. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new TasksError("Asana rejected that access token.");
  }
  if (!res.ok) {
    throw new TasksError(`Asana returned ${res.status}. Try again in a moment.`);
  }
}
