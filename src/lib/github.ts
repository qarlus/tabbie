import type { GithubCache, GithubConfig, GithubItem } from "./types";

const API = "https://api.github.com";

export class GithubError extends Error {
  kind: "auth" | "rate-limit" | "offline" | "http";
  constructor(kind: GithubError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

function headers(token: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function check(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) throw new GithubError("auth", "GitHub rejected the token. Check it and try again.");
  if (res.status === 403 || res.status === 429)
    throw new GithubError("rate-limit", "GitHub rate limit reached. Try again later, or add a token for a higher limit.");
  throw new GithubError("http", `GitHub returned an error (HTTP ${res.status}).`);
}

interface SearchResultItem {
  id: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: string;
  number: number;
  updated_at: string;
  pull_request?: unknown;
}

interface NotificationItem {
  id: string;
  reason: string;
  updated_at: string;
  subject: { title: string; url: string | null; type: string };
  repository: { full_name: string; html_url: string };
}

interface RepoListItem {
  full_name: string;
  private: boolean;
}

interface WorkflowRun {
  id: number;
  name: string;
  display_title?: string;
  html_url: string;
  status: string;
  conclusion: string | null;
  head_branch: string | null;
  event: string;
  updated_at: string;
  run_started_at?: string | null;
  repository?: { full_name: string };
}

function repoName(repositoryUrl: string): string {
  const parts = repositoryUrl.split("/");
  return parts.slice(-2).join("/");
}

function mapSearchItem(item: SearchResultItem, kind: "pr" | "issue"): GithubItem {
  return {
    id: item.id,
    title: item.title,
    url: item.html_url,
    repo: repoName(item.repository_url),
    state: item.state,
    number: item.number,
    kind,
    updatedAt: item.updated_at,
  };
}

function mapWorkflowRun(run: WorkflowRun, fallbackRepo: string): GithubItem {
  const status = run.status === "completed" ? run.conclusion || "completed" : run.status;
  const title = run.display_title?.trim() || run.name;
  const branch = run.head_branch ? `@ ${run.head_branch}` : run.event;
  return {
    id: run.id,
    title,
    url: run.html_url,
    repo: run.repository?.full_name || fallbackRepo,
    state: status,
    kind: "action",
    updatedAt: run.updated_at || run.run_started_at || new Date().toISOString(),
    detail: branch,
  };
}

/** Convert a GitHub API URL (api.github.com/repos/...) to a web URL. */
function apiToWebUrl(apiUrl: string | null, fallback: string): string {
  if (!apiUrl) return fallback;
  return apiUrl
    .replace("https://api.github.com/repos/", "https://github.com/")
    .replace(/\/pulls\/(\d+)$/, "/pull/$1")
    .replace(/\/issues\/(\d+)$/, "/issues/$1");
}

function isActiveRun(state: string): boolean {
  return state === "queued" || state === "in_progress" || state === "waiting" || state === "pending" || state === "requested";
}

async function fetchActions(token: string, seedRepos: string[]): Promise<GithubItem[]> {
  if (!token) return [];

  const hdrs = headers(token);
  const repoSet = new Set(seedRepos.filter(Boolean));

  try {
    const reposRes = await fetch(
      `${API}/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member`,
      { headers: hdrs }
    );
    if (reposRes.ok) {
      const repos = (await reposRes.json()) as RepoListItem[];
      for (const r of repos) repoSet.add(r.full_name);
    }
  } catch {
    // Fall through with seed repos only.
  }

  // Check Actions across every known repo (UI list scrolls; keep API work bounded).
  const repos = [...repoSet].slice(0, 40);
  if (repos.length === 0) return [];

  const batches = await Promise.all(
    repos.map(async (fullName) => {
      const [owner, name] = fullName.split("/");
      if (!owner || !name) return [] as GithubItem[];
      try {
        const res = await fetch(`${API}/repos/${owner}/${name}/actions/runs?per_page=6`, { headers: hdrs });
        if (!res.ok) return [];
        const data = (await res.json()) as { workflow_runs?: WorkflowRun[] };
        return (data.workflow_runs ?? []).map((run) => mapWorkflowRun(run, fullName));
      } catch {
        return [];
      }
    })
  );

  const byId = new Map<number, GithubItem>();
  for (const item of batches.flat()) byId.set(item.id, item);
  const items = [...byId.values()];
  items.sort((a, b) => {
    const aActive = isActiveRun(a.state) ? 0 : 1;
    const bActive = isActiveRun(b.state) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
  return items.slice(0, 40);
}

export async function fetchGithub(config: GithubConfig): Promise<GithubCache> {
  const username = config.username.trim();
  if (!username) throw new GithubError("http", "No GitHub username configured.");

  const token = config.token.trim();
  const hdrs = headers(token);

  // Encode the full query — don't append unencoded fragments after encodeURIComponent.
  const prQuery = encodeURIComponent(`author:${username} type:pr`);
  const issueQuery = encodeURIComponent(`author:${username} type:issue`);

  let prRes: Response;
  let issueRes: Response;
  try {
    [prRes, issueRes] = await Promise.all([
      fetch(`${API}/search/issues?q=${prQuery}&sort=updated&per_page=100`, { headers: hdrs }),
      fetch(`${API}/search/issues?q=${issueQuery}&sort=updated&per_page=100`, { headers: hdrs }),
    ]);
  } catch {
    throw new GithubError("offline", "Couldn't reach GitHub. You may be offline — showing the last saved data.");
  }
  await check(prRes);
  await check(issueRes);

  const prData = (await prRes.json()) as { items?: SearchResultItem[]; total_count?: number };
  const issueData = (await issueRes.json()) as { items?: SearchResultItem[]; total_count?: number };

  const prById = new Map<number, GithubItem>();
  for (const i of prData.items ?? []) prById.set(i.id, mapSearchItem(i, "pr"));

  // With a token, also pull PRs the user is involved in (reviews, assignments) — not only authored.
  if (token) {
    try {
      const involvesQuery = encodeURIComponent(`involves:${username} type:pr`);
      const involvesRes = await fetch(
        `${API}/search/issues?q=${involvesQuery}&sort=updated&per_page=100`,
        { headers: hdrs }
      );
      if (involvesRes.ok) {
        const involvesData = (await involvesRes.json()) as { items?: SearchResultItem[] };
        for (const i of involvesData.items ?? []) {
          if (!prById.has(i.id)) prById.set(i.id, mapSearchItem(i, "pr"));
        }
      }
    } catch {
      // Optional enrichment — authored results still apply.
    }
  }

  const prs = [...prById.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );
  const issues = (issueData.items ?? []).map((i) => mapSearchItem(i, "issue"));

  let notifications: GithubItem[] = [];
  if (token) {
    try {
      const notifRes = await fetch(`${API}/notifications?per_page=50&all=false`, { headers: hdrs });
      await check(notifRes);
      const notifData = (await notifRes.json()) as NotificationItem[];
      notifications = notifData.map((n) => ({
        id: Number(n.id.replace(/\D/g, "").slice(0, 12)) || Math.abs(hashCode(n.id)),
        title: n.subject.title,
        url: apiToWebUrl(n.subject.url, n.repository.html_url),
        repo: n.repository.full_name,
        state: n.reason,
        kind: "notification" as const,
        updatedAt: n.updated_at,
      }));
    } catch (e) {
      if (e instanceof GithubError) throw e;
      throw new GithubError("offline", "Couldn't reach GitHub. You may be offline — showing the last saved data.");
    }
  }

  const seedRepos = [
    ...prs.map((p) => p.repo),
    ...issues.map((i) => i.repo),
    ...notifications.map((n) => n.repo),
  ];
  const actions = token ? await fetchActions(token, seedRepos) : [];

  return {
    fetchedAt: Date.now(),
    prs,
    issues,
    notifications,
    actions,
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** "just now", "5m ago", "2h ago", "3d ago" */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isActionRunning(state: string): boolean {
  return state === "queued" || state === "in_progress" || state === "waiting" || state === "pending" || state === "requested";
}
