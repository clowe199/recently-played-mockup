# Architecture

A tour of how the page is built. You don't need to read this to use the
project, but you'll want to read it before making structural changes.

---

## The whole picture

```
┌─────────────────────────────────────────────────────────────────┐
│  src/app/music/page.tsx                                         │
│  ────────────────────────                                       │
│  MusicHistoryPage (default export)                              │
│   ├── Nav row (logomark + back link + refresh)                  │
│   ├── Title block ("Recently Played", collapses when expanded)  │
│   ├── Stats strip                                               │
│   ├── NowPlayingStrip       (optional, from /api/now-playing)   │
│   ├── CoverFlow             (3D album carousel)                 │
│   └── AlbumDetailPanel      (visible when an album is expanded) │
│        ├── Play button + AudioVisualizer                        │
│        ├── AudioProgressBar                                     │
│        ├── Stats grid                                           │
│        └── Track list                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼  fetches from
┌─────────────────────────────────────────────────────────────────┐
│  Stub API routes (all under src/app/api/)                       │
│  ────────────────────────                                       │
│  GET  /api/apple-music/history   →  sample data                 │
│  GET  /api/apple-music/search    →  proxies iTunes Search       │
│  GET  /api/now-playing           →  most-recent sample track    │
│  GET  /api/spotify/search        →  returns null (stub)         │
└─────────────────────────────────────────────────────────────────┘
```

One page component, four small route handlers. Everything else is in the
same file. The CoverFlow, the AlbumDetailPanel, the AudioVisualizer — they're
all defined above `MusicHistoryPage` in `page.tsx`.

---

## State, briefly

`MusicHistoryPage` holds:

- **`stats`** — the data from `/api/apple-music/history`. Re-fetched on mount
  and every 45 seconds in the background (silent refresh, no spinner).
- **`selectedAlbumKey`** — the currently-focused album, tracked by a stable
  string key (`"Album Name|||Artist Name"`) so background refreshes that
  reorder the array can't drift the focus to a different album.
- **`detailOpen`** — boolean. True when the user has clicked the center
  album and the track-list panel is visible.
- **`nowPlaying`** — the most recent now-playing payload, polled from
  `/api/now-playing` every 15 seconds.
- **`isPlaying`, `previewUrl`, `currentTrackName`, `audioProgress`,
  `audioCurrentTime`, `audioDuration`** — audio player state. Owned by the
  page so it persists across album switches.
- **`releaseYears`, `resolvedArtworks`** — caches for iTunes Search lookups
  (release date and fallback artwork). Per-album, keyed by `"album-artist"`.

The audio element itself (`audioRef`) is an actual `HTMLAudioElement` kept
in a ref. The component creates it on demand and tears it down on unmount.

---

## CoverFlow

The 3D album carousel is hand-rolled with `transform: translateX(...)
translateZ(...) rotateY(...)` and a `perspective: 1200px` container — no
WebGL, no Three.js. CSS transforms are doing all the work.

Each album computes its position relative to the center:

```
absOffset = |index - selectedIndex|

if absOffset > 3, don't render (off-screen)
if absOffset == 0, this is the center card
otherwise, rotate ±55deg (50deg on mobile), shrink, fade
```

Mobile gets a custom touch handler — horizontal drags select the next/prev
album, but vertical drags fall through to the page so users can still scroll
the detail panel.

Keyboard arrows work too. Left/right select the previous/next album. Only
bound when the carousel is the focus context (not on mobile).

---

## The audio player

`fetchPreviewUrl` runs every time the selected album changes. It tries up to
the first five tracks of the album — iTunes Search doesn't return previews
for every song, so we walk the list until we find one. If none of the first
five have previews, it shows "No preview available" and disables the play
button.

The actual audio is a plain `new Audio(url)` with three event listeners:
`onended`, `ontimeupdate`, `onloadedmetadata`. No fancy library.

Auto-play doesn't happen — the user has to press play once. Browsers will
block any attempt to call `.play()` on mount without a user gesture, so
don't try.

---

## Artwork resolution

Some tracks come in without artwork (especially library-only tracks from
Apple Music — they use `musickit://` URLs that aren't web-resolvable). The
page handles this with a small priority list:

1. **Use the artwork field as-is** if it's a real `https://` URL.
2. **Extract the embedded CDN URL** from `musickit://` URLs that have a `fat`
   query param.
3. **Fall back to iTunes Search** for albums that still don't have artwork —
   queries are staggered 300ms apart to stay polite with the rate limit.

The `getHighResArtwork(url, size)` helper rewrites iTunes URLs from their
default 100x100 to a configurable size (200, 400, 600). Same pattern Apple
uses themselves.

---

## Why Framer Motion

The 3D transitions, the layout animations (title collapsing when the detail
panel opens), and the orchestrated mount-in sequence (carousel slides up, stats
fade in, title appears) are all easier with Framer Motion than with pure CSS.

If you want to remove Framer Motion entirely, you can — `<motion.div>` blocks
gracefully fall back to `<div>` if you do a find-and-replace, and you'll lose
the orchestration but the page still functions. The CoverFlow itself uses
plain CSS transitions, so the headline 3D effect doesn't depend on Framer.

---

## Why a single file

Yes, 1,200 lines is a lot. Yes, it could be split. But:

- It's a single page. No other route depends on these components.
- Every component is tightly coupled to the page's state — splitting them
  means threading 15 props down the tree, which is worse to read.
- `ctrl-F` is faster than navigating an imaginary file hierarchy.

If you find yourself adding a *second* page that wants the same CoverFlow,
go ahead and extract. Until then, leave it.

---

## What's intentionally absent

- **A database.** This is a UI mockup. Data lives in
  `src/lib/sampleHistory.ts` until you replace it.
- **Auth.** The page is public by design. If you want it private, wrap it
  in middleware (`src/middleware.ts`) and check a session cookie.
- **A scrobble write path.** The `/api/scrobble` endpoint isn't included.
  See [`docs/data-sources.md`](data-sources.md) for a starting template if
  you want one.
- **Tests.** It's a single visual page that's easier to verify by looking at
  it than by writing snapshots. If you build real components on top, that
  calculus changes.

These are tradeoffs, not omissions. Add them if you need them.
