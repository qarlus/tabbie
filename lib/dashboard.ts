export type Theme = "system" | "light" | "dark"

export type Settings = {
  name: string
  githubUsername: string
  githubToken: string
  theme: Theme
}

export type Shortcut = { id: string; name: string; url: string }
export type Todo = { id: string; text: string; completed: boolean }

export type GithubItem = {
  id: string
  title: string
  repository: string
  number?: number
  updatedAt: string
  url: string
  type: "pull" | "issue" | "notification"
  state?: string
}

export type GithubData = {
  pulls: GithubItem[]
  issues: GithubItem[]
  notifications: GithubItem[]
  counts: { pulls: number; issues: number; notifications: number }
}

export const defaults = {
  settings: { name: "Jordien", githubUsername: "", githubToken: "", theme: "system" as Theme },
  shortcuts: [
    { id: "1", name: "Calendar", url: "https://calendar.google.com" },
    { id: "2", name: "Linear", url: "https://linear.app" },
    { id: "3", name: "Vercel", url: "https://vercel.com/dashboard" },
  ],
  repos: [
    { id: "1", name: "Next.js", url: "https://github.com/vercel/next.js" },
    { id: "2", name: "shadcn/ui", url: "https://github.com/shadcn-ui/ui" },
  ],
  todos: [
    { id: "1", text: "Review open pull requests", completed: false },
    { id: "2", text: "Plan today’s focus", completed: false },
  ],
}

export function safeUrl(value: string) {
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const parsed = new URL(normalized)
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : ""
  } catch {
    return ""
  }
}
