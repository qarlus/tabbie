# CapTab

<p align="center">
  <img src="public/icon-128.png" alt="CapTab" width="96" height="96" />
</p>

A calm, **local-first new tab** — Capbar’s tab sibling. Same warmth and creature DNA; different job. Capbar watches AI usage caps in the tray; CapTab is the quiet place every new tab opens.

Installed as a lightweight browser extension so it can open on every new tab and optionally read things already in your browser (like bookmarks).

## Product decision

**CapTab is extension-first.** A normal website cannot replace Chrome’s new tab page or read bookmarks/history. The accessible path is:

1. Install the extension once  
2. New tabs open CapTab automatically  
3. Optional permissions (bookmarks today; history / top sites later) are requested only when you add that module  

You can still run the Vite app for development; modules that need Chrome APIs show a clear “install as new tab” empty state until you’re in the extension.

## The local-first promise

CapTab makes **zero network requests by default**. No analytics, no telemetry, no external fonts, no CDNs. Shortcuts, settings, and module data live in `localStorage` under the `captab:` prefix (legacy `tabbie:` keys are migrated once on load). Bookmarks are read live from Chrome when you grant access — never uploaded.

Exactly a few things can leave your device, and all are explicit choices you make:

1. **Submitting the search box** navigates to your chosen search engine.
2. **Optional GitHub / RSS modules** fetch from those services only after you configure them.
3. **Favicons** use Chrome’s cache when installed as an extension; otherwise a small icon helper may load.
4. **Update check** (Settings → Data) asks GitHub Releases for a newer build at most once per day.

## Features

- **Search & shortcuts** — engines with bangs, local suggestions, destination strip.
- **Module dock** — Resume / Follow / Capture. Drag to reorder; ⋯ to resize or remove.
  - **GitHub** — PRs, issues, Actions, notifications
  - **Bookmarks** — Chrome bookmark bar, Other, Recent (optional permission)
  - **RSS / Atom**, **Link group**, **Scratch**, **Countdown**
- **Look** — twelve themes, handmade wallpapers (Impasto / Stipple / Fiber), layout modes (Stack / Bento / Magazine / Islands), surfaces, fonts, light/dark
- **World clocks** — major cities next to local time
- **Your data** — Export / Import / Reset in Settings
- **Updates** — GitHub Releases zip + in-Settings update check

## Development

```bash
npm install     # once
npm run dev     # http://localhost:7100 (no Chrome APIs)
npm run build   # syncs manifest version from package.json → dist/
```

`package.json` is the single version source. `prebuild` writes that version into `public/manifest.json`.

## Use as your new tab (Chrome / Edge)

1. `npm run build`
2. `chrome://extensions` → Developer mode → **Load unpacked** → select `dist/`
3. Open a new tab — CapTab takes over
4. Add the **Bookmarks** module → click **Allow bookmarks** when prompted

### Firefox

Load `dist/manifest.json` via `about:debugging` → This Firefox → Load Temporary Add-on. Temporary add-ons reset on quit unless signed.

## Releasing & updating

Unpacked extensions **do not** silently auto-update in Chrome. CapTab’s update channel is **GitHub Releases**.

### Cut a release

1. Bump `version` in `package.json` (e.g. `0.2.1`)
2. Commit the change
3. Tag and push:
   ```bash
   git tag v0.2.1
   git push origin v0.2.1
   ```
4. GitHub Actions builds, zips `dist/` as `captab.zip`, and attaches it to the release  
   The tag (`v0.2.1`) **must** match `package.json` or the workflow fails.

### Update an installed copy

1. Download `captab.zip` from the [latest release](https://github.com/qarlus/tabbie/releases/latest)
2. Extract over your loaded extension folder (or point Load unpacked at the new folder)
3. On `chrome://extensions`, click **Reload** for CapTab

Settings → **Data** shows the installed version and a quiet “Update available” notice when a newer release exists (cached for 24 hours).

Silent Chrome auto-update requires publishing to the **Chrome Web Store** later — the same release zip can feed that upload.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the search bar |
| `↑` / `↓` | Move through search suggestions |
| `Enter` | Submit search / open highlighted item |
| `Esc` | Close suggestions or dialog |

## Data export / import

Settings → **Export** / **Import** / **Reset all**. Bookmarks themselves stay in Chrome; CapTab only stores which folder view you last opened. Backups labeled `app: "tabbie"` still import.

## Tech

Vite · React 19 · TypeScript · Tailwind CSS · shadcn/ui · next-themes · lucide-react · @dnd-kit. Manifest V3 extension, no runtime backend.
