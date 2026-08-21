import { NextResponse, type NextRequest } from 'next/server'
import { sampleHistory } from '@/lib/sampleHistory'
import { isAuthorized, authFailureReason } from '@/lib/auth'

// Stub now-playing endpoint. Returns the most-recent sample track for a
// brief window after page load so the "LIVE" strip is visible in the
// mockup. In a real deployment, this is where you'd return whatever
// your scrobbler reports is currently playing (or null if nothing is).

export const dynamic = 'force-dynamic'

// Toggle this if you'd rather the mockup never show a now-playing row.
const SHOW_DEMO_NOW_PLAYING = true

export async function GET() {
  if (!SHOW_DEMO_NOW_PLAYING) return NextResponse.json({ track: null })

  const top = sampleHistory[0]
  if (!top) return NextResponse.json({ track: null })

  return NextResponse.json({
    track: {
      name:    top.name,
      artist:  top.artist,
      album:   top.album,
      artwork: top.artwork,
      setAt:   Date.now(),
    },
  })
}

/**
 * POST /api/now-playing — what is playing right now.
 *
 * stylo POSTs here as a track starts, and the route only answered GET, so
 * every one of those was a 405 against a server that otherwise looked
 * connected. Same failure shape as the missing scrobble endpoint: quiet.
 *
 * Deliberately NOT written to history. A now-playing ping is not a play —
 * the track may be skipped ten seconds later. If it finishes, stylo sends it
 * again through /api/scrobble, which is the endpoint that means "this
 * counted".
 *
 * Held in module memory, so it shares the caveat in scrobbleStore.ts: fine
 * for watching the round trip, not somewhere to keep anything.
 */
let current: {
  name: string
  artist: string
  album: string | null
  artwork: string | null
  setAt: number
} | null = null

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: authFailureReason(req) }, { status: 401 })
  }

  let body: { name?: unknown; artist?: unknown; album?: unknown; artwork?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const artist = typeof body.artist === 'string' ? body.artist.trim() : ''
  if (!name || !artist) {
    return NextResponse.json({ error: 'name and artist are required.' }, { status: 400 })
  }

  current = {
    name,
    artist,
    album: typeof body.album === 'string' ? body.album : null,
    artwork: typeof body.artwork === 'string' ? body.artwork : null,
    setAt: Date.now(),
  }
  return NextResponse.json({ success: true })
}
