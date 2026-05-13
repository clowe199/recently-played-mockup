# Getting started

Five minutes from clone to "oh, that's cool."

## The shortest path

```bash
git clone https://github.com/clowe199/recently-played-mockup
cd recently-played-mockup
npm install
npm run dev
```

Open <http://localhost:3000>. The root redirects to `/music`. You should see
a 3D album carousel, a stats strip, and (briefly) a now-playing row at the
top. The albums are clickable. The arrow keys work. Click the center album
to expand the detail panel.

If that worked, you're done with setup. Everything from here is making it
yours.

## What's actually running

Three things:

1. **`/music`** — the page itself. Hits `/api/apple-music/history` on mount
   to load your listening data.
2. **`/api/apple-music/history`** — currently a stub that returns sample data
   from `src/lib/sampleHistory.ts`. **This is the one file you'll replace.**
3. **`/api/apple-music/search`** — a live proxy to the public iTunes Search
   API. Powers artwork fallbacks and the 30-second audio previews. No auth
   needed, no env vars.

There are two other stub endpoints (`/api/now-playing`, `/api/spotify/search`)
which return placeholder values and which you can safely ignore for now.

## The one knob worth touching first

Open [`src/lib/sampleHistory.ts`](../src/lib/sampleHistory.ts) and change one
song. Save. Watch the page hot-reload with your edit.

Why this matters: it confirms the data flow works end-to-end. The history
endpoint reads from this file, the page reads from the endpoint, and the
UI reflects whatever you put in. When you swap this for a real data source
later, the exact same flow will deliver real songs.

## What the page expects from you

The history endpoint returns a JSON object shaped like this:

```ts
{
  totalTracks:   number,    // lifetime play count
  uniqueTracks:  number,
  uniqueArtists: number,
  totalMinutes:  number,    // total listening time, in minutes
  history: [
    {
      name:      string,
      artist:    string,
      album:     string,
      artwork:   string | null,   // full CDN URL or null
      url:       string | null,   // open-in-Apple-Music link, or null
      playedAt:  number,          // ms since epoch
      durationMs?: number,
    },
    // ...up to a few hundred entries
  ]
}
```

That's the whole contract. As long as your endpoint returns this shape, the
page works.

> **Tip.** The `artwork` field can be `null`. The page will look up cover
> art via iTunes Search automatically. So you don't need to track artwork
> URLs in your data layer if you don't want to — just provide accurate
> title + artist + album and the rest fills in.

## Now what

Pick a path:

- **You want to make it look like yours.** Head to [Customize](customize.md) —
  swap the accent color, the typography, the copy. Twenty minutes of work
  to fully rebrand.
- **You want real data on it.** Head to [Wire up your data](data-sources.md) —
  recipes for Last.fm, Spotify exports, MusicKit history, or a custom
  database.
- **You want to ship it.** Head to [Deploy](deploy.md) — one-click options
  and bare-metal instructions.

If you're not sure: do the customize pass first. It's cheap, it's satisfying,
and it makes the rest of the work feel less hypothetical.
