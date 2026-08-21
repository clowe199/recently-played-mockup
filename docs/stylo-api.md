# The stylo API contract

What the [stylo](https://github.com/clowe199/CloweScrobbler) iOS app expects
from a server you point it at.

## Read this first

**This mockup does not implement most of it.** Out of the box it serves a
music page, not a scrobble receiver. That distinction is easy to miss, because
the one endpoint stylo uses to *test* the connection is the one that already
exists:

| stylo calls | this repo ships |
| --- | --- |
| `GET /api/apple-music/history` | ✅ (sample data) |
| `POST /api/now-playing` | ✅ |
| `POST /api/scrobble` | ❌ |
| `PATCH /api/scrobble/artwork` | ❌ |
| `GET /api/apple-music/track-history` | ❌ |
| `GET /api/apple-music/artist-history` | ❌ |
| `POST /api/live-activity` | ❌ |
| `POST /api/live-activity/end` | ❌ |

So a fresh deploy will connect successfully, report itself healthy, and then
drop every scrobble on the floor with a 404. If you have set the URL and key in
stylo and nothing is arriving, this table is why.

Implement `POST /api/scrobble` first. It is the only one that has to exist for
history to accumulate; everything else makes the app's screens better.

## Authentication

Every request carries the shared secret as a bearer token:

```
Authorization: Bearer <your-secret>
Content-Type: application/json
```

That is the same value as `CRON_SECRET` in [`.env.example`](../.env.example),
and the same one you paste into stylo under **Settings → Connections → Your
server → Private Key**. Reject anything without it — anyone holding it can
write to your listening history.

Timestamps are **Unix milliseconds** throughout, as `Int64`.

---

## `POST /api/scrobble`

The one that matters. Called once per completed play.

```jsonc
{
  "name":       "Victorious",          // required
  "artist":     "Panic! At The Disco", // required, primary artist only
  "durationMs": 178000,                // required
  "playedAt":   1755800000000,         // required, ms, when the play STARTED
  "album":      "Death of a Bachelor", // optional
  "artwork":    "https://…/500x500bb.jpg" // optional
}
```

```jsonc
{ "success": true, "inserted": true }
```

`inserted` should be `false` when you recognised the play as a duplicate and
did not store it again. stylo shows that as **deduped** rather than an error,
so returning it honestly keeps the log accurate.

**Deduplicate on the server.** stylo retries failed scrobbles, and the Recover
flow can resubmit an older play. Matching on `(name, artist, playedAt)` within
a minute or so is enough.

---

## `GET /api/apple-music/history?limit=0`

Doubles as the connection test and the lifetime stats source. `limit=0` means
"no rows, just the totals".

```jsonc
{
  "totalTracks":     1968,
  "uniqueTracks":    1356,
  "uniqueArtists":    757,
  "totalMinutes":    5921,
  "firstScrobbleAt": 1737700000000,   // nullable
  "topArtists": [ { "name": "Taylor Swift", "plays": 111 } ],
  "topTracks":  [ { "name": "FADE", "artist": "Alesso & Pendulum", "plays": 18 } ]
}
```

`topArtist` and `topTrack` (singular) are accepted as legacy single-item
alternatives to the arrays.

These totals are what the app's Stats screen and Achievements page count from,
so they should be lifetime figures — not a recent window. The phone only keeps
its last 500 plays, so anything beyond that exists only here.

---

## `GET /api/apple-music/track-history?title=…&artist=…`

Every time you have played one track. Both parameters are URL-encoded.

```jsonc
{ "plays": [ { "playedAt": 1755800000000 } ] }
```

Return `{"plays": []}` for a track you have never played — an empty list is a
real answer and stylo renders it as "no plays yet".

**Match the artist the way it was written.** stylo strips featured credits
before sending, so it asks about `Slayyyter`, never
`Slayyyter feat. Ayesha Erotica`. If you store the full credit, normalise on
your side too or every featured track will look unplayed.

---

## `GET /api/apple-music/artist-history?artist=…`

```jsonc
{
  "totalPlays":    46,
  "firstPlayedAt": 1737700000000,      // nullable
  "tracks": [
    { "title": "Lover", "plays": 12,
      "firstPlayedAt": 1737700000000, "lastPlayedAt": 1755800000000 }
  ]
}
```

An artist you have never played should be a `404` or an empty `tracks` array —
stylo treats an empty list as "no data" and falls back to local numbers rather
than showing an authoritative-looking zero.

---

## `PATCH /api/scrobble/artwork`

Backfills cover art for a play that arrived without one, which happens when
artwork had not resolved by the time the track ended.

```jsonc
{ "playedAt": 1755800000000, "artworkURL": "https://…/500x500bb.jpg" }
```

Match on `playedAt` and update in place.

---

## `POST /api/now-playing`

Fire-and-forget. What is playing right now, for a live indicator on your page.

```jsonc
{
  "name":     "Victorious",
  "artist":   "Panic! At The Disco",
  "album":    "Death of a Bachelor",  // nullable
  "artwork":  "https://…"             // nullable
}
```

Already implemented here. Do not write these to history — a now-playing ping is
not a play, and the same track will arrive again through `/api/scrobble` if it
finishes.

---

## `POST /api/live-activity` and `POST /api/live-activity/end`

Only needed if you want stylo's Lock Screen Live Activity to keep updating
while the app is suspended, which requires forwarding APNs pushes. Skip both
unless you are set up for push. The app degrades to updating the activity
itself while it is awake.

---

## Checking it works

With your deploy live and your secret exported:

```bash
export STYLO_URL=https://your-domain.com
export STYLO_SECRET=your-shared-secret

# 1. Connection test — this is what stylo's Save button calls.
curl -s -H "Authorization: Bearer $STYLO_SECRET" \
  "$STYLO_URL/api/apple-music/history?limit=0" | jq

# 2. The one that actually matters. A 404 here is the failure this page is about.
curl -s -X POST -H "Authorization: Bearer $STYLO_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","artist":"Test","durationMs":180000,"playedAt":'"$(date +%s)"'000}' \
  "$STYLO_URL/api/scrobble" | jq

# 3. Send it twice. The second should come back inserted:false, not an error.
```

If step 1 succeeds and step 2 returns 404, you have deployed the mockup without
adding the write endpoint. That is the expected state of a fresh fork, and
implementing `POST /api/scrobble` is the fix.

Verify without a secret too — every one of these should refuse you.
