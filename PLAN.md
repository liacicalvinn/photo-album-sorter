# Photo Album Sorter — Implementation Plan

## Context

You want to assemble a **printed photobook** from a pile of unsorted photos. You need a
web app where you can: upload all photos, **see** them clearly, drag/sort them into the
exact order they should appear in the book, group them into **chapters/sections**, have
everything **persist so nothing is ever lost over time**, and finally **export the sorted
set as a numbered ZIP** to hand to a print service.

Hard constraints you set:
- **Free**, hosted on **GitHub Pages** (or another free static host) → **static site, no backend server**.
- Works on **laptop** and is **mobile-friendly** (responsive; installable as an app).
- Image types: **JPEG / PNG** only.
- Local toolchain: **bun 1.3.4** (no node/npm), git, macOS.

### The one honest tradeoff (read this first)
With **zero server**, there is **no automatic cross-device sync** and no "safe forever"
cloud. The plan handles your durability requirement with a **local-first** design:

1. Photos live in the browser's **IndexedDB** (handles many GB), and we request
   **persistent storage** so the browser won't auto-evict them.
2. **On iPhone/iPad this is not enough by itself**: non-installed Safari deletes all site
   storage after ~7 days of disuse. So **"Add to Home Screen"** (install as a PWA) is a
   required, prominently-prompted step — installed web apps are exempt from that deletion.
3. The real safety net + the only way to move between laptop and phone is a one-click
   **Export Project Bundle** (a `.zip` of all originals + the order/chapters) that you can
   **re-import** anywhere or after device loss. The app nags you to back up.

We will state these caveats plainly in the UI and never claim photos are "safe forever."

---

## Architecture & Stack

Client-only static SPA → builds to `dist/` → deploys to GitHub Pages. No server code.

| Concern | Choice | Why |
|---|---|---|
| Runtime / package mgr | **bun 1.3.4** | What's installed. `bun create vite`, `bun install`, `bunx --bun vite`. |
| Build / framework | **Vite + React 19 + TypeScript** | Static ESM build, fast. `base:'/photo-album-sorter/'` is the critical Pages line. |
| Storage | **Dexie 4** (+ `dexie-react-hooks`) over IndexedDB | Reactive `useLiveQuery`, safe versioned schema, stores `Blob`/`File` natively (no base64). |
| Drag & drop | **@dnd-kit** (`core`@^6, `sortable`@^10, `utilities`, `modifiers`) | Only mainstream lib with first-class multi-container + keyboard a11y + good mobile long-press. |
| Grid performance | **CSS `content-visibility: auto`** + lazy images | Skips decode of offscreen tiles → bounded memory for hundreds of photos, with none of the dnd-kit×virtualization transform conflicts. (Swap in `@tanstack/react-virtual` only if libraries grow into the thousands.) |
| Lightbox | **custom full-screen viewer** | Loads the full-res original strictly on demand (one image at a time) with keyboard + swipe nav — precise memory control over blob URLs, no library fighting lazy blob loading. |
| Thumbnails | **createImageBitmap + OffscreenCanvas in a Web Worker** | Off-main-thread, EXIF-correct, ~400px JPEG; one reused canvas, `bmp.close()` each time. |
| ZIP export | **client-zip** (primary), **fflate** (only for bundle *import* / unzip) | Store-only = original quality, streams so RAM stays flat on huge exports. |
| PWA / offline | **vite-plugin-pwa** (`registerType:'prompt'`) | Installable + offline; install is the durability linchpin on iOS. |
| Deploy | **GitHub Actions** (`setup-bun` + Pages actions) | Free HTTPS static deploy (HTTPS required for SW + persist()). |

**React hard rule:** every list/sortable key is a stable `crypto.randomUUID()` — never an
array index (StrictMode + reorders would make drags jump).

---

## Data model

```ts
type PhotoId = string;   // crypto.randomUUID()
type ChapterId = string;

interface Meta {          // single 'app' row
  key: 'app';
  schemaVersion: number;
  projectTitle: string;
  chapterOrder: ChapterId[];   // SOURCE OF TRUTH for chapter sequence
  lastBackupAt: number | null; // drives the backup nag
  persistGranted: boolean;
}
interface Chapter { id: ChapterId; title: string; createdAt: number; } // position lives in Meta.chapterOrder
interface Photo {            // METADATA ONLY — never holds bytes
  id: PhotoId; chapterId: ChapterId | null; // null = "Unsorted/Inbox" tray
  order: number;             // position within its chapter
  name: string; type: 'image/jpeg' | 'image/png'; size: number;
  width?: number; height?: number; exifDate?: number; importedAt: number;
}
interface Original { photoId: PhotoId; blob: Blob; } // untouched original bytes
interface Thumb    { photoId: PhotoId; blob: Blob; } // ~400px JPEG
```

**Three separate photo tables** is the key scale/durability decision: the grid lists from
`photos` (tiny metadata rows) and renders only `thumbs`; multi-GB `originals` are read one
at a time, only for the lightbox or export — so the board never pulls GBs into memory.

Dexie schema:
```ts
db.version(1).stores({
  meta:      '&key',
  chapters:  '&id',
  photos:    '&id, chapterId, [chapterId+order], order, importedAt',
  originals: '&photoId',
  thumbs:    '&photoId',
})
```
Reorder = `photos.bulkPut()` only the changed `{order, chapterId}` rows (debounced ~250ms);
blobs are never rewritten on reorder. Chapter reorder = `meta.update({chapterOrder})`.

---

## Component architecture

One `<DndContext>` wraps the whole board. A `SortableContext` for the chapter strip + one
per chapter + one for the Unsorted tray. dnd-kit emits order events → translated to
debounced Dexie writes. UI state comes from Dexie via `useLiveQuery` (metadata only).

```
App
├─ DurabilityBanner      // iOS "Add to Home Screen" nag (recurs until installed); persist() status
├─ TopBar                // ProjectTitle · StorageMeter · Import · AddChapter · BackupMenu
├─ PhotobookBoard        // the single <DndContext>
│  ├─ UnsortedTray       // inbox for freshly imported photos (droppable)
│  └─ ChapterSection[]   // drag handle to reorder; rename/delete/collapse; "Move selected here"
│     └─ VirtualizedPhotoGrid → PhotoCell (thumb via ref-counted object URL, select checkbox)
├─ SelectionBar          // multi-select: Move to chapter…, New chapter from selection, Delete
├─ Lightbox              // full-res original on demand; URL revoked on close
└─ Modals: FirstRun (durability + install) · BackupNag · QuotaError
```
Key dnd-kit config: `PointerSensor {delay:220, tolerance:6}` (long-press so the page still
scrolls on phones) + `KeyboardSensor`; `closestCorners`; `MeasuringStrategy.Always`;
`DragOverlay` for the in-flight clone; virtual row owns `translateY`, sortable owns the
cell transform (avoids transform clobber with virtualization).

---

## File structure (target)

```
photo-album-sorter/
├─ index.html  vite.config.ts (base path + VitePWA)  package.json  bun.lock
├─ public/  (PWA icons, apple-touch-icon, .nojekyll)
├─ .github/workflows/deploy.yml   (setup-bun + Pages deploy)
└─ src/
   ├─ db/      db.ts · repo.ts (importPhotos, reorder, moveToChapter, addChapter…) · board.ts (liveQuery→BoardState)
   ├─ workers/ thumbnail.worker.ts
   ├─ hooks/   useBoard · useObjectUrlCache · useColumns · useSelection · useThumbnailQueue · useStorageEstimate · useDurableStorage
   ├─ dnd/     sensors.ts · collision.ts · dragHandlers.ts
   ├─ components/ PhotobookBoard · ChapterSection · VirtualizedPhotoGrid · PhotoCell · SelectionBar · TopBar · Lightbox · modals/
   ├─ export/  numberedZip.ts · projectBundle.ts · importBundle.ts
   └─ lib/     ids · order · fileTypes · exif
```

---

## Milestones (each is shippable / independently testable)

- **M0 — Scaffold + deploy pipe + PWA shell.** Vite+React+TS via bun; `base` set;
  vite-plugin-pwa (manifest + icons + offline); `404.html` copy; `.nojekyll`; GitHub
  Actions deploy. **Done when:** a blank installable PWA is live on Pages, installs to Home
  Screen, works offline. (De-risks the base-path + install traps first.)
- **M1 — Durable store + import + persist().** Dexie schema; `persist()` on first gesture;
  FirstRunModal; import JPEG/PNG (multiple) → originals + metadata with QuotaExceeded
  handling; grid shows imported photos. **Done when:** imports survive reload.
- **M2 — Thumbnails + virtualized responsive grid + lightbox.** Worker thumbnailing; grid
  renders thumbs via ref-counted object URLs; responsive columns; tap → full-res lightbox.
  **Done when:** hundreds of photos render smoothly on a phone.
- **M3 — Chapters + move-without-drag (mobile-primary).** Add/rename/delete chapters;
  multi-select + "Move to chapter" / "New chapter from selection". The robust mobile
  sorting path. *Independently ship-worthy.*
- **M4 — Drag-and-drop.** Reorder within a chapter, drag across chapters (optimistic move +
  empty-chapter drop target), reorder the chapter strip. Debounced persist on every move.
- **M5 — Export numbered ZIP.** Flatten final order → client-zip `001_<name>` (store-only,
  original quality); stream-to-disk on desktop Chromium, Blob-download fallback elsewhere
  (the real mobile path). **→ Shippable MVP.**
- **M6 — Backup/restore bundle + durability UX.** Export/import Project Bundle; recurring
  DurabilityBanner until installed; live StorageMeter; BackupNagModal; QuotaErrorModal.
- **M7 — Polish (post-MVP).** EXIF chronological default sort; duplicate detection;
  per-chapter export batches; export progress bar; multi-project; optional user-supplied
  sync adapter (own GitHub repo / Dropbox) for real cross-device sync with no server.

---

## Decisions (confirmed)

- **Default order within a chapter / on import = chronological by EXIF capture date**
  (`DateTimeOriginal`), falling back to filename when a photo has no date. Uses `exifr`
  at import time (so EXIF parsing is MVP, integrated in M1/M2 — not deferred to M7).
- **Export excludes the Unsorted tray.** Before building the ZIP, a modal lists exactly
  which photos are being left out and requires confirmation to proceed.
- Deleting a chapter → its photos move to **Unsorted** (non-destructive), not deleted.
- Thumbnails ~**400px**, JPEG q0.7. Bundle import regenerates thumbnails.
- Single photobook (MVP); schema already reserves multi-project for later.
- GitHub Pages **project page** assumed → `base:'/photo-album-sorter/'` (one-line change for
  a user page or custom domain). Repo username not needed to build/run locally.

---

## Verification

- **Logic (bun test):** order reindex stays contiguous after within/cross-chapter moves;
  export numbering is correct zero-padded order; bundle export→import round-trips identically.
- **Build/deploy:** `vite preview` loaded at the **subpath** to catch base-path bugs; after
  Actions deploy, load the real Pages URL — no asset 404s, SW registers, deep-link refresh works.
- **Mobile (real iPhone Safari):** install to Home Screen; long-press drag while page still
  scrolls; import 200+ photos with bounded memory; export ZIP downloads & unzips numbered.
- **Durability:** reload preserves order; installed-iOS data survives >7 days (vs
  non-installed eviction); export bundle on device A → import on fresh device B reconstructs all.
- **Interactive:** drive the preview build with browser preview tools (screenshot grid,
  simulate import/drag, watch console for object-URL leaks / QuotaExceeded handling).

## Top risks (all mitigated in design)
iOS 7-day non-installed eviction → install + nags + bundle backup · `persist()` is
best-effort → bundle is the true backup · no server-less auto-sync → explicit export/import ·
no File System Access on iOS → Blob fallback + per-chapter export · Pages base-path trap →
verified live in M0 · dnd-kit×virtualization transform clobber → decoupled transforms +
DragOverlay · object-URL leaks → ref-counted cache, thumbs-only grid.
