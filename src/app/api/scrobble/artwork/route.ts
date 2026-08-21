import { NextResponse, type NextRequest } from 'next/server'
import { isAuthorized, authFailureReason } from '@/lib/auth'
import { setArtwork } from '@/lib/scrobbleStore'

/**
 * PATCH /api/scrobble/artwork — backfill cover art for a play already stored.
 *
 * A track can finish before its artwork URL has resolved, so the scrobble
 * arrives without one and the art follows a moment later. Matched on
 * `playedAt`, which is the only stable identifier the client has for a play.
 */

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: authFailureReason(req) }, { status: 401 })
  }

  let body: { playedAt?: unknown; artworkURL?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const playedAt = typeof body.playedAt === 'number' ? body.playedAt : null
  const artworkURL =
    typeof body.artworkURL === 'string' && body.artworkURL.trim()
      ? body.artworkURL.trim()
      : null

  if (playedAt === null || !artworkURL) {
    return NextResponse.json(
      { error: 'playedAt (ms) and artworkURL are required.' },
      { status: 400 },
    )
  }

  const updated = await setArtwork(playedAt, artworkURL)
  // A miss is not an error. The play may predate this store, or have been
  // deduped away — either way there is nothing to repair and nothing broke.
  return NextResponse.json({ success: true, updated })
}
