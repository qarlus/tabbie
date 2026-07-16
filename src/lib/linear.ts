export class LinearError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinearError";
  }
}

export interface LinearConfig {
  token: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  priority: number;
  state: string;
  stateType: string;
  updatedAt: number;
}

export interface LinearCache {
  fetchedAt: number;
  viewerName: string;
  issues: LinearIssue[];
}

const QUERY = `
  query AssignedIssues {
    viewer {
      name
      displayName
      assignedIssues(
        first: 40
        filter: { state: { type: { nin: ["completed", "canceled"] } } }
      ) {
        nodes {
          id
          identifier
          title
          url
          priority
          updatedAt
          state {
            name
            type
          }
        }
      }
    }
  }
`;

interface LinearGqlResponse {
  data?: {
    viewer?: {
      name?: string;
      displayName?: string;
      assignedIssues?: {
        nodes?: Array<{
          id: string;
          identifier: string;
          title: string;
          url: string;
          priority: number;
          updatedAt: string;
          state?: { name?: string; type?: string };
        }>;
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

export async function fetchLinear(config: LinearConfig): Promise<LinearCache> {
  const token = config.token.trim();
  if (!token) throw new LinearError("Add a Linear personal API key to continue.");

  let res: Response;
  try {
    res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ query: QUERY }),
    });
  } catch {
    throw new LinearError("Couldn't reach Linear. Check your connection.");
  }

  if (res.status === 401 || res.status === 403) {
    throw new LinearError("Linear rejected that API key.");
  }
  if (!res.ok) {
    throw new LinearError(`Linear returned ${res.status}. Try again in a moment.`);
  }

  const json = (await res.json()) as LinearGqlResponse;
  if (json.errors?.length) {
    throw new LinearError(json.errors[0]?.message || "Linear GraphQL error.");
  }

  const viewer = json.data?.viewer;
  if (!viewer) throw new LinearError("Unexpected response from Linear.");

  const issues: LinearIssue[] = (viewer.assignedIssues?.nodes ?? []).map((n) => ({
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    url: n.url,
    priority: n.priority ?? 0,
    state: n.state?.name ?? "Unknown",
    stateType: n.state?.type ?? "",
    updatedAt: Date.parse(n.updatedAt) || 0,
  }));

  issues.sort((a, b) => {
    if (a.priority !== b.priority) {
      // Linear: 0 = none, 1 = urgent … 4 = low — show urgent first, then none last
      const ap = a.priority === 0 ? 99 : a.priority;
      const bp = b.priority === 0 ? 99 : b.priority;
      return ap - bp;
    }
    return b.updatedAt - a.updatedAt;
  });

  return {
    fetchedAt: Date.now(),
    viewerName: viewer.displayName || viewer.name || "You",
    issues,
  };
}
