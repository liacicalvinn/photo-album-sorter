# 📚 Photo Album Sorter

A free, installable web app for arranging photos into a **printed photobook order**.
Upload your JPEG/PNG photos, sort them into **chapters**, fine-tune the order by
drag-and-drop, and export a **numbered ZIP** (`001_…`, `002_…`) ready for any print
service. Everything runs **in your browser** — your photos never leave your device, and
the whole thing is hosted for free on GitHub Pages.

See [PLAN.md](PLAN.md) for the full design rationale.

## Features

- **Import** JPEG/PNG photos; auto-ordered **chronologically** by EXIF capture date
  (falls back to filename).
- **See** everything: fast thumbnail grid + tap-to-open full-screen viewer.
- **Chapters / sections**: create, rename, reorder; move photos in via drag-and-drop or a
  tap-friendly “Move to chapter” menu (great on mobile).
- **Reorder** photos within and across chapters by drag (long-press on touch).
- **Durable storage**: photos live in IndexedDB with persistent-storage requested;
  survives reloads.
- **Export numbered ZIP** in final book order, original quality (Unsorted photos are
  excluded — with a clear warning).
- **Project backup**: export/import a single `.zip` (all photos + order) — the true
  backup and the only way to move between devices (no server = no auto-sync).
- **Installable PWA**: works offline; install to Home Screen (required on iOS for
  long-term durability).

## Requirements

- [Bun](https://bun.sh) ≥ 1.3 (no Node/npm needed).

## Develop

```bash
bun install
bun run dev        # http://localhost:5173/
```

## Build & preview

```bash
bun run build      # → dist/ (static site)
bun run preview    # serves the built site at the /photo-album-sorter/ base path
bun test           # run unit tests
```

## Deploy to GitHub Pages (free)

1. Create a GitHub repo named **`photo-album-sorter`** and push this project.
   - The app expects to be served from `https://<you>.github.io/photo-album-sorter/`.
   - Using a **different repo name**, a **user page** (`<you>.github.io`), or a **custom
     domain**? Change `PROD_BASE` in [vite.config.ts](vite.config.ts) accordingly
     (`'/'` for a user page / custom domain).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. The included workflow
   [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds with Bun and
   deploys automatically.
4. Open the site, then **install it** (Add to Home Screen on mobile / install icon on
   desktop) so your storage is treated as persistent.

## Durability — important

- Storage is **per-device, per-browser**. There is **no automatic sync**.
- On **iPhone/iPad**, non-installed Safari can erase site storage after ~7 days. **Add the
  app to your Home Screen** to keep your photobook safe.
- The **only true backup** is *Export project backup* (⋯ menu). Keep that file safe; it’s
  also how you move your work to another device.
