import { NextRequest, NextResponse } from "next/server"

type GithubItem = {
  id: string
  title: string
  repository: string
  number?: number
  updatedAt: string
  url: string
  type: "pull" | "issue" | "notification"
  state?: string
}

const headersFor = (token?: string | null) => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim()
  const token = request.headers.get("x-github-token")

  if (!username) {
    return NextResponse.json({ error: "Add a GitHub username in settings." }, { status: 400 })
  }

  try {
    const query = encodeURIComponent(`author:${username} created:>=${new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)}`)
    const [pullResponse, issueResponse, notificationResponse, organizationResponse] = await Promise.all([
      fetch(`https://api.github.com/search/issues?q=${query}+type:pr&sort=updated&per_page=20`, { headers: headersFor(token), cache: "no-store" }),
      fetch(`https://api.github.com/search/issues?q=${query}+type:issue&sort=updated&per_page=20`, { headers: headersFor(token), cache: "no-store" }),
      token ? fetch("https://api.github.com/notifications?all=false&participating=false&per_page=20", { headers: headersFor(token), cache: "no-store" }) : null,
      fetch(token ? "https://api.github.com/user/orgs?per_page=100" : `https://api.github.com/users/${encodeURIComponent(username)}/orgs?per_page=100`, { headers: headersFor(token), cache: "no-store" }),
    ])

    if (!pullResponse.ok || !issueResponse.ok) {
      const failed = !pullResponse.ok ? pullResponse : issueResponse
      return NextResponse.json({ error: failed.status === 403 ? "GitHub rate limit reached. Add a token or try again later." : "GitHub could not load this account." }, { status: failed.status })
    }

    const [pullData, issueData, notificationData, organizationData] = await Promise.all([
      pullResponse.json(),
      issueResponse.json(),
      notificationResponse?.ok ? notificationResponse.json() : Promise.resolve([]),
      organizationResponse.ok ? organizationResponse.json() : Promise.resolve([]),
    ])

    const normalizeSearch = (item: Record<string, unknown>, type: "pull" | "issue"): GithubItem => {
      const repositoryUrl = String(item.repository_url ?? "")
      return {
        id: `${type}-${item.id}`,
        title: String(item.title),
        repository: repositoryUrl.split("/repos/")[1] ?? "GitHub",
        number: Number(item.number),
        updatedAt: String(item.updated_at),
        url: String(item.html_url),
        type,
        state: String(item.state),
      }
    }

    const notifications: GithubItem[] = (notificationData as Record<string, unknown>[]).map((item) => {
      const subject = item.subject as Record<string, unknown>
      const repo = item.repository as Record<string, unknown>
      return {
        id: `notification-${item.id}`,
        title: String(subject.title),
        repository: String(repo.full_name),
        updatedAt: String(item.updated_at),
        url: String(repo.html_url),
        type: "notification",
      }
    })

    return NextResponse.json({
      pulls: (pullData.items as Record<string, unknown>[]).map((item) => normalizeSearch(item, "pull")),
      issues: (issueData.items as Record<string, unknown>[]).map((item) => normalizeSearch(item, "issue")),
      notifications,
      organizations: (organizationData as Record<string, unknown>[]).map((organization) => ({
        login: String(organization.login),
        avatarUrl: String(organization.avatar_url),
        url: String(organization.html_url),
        description: organization.description ? String(organization.description) : undefined,
      })),
      counts: { pulls: pullData.total_count, issues: issueData.total_count, notifications: notifications.length },
    })
  } catch {
    return NextResponse.json({ error: "Unable to reach GitHub. Check your connection and try again." }, { status: 502 })
  }
}
