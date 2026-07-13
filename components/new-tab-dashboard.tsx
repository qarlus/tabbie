"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import {
  Bell, ChevronRight, CircleDot, Code2, ExternalLink, GripVertical, Moon,
  Plus, RefreshCw, Search, Settings2, Sun, Trash2, X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { defaults, GithubData, GithubItem, safeUrl, Settings, Shortcut, Todo } from "@/lib/dashboard"

const STORAGE = "devtab:v1:"

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(STORAGE + key)
    return value ? JSON.parse(value) : fallback
  } catch { return fallback }
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState(fallback)
  const [ready, setReady] = useState(false)
  useEffect(() => { setValue(readStored(key, fallback)); setReady(true) }, [key, fallback])
  useEffect(() => { if (ready) localStorage.setItem(STORAGE + key, JSON.stringify(value)) }, [key, ready, value])
  return [value, setValue] as const
}

function relativeTime(date: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3600000))
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function SiteIcon({ url }: { url: string }) {
  let letter = "W"
  try { letter = new URL(url).hostname.replace("www.", "").charAt(0).toUpperCase() } catch {}
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs font-semibold text-secondary-foreground">{letter}</span>
}

function LinkEditor({ title, items, onChange, repo = false }: { title: string; items: Shortcut[]; onChange: (items: Shortcut[]) => void; repo?: boolean }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const add = (event: FormEvent) => {
    event.preventDefault(); const valid = safeUrl(url); if (!name.trim() || !valid) return
    onChange([...items, { id: crypto.randomUUID(), name: name.trim(), url: valid }]); setName(""); setUrl(""); setOpen(false)
  }
  return <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">{title}</h2><Button variant="ghost" size="xs" onClick={() => setOpen(true)}><Plus data-icon="inline-start" />Add</Button></div>
    <div className="flex flex-col gap-2">
      {items.map((item) => <div key={item.id} className="group flex items-center gap-2 rounded-xl border bg-card p-2 shadow-xs transition-colors hover:bg-accent">
        <GripVertical className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        {repo ? <Code2 className="size-5 shrink-0" aria-hidden="true" /> : <SiteIcon url={item.url} />}
        <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</a>
        <Button variant="ghost" size="icon-xs" aria-label={`Delete ${item.name}`} onClick={() => onChange(items.filter((x) => x.id !== item.id))}><X /></Button>
      </div>)}
    </div>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add {repo ? "repository" : "shortcut"}</DialogTitle><DialogDescription>Add a name and full web address.</DialogDescription></DialogHeader>
      <form onSubmit={add} className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-medium">Name<Input value={name} onChange={(e) => setName(e.target.value)} placeholder={repo ? "My repository" : "Calendar"} autoFocus /></label><label className="flex flex-col gap-2 text-sm font-medium">URL<Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></label><DialogFooter><Button type="submit">Add</Button></DialogFooter></form>
    </DialogContent></Dialog>
  </section>
}

function ActivityList({ items, empty }: { items: GithubItem[]; empty: string }) {
  if (!items.length) return <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center"><CircleDot className="size-6 text-muted-foreground" /><p className="text-sm font-medium">{empty}</p><p className="text-xs text-muted-foreground">New activity will appear here.</p></div>
  return <div className="divide-y">{items.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 p-4 transition-colors hover:bg-accent">
    <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">{item.type === "notification" ? <Bell className="size-4" /> : <Code2 className="size-4" />}</span>
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{item.repository}{item.number ? ` #${item.number}` : ""} · Updated {relativeTime(item.updatedAt)}</span></span><ExternalLink className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
  </a>)}</div>
}

export function NewTabDashboard() {
  const [settings, setSettings] = useStoredState<Settings>("settings", defaults.settings)
  const [shortcuts, setShortcuts] = useStoredState<Shortcut[]>("shortcuts", defaults.shortcuts)
  const [repos, setRepos] = useStoredState<Shortcut[]>("repos", defaults.repos)
  const [todos, setTodos] = useStoredState<Todo[]>("todos", defaults.todos)
  const [now, setNow] = useState<Date | null>(null)
  const [query, setQuery] = useState("")
  const [newTodo, setNewTodo] = useState("")
  const [data, setData] = useState<Code2Data | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark")
    if (settings.theme !== "system") document.documentElement.classList.add(settings.theme)
  }, [settings.theme])

  const loadGithub = async () => {
    if (!settings.githubUsername) { setData(null); return }
    setLoading(true); setError("")
    try {
      const response = await fetch(`/api/github?username=${encodeURIComponent(settings.githubUsername)}`, { headers: settings.githubToken ? { "x-github-token": settings.githubToken } : {} })
      const result = await response.json(); if (!response.ok) throw new Error(result.error)
      setData(result)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "GitHub data could not be loaded.") } finally { setLoading(false) }
  }
  useEffect(() => { void loadGithub() }, [settings.githubUsername, settings.githubToken])

  const greeting = useMemo(() => { const hour = now?.getHours() ?? 12; return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening" }, [now])
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (query.trim()) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}` }
  const addTodo = (event: FormEvent) => { event.preventDefault(); if (!newTodo.trim()) return; setTodos([...todos, { id: crypto.randomUUID(), text: newTodo.trim(), completed: false }]); setNewTodo("") }
  const stats = data?.counts ?? { pulls: 0, issues: 0, notifications: 0 }

  return <main className="min-h-screen bg-background">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="flex items-center justify-between"><div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-widest text-muted-foreground"><span className="size-2 rounded-full bg-primary" />DEVTAB</div><div className="flex items-center gap-1"><span className="hidden font-mono text-xs text-muted-foreground sm:inline">{now?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</span><Button variant="ghost" size="icon-sm" aria-label="Toggle theme" onClick={() => setSettings({ ...settings, theme: settings.theme === "dark" ? "light" : "dark" })}>{settings.theme === "dark" ? <Sun /> : <Moon />}</Button><Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open settings"><Settings2 /></Button>} /><DialogContent><DialogHeader><DialogTitle>Dashboard settings</DialogTitle><DialogDescription>Personalize this browser. Your token stays in local storage on this device.</DialogDescription></DialogHeader><div className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-medium">Display name<Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} /></label><label className="flex flex-col gap-2 text-sm font-medium">GitHub username<Input value={settings.githubUsername} onChange={(e) => setSettings({ ...settings, githubUsername: e.target.value })} placeholder="octocat" /></label><label className="flex flex-col gap-2 text-sm font-medium">Personal access token <span className="font-normal text-muted-foreground">Optional, needed for private notifications</span><Input type="password" value={settings.githubToken} onChange={(e) => setSettings({ ...settings, githubToken: e.target.value })} placeholder="github_pat_…" autoComplete="off" /></label><label className="flex flex-col gap-2 text-sm font-medium">Theme<select className="h-9 rounded-lg border bg-background px-3 text-sm" value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value as Settings["theme"] })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div><DialogFooter><Button variant="outline" onClick={() => { Object.keys(defaults).forEach((key) => localStorage.removeItem(STORAGE + key)); location.reload() }}>Reset dashboard</Button><Button onClick={() => setSettingsOpen(false)}>Done</Button></DialogFooter></DialogContent></Dialog></div></header>

      <section className="flex flex-col gap-5 border-b pb-8"><div className="flex flex-col gap-1"><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{now?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) ?? "Today"}</p><h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{greeting}, {settings.name || "there"}.</h1></div><form onSubmit={submitSearch} className="relative max-w-2xl"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-12 rounded-xl bg-card pl-11 pr-20 shadow-xs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the web…" aria-label="Search the web" /><kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">ENTER</kbd></form></section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
        <section className="flex min-w-0 flex-col gap-4"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">GitHub activity</h2><p className="text-xs text-muted-foreground">Your work from the last 7 days</p></div><Button variant="outline" size="sm" onClick={loadGithub} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} data-icon="inline-start" />Refresh</Button></div>
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border bg-card shadow-xs">{[["Pull requests", stats.pulls], ["Issues", stats.issues], ["Notifications", stats.notifications]].map(([label, value], index) => <div key={String(label)} className={index ? "border-l p-4" : "p-4"}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-mono text-xl font-semibold">{value}</p></div>)}</div>
          {!settings.githubUsername ? <Card><CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 text-center"><span className="flex size-12 items-center justify-center rounded-xl bg-secondary"><Code2 className="size-6" /></span><div><h3 className="font-semibold">Connect your GitHub view</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">Add your username to see pull requests and issues. A token is only needed for notifications and private work.</p></div><Button onClick={() => setSettingsOpen(true)}>Open settings<ChevronRight data-icon="inline-end" /></Button></CardContent></Card> : error ? <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><p className="text-sm font-medium">{error}</p><Button variant="outline" onClick={loadGithub}>Try again</Button></CardContent></Card> : <Tabs defaultValue="pulls"><TabsList><TabsTrigger value="pulls">Pull requests</TabsTrigger><TabsTrigger value="issues">Issues</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger></TabsList><Card className="overflow-hidden py-0"><TabsContent value="pulls"><ActivityList items={data?.pulls ?? []} empty="No pull requests this week" /></TabsContent><TabsContent value="issues"><ActivityList items={data?.issues ?? []} empty="No issues this week" /></TabsContent><TabsContent value="notifications"><ActivityList items={data?.notifications ?? []} empty={settings.githubToken ? "You’re all caught up" : "Add a token to view notifications"} /></TabsContent></Card></Tabs>}
        </section>

        <aside className="flex flex-col gap-7"><LinkEditor title="Shortcuts" items={shortcuts} onChange={setShortcuts} /><LinkEditor title="Pinned repositories" items={repos} onChange={setRepos} repo /><section className="flex flex-col gap-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Today</h2><Badge variant="secondary">{todos.filter((todo) => todo.completed).length}/{todos.length}</Badge></div><Card className="py-0"><CardContent className="flex flex-col p-0">{todos.map((todo) => <div key={todo.id} className="group flex items-center gap-3 border-b p-3 last:border-b-0"><Checkbox checked={todo.completed} onCheckedChange={(checked) => setTodos(todos.map((item) => item.id === todo.id ? { ...item, completed: checked === true } : item))} aria-label={`Mark ${todo.text} complete`} /><span className={todo.completed ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>{todo.text}</span><Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100" aria-label={`Delete ${todo.text}`} onClick={() => setTodos(todos.filter((item) => item.id !== todo.id))}><Trash2 /></Button></div>)}<form onSubmit={addTodo} className="flex gap-2 p-2"><Input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Add a task…" aria-label="New task" /><Button type="submit" size="icon" aria-label="Add task"><Plus /></Button></form></CardContent></Card></section></aside>
      </div>
    </div>
  </main>
}
