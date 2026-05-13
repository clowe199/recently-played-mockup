# Customize

How to make this page look and feel like yours without rewriting it.

The entire UI lives in [`src/app/music/page.tsx`](../src/app/music/page.tsx).
1,200 lines, one file, no abstractions to chase. Most of what you'll want to
change is right at the top or marked with comments.

---

## The accent color

The original uses Apple Music red, `#fc3c44`. It appears in the now-playing
visualizer, the audio progress bar, the play button, the "c." period — pretty
much every place the eye lands.

Open `src/app/music/page.tsx`, search for `#fc3c44`, and replace all of them
with your color of choice. There are roughly fifteen occurrences and they're
all the same intent (the brand accent). A `find . -name "page.tsx" -exec sed
-i '' 's/#fc3c44/#YOUR_COLOR/g' {} +` works if you trust your replacement.

> **Pick something with high contrast against `#0a0a0f`.** The page is
> dark, and the accent is used in small interactive areas. Pastels and
> mid-saturation greens disappear. Vivid is good. Spotify green works.
> Last.fm red works. Hot pink works.

If you want to also change the background away from `#0a0a0f`, it's referenced
in three places: `globals.css`, the page wrapper near the top of `page.tsx`,
and the stats-grid background in `AlbumDetailPanel`. Search and replace.

---

## The page title

The big "Recently Played" headline is at the bottom of `page.tsx`, inside
the title `<motion.div>`. Change the text, change the size (it's a
`clamp(1.6rem, 3.2vw, 2.4rem)`), or replace the Apple Music eyebrow above
it with your own service name.

The `<head>` metadata lives in
[`src/app/music/layout.tsx`](../src/app/music/layout.tsx) — that's what
controls the browser tab title and Open Graph share cards.

---

## The username / brand mark

Top-left of the nav row, you'll find this block:

```tsx
<span className="leading-none tracking-[-0.04em] text-white select-none"
      style={{ ...DRUK, fontSize: '1.15rem' }}>
  c<span style={{ color: '#fc3c44' }}>.</span>
</span>
```

That's the `c.` logo. Replace with your initial, name, or an `<Image>` if
you've got a logomark. The accent dot is doing real work — it's a tiny but
effective brand signature, and it costs you nothing to keep the pattern with
a different letter.

---

## The fonts

Two stacks, both at the top of `page.tsx`:

```tsx
const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 400 }
const DRUK = { fontFamily: 'var(--font-mont), "Montserrat", system-ui, sans-serif', fontWeight: 900 as const }
```

- **MONO** is the small caps text — labels, eyebrows, timestamps. The default
  uses your OS's system monospace. To use a custom mono (PPFraktionMono,
  Berkeley Mono, JetBrains Mono, whatever), drop it into
  [`src/app/layout.tsx`](../src/app/layout.tsx) with `next/font` and reference
  the variable here.
- **DRUK** is the big display text — the "Recently Played" headline, the
  stats numbers, the album name. The default is Montserrat 900 because it's
  free and ships with `next/font`. The original site uses Druk Wide. Any
  black-weight condensed display font will look at home here.

The font setup happens once in
[`src/app/layout.tsx`](../src/app/layout.tsx):

```tsx
import { Montserrat } from 'next/font/google'

const mont = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-mont',
  display: 'swap',
})
```

Swap that for your font of choice. Anything in `next/font/google` works
without configuration; for a self-hosted font use `next/font/local`.

---

## The copy

Every visible string is in `page.tsx`. Notable ones to scan for:

| String | Where it lives |
| --- | --- |
| `"APPLE MUSIC"` (eyebrow above the title) | Inside the headline block |
| `"Recently Played"` (the title itself) | A few lines below the eyebrow |
| `"plays"`, `"tracks"`, `"listened"` (stat labels) | Stats strip near the bottom of the page |
| `"Nothing here yet"` / `"Play some music first"` (empty state) | Empty state branch in the main render |
| `"Loading history"` (loading state) | Loading state branch in the main render |
| `"live"` (now-playing indicator) | `NowPlayingStrip` component |
| `"plays"` / `"play"` (per-album count) | Inside `CoverFlow`, under the album info |

The original uses uppercase + letter-spaced labels (`tracking-[0.2em]`) to
give everything a typographic identity. If you change the strings, keep the
casing pattern — it's a big part of the visual style.

---

## The layout

Three structural choices to know about:

1. **The page is viewport-locked.** The outer container is `h-[100dvh]
   overflow-hidden flex flex-col` — it never scrolls the page itself.
   Only the detail panel scrolls internally when an album is expanded.
   If you want a more traditional scrolling layout, remove the
   `overflow-hidden` and `h-[100dvh]` from the shell.

2. **The title collapses when the detail panel is open.** That's the
   `<AnimatePresence>` block wrapping the title `<motion.div>`. Removing
   it leaves the title always visible — slightly less dramatic, slightly
   more grounded. Pick your trade-off.

3. **The ambient background** is a blurred copy of the selected album's
   art at very low opacity. The intensity is controlled by the `opacity`
   and `filter: blur(...) saturate(...)` styles in the background block.
   Crank them up for a more cinematic feel, drop them to zero for a
   flat dark page.

---

## The audio previews

The play button in the detail panel fetches 30-second previews from iTunes
Search. If you don't want this — maybe you'd rather link out, or you don't
want auto-playing audio at all — find `fetchPreviewUrl` and `fetchAndPlayPreview`
and either short-circuit them (`return` immediately) or remove the UI for
the play button entirely.

---

## When you've done all of this

You've got a page that's recognizably yours. Now go [wire up your
data](data-sources.md) so it stops showing the author's listening history.
