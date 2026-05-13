# Wire up your data

The page renders bundled sample data out of the box. This guide shows how to
swap that for real listening history.

You have exactly one job: make `GET /api/apple-music/history` return your
data in the shape the page expects. Where the data comes from is up to you.

---

## The contract

```ts
// GET /api/apple-music/history
{
  totalTracks:   number,    // lifetime play count
  uniqueTracks:  number,
  uniqueArtists: number,
  totalMinutes:  number,    // total listening time, in minutes
  history: [
    {
      name:        string,
      artist:      string,
      album:       string,
      artwork:     string | null,   // full https URL or null
      url:         string | null,   // open-in-X link, or null
      playedAt:    number,          // ms since epoch
      durationMs?: number,          // optional
    },
    // ...however many entries you want; ~200 is a reasonable cap
  ]
}
```

Order by `playedAt` descending. Anything older than the last ~200 plays is
ignored by the carousel anyway.

> **Don't have artwork URLs?** Set `artwork: null`. The page falls back
> to iTunes Search to look up cover art by title + artist. It's slower
> the first time but it works, and the lookup is debounced and cached.

---

## Recipe: Last.fm

If you already have a Last.fm account, this is the lowest-effort wiring.
Last.fm has a public API that doesn't require user auth for read access.

```ts
// src/app/api/apple-music/history/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const LASTFM_USER = 'your-username'
const LASTFM_KEY  = process.env.LASTFM_API_KEY!

export async function GET() {
  const url = new URL('https://ws.audioscrobbler.com/2.0/')
  url.searchParams.set('method', 'user.getrecenttracks')
  url.searchParams.set('user',   LASTFM_USER)
  url.searchParams.set('api_key', LASTFM_KEY)
  url.searchParams.set('limit',  '200')
  url.searchParams.set('format', 'json')

  const res  = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()
  const raw  = data?.recenttracks?.track ?? []

  const history = raw
    .filter((t: any) => !t['@attr']?.nowplaying) // drop the "now playing" entry
    .map((t: any) => ({
      name:     t.name,
      artist:   t.artist['#text'],
      album:    t.album['#text'] || '',
      artwork:  pickArtwork(t.image),
      url:      t.url,
      playedAt: Number(t.date?.uts ?? Math.floor(Date.now() / 1000)) * 1000,
    }))

  return NextResponse.json({
    totalTracks:   Number(data.recenttracks?.['@attr']?.total ?? history.length),
    uniqueTracks:  new Set(history.map((h: any) => `${h.name}|${h.artist}`)).size,
    uniqueArtists: new Set(history.map((h: any) => h.artist)).size,
    totalMinutes:  0, // Last.fm doesn't return total duration; leave at 0 or estimate
    history,
  })
}

function pickArtwork(images: any[]): string | null {
  const large = images?.find(i => i.size === 'extralarge') ?? images?.[images.length - 1]
  const url = large?.['#text']
  return url && !url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? url : null
}
```

Get an API key at <https://www.last.fm/api/account/create>. It's free and
takes about thirty seconds.

---

## Recipe: a Postgres database

If you have your own scrobbler service writing to Postgres, hit it directly.

```ts
// src/app/api/apple-music/history/route.ts
import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET() {
  const recent = await pool.query(`
    SELECT name, artist, album, artwork_url, url, played_at, duration_ms
    FROM scrobbles
    ORDER BY played_at DESC
    LIMIT 200
  `)

  const totals = await pool.query(`
    SELECT
      COUNT(*)                                     AS total_tracks,
      COUNT(DISTINCT name || '|' || artist)        AS unique_tracks,
      COUNT(DISTINCT artist)                       AS unique_artists,
      COALESCE(SUM(duration_ms), 0) / 60000        AS total_minutes
    FROM scrobbles
  `)

  return NextResponse.json({
    totalTracks:   Number(totals.rows[0].total_tracks),
    uniqueTracks:  Number(totals.rows[0].unique_tracks),
    uniqueArtists: Number(totals.rows[0].unique_artists),
    totalMinutes:  Number(totals.rows[0].total_minutes),
    history: recent.rows.map(r => ({
      name:       r.name,
      artist:     r.artist,
      album:      r.album,
      artwork:    r.artwork_url,
      url:        r.url,
      playedAt:   new Date(r.played_at).getTime(),
      durationMs: r.duration_ms,
    })),
  })
}
```

Don't forget to `npm install pg @types/pg`. Set `DATABASE_URL` in your
deploy's environment.

---

## Recipe: Spotify export

If you've got a Spotify extended streaming history export (the JSON files
they send you on request), it's a static file. Drop it in `public/` (or
better, `src/data/`) and read it directly:

```ts
import { NextResponse } from 'next/server'
import spotifyData from '@/data/spotify-history.json'

export async function GET() {
  const history = spotifyData
    .filter((p: any) => p.master_metadata_track_name)
    .sort((a: any, b: any) => +new Date(b.ts) - +new Date(a.ts))
    .slice(0, 200)
    .map((p: any) => ({
      name:       p.master_metadata_track_name,
      artist:     p.master_metadata_album_artist_name,
      album:      p.master_metadata_album_album_name,
      artwork:    null, // Spotify export doesn't include CDN URLs; let iTunes lookup fill in
      url:        p.spotify_track_uri
                    ? `https://open.spotify.com/track/${p.spotify_track_uri.split(':').pop()}`
                    : null,
      playedAt:   +new Date(p.ts),
      durationMs: p.ms_played,
    }))

  return NextResponse.json({
    totalTracks:   spotifyData.length,
    uniqueTracks:  new Set(history.map(h => `${h.name}|${h.artist}`)).size,
    uniqueArtists: new Set(history.map(h => h.artist)).size,
    totalMinutes:  Math.round(spotifyData.reduce((s: number, p: any) => s + p.ms_played, 0) / 60000),
    history,
  })
}
```

You can request your full streaming history at
<https://www.spotify.com/account/privacy/> (it can take up to 30 days for
the extended one).

---

## Recipe: a scrobbler push endpoint

If you want to accept scrobbles from a client app (like the CloweScrobbler
iOS app), add a `POST` handler that an external app can push to. The minimal
version:

```ts
// src/app/api/scrobble/route.ts
import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function POST(req: Request) {
  // Simple shared-secret auth
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/, '')
  if (provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  // Expected shape: { name, artist, album?, artworkURL?, durationMs?, playedAt: number }

  // De-dupe: don't insert if the same name+artist was scrobbled within
  // the last 30 seconds. Protects against double-fires from clients.
  const recent = await pool.query(
    `SELECT 1 FROM scrobbles
     WHERE name = $1 AND artist = $2 AND played_at > now() - interval '30 seconds'
     LIMIT 1`,
    [body.name, body.artist]
  )
  if (recent.rowCount && recent.rowCount > 0) {
    return NextResponse.json({ inserted: false, reason: 'duplicate' })
  }

  await pool.query(
    `INSERT INTO scrobbles (name, artist, album, artwork_url, duration_ms, played_at)
     VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))`,
    [body.name, body.artist, body.album ?? null, body.artworkURL ?? null,
     body.durationMs ?? 0, body.playedAt]
  )

  return NextResponse.json({ inserted: true })
}
```

Set `CRON_SECRET` to a random string. Any client that wants to scrobble
passes it as `Authorization: Bearer <secret>`. This is what the
CloweScrobbler app's "API Secret" field is asking for.

---

## A note on caching

If you're hitting a slow data source, wrap your handler in
[`unstable_cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)
or use `next: { revalidate: 60 }` on your `fetch` calls. The page itself
already polls the history endpoint every 45 seconds in the background, so
keep your cache window shorter than that for the polls to actually pick up
new scrobbles.

---

## What about now-playing?

[`src/app/api/now-playing/route.ts`](../src/app/api/now-playing/route.ts) is
the second-most-interesting endpoint. It should return either
`{ track: null }` when nothing is playing, or:

```ts
{
  track: {
    name:    string,
    artist:  string,
    album?:  string,
    artwork?: string | null,
    setAt:   number,  // ms since epoch — when the track started
  }
}
```

If your scrobbler client pings a "now playing" endpoint on track start, store
the most recent one with a short TTL (60–90 seconds is reasonable) and return
it here. If you don't care about real-time, return `{ track: null }` and the
LIVE strip just won't show. That's fine.

---

## You're done

Once your `history` endpoint returns real data, every other surface — the
carousel, the stats, the detail panel, the previews — just works. Nothing
else needs to change.
