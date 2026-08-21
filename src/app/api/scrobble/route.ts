import { NextResponse, type NextRequest } from 'next/server'
import { isAuthorized, authFailureReason } from '@/lib/auth'
import { addScrobble } from '@/lib/scrobbleStore'

/**
 * POST /api/scrobble — receive one finished play.
 *
 * The endpoint the stylo iOS app needs in order to record anything. Until
 * this existed, a fork deployed from docs/deploy.md would pass stylo's
 * connection test — that test calls the history stub, which was already
 * here — and then 404 every scrobble, so setup looked successful and no
 * history ever appeared.
 *
 * Contract: docs/stylo-api.md
 */

export const dynamic = 'force-dynamic'

interface Body {
  name?: unknown
  artist?: unknown
  album?: unknown
  artwork?: unknown
  playedAt?: unknown
  durationMs?: unknown
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: authFailureReason(req) }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const name = str(body.name)
  const artist = str(body.artist)
  const playedAt = num(body.playedAt)
  const durationMs = num(body.durationMs)

  if (!name || !artist || playedAt === null || durationMs === null) {
    return NextResponse.json(
      { error: 'name, artist, playedAt and durationMs are required.' },
      { status: 400 },
    )
  }

  // Milliseconds, not seconds. A client sending seconds lands in 1970 and
  // the play quietly sorts to the bottom of your history forever, so it is
  // worth rejecting rather than storing.
  if (playedAt < 1_000_000_000_000) {
    return NextResponse.json(
      { error: 'playedAt must be milliseconds since epoch, not seconds.' },
      { status: 400 },
    )
  }

  const inserted = await addScrobble({
    name,
    artist,
    album: str(body.album),
    artwork: str(body.artwork),
    playedAt,
    durationMs,
  })

  // `inserted: false` is a success, not an error — it means this was
  // recognised as a resend. stylo shows that as "deduped" rather than a
  // failure, so answering honestly keeps its log accurate.
  return NextResponse.json({ success: true, inserted })
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
