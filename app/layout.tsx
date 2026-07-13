import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "New Tab",
  description: "A focused personal dashboard for GitHub activity, shortcuts, repositories, and daily tasks.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#111310" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`bg-background ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning><body className="font-sans antialiased">{children}{process.env.NODE_ENV === "production" && <Analytics />}</body></html>
}
