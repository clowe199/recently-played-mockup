import { NextResponse } from 'next/server'
import { sampleHistory, sampleStats } from '@/lib/sampleHistory'

// Stub history endpoint. Returns the bundled sample data so the /music
// page renders out-of-the-box. Replace the body of GET() with a real
// lookup (database, scrobbler service, Last.fm proxy, etc.) — keep the
// response shape the same and the page won't need any changes.

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    totalTracks:   sampleStats.totalTracks,
    uniqueTracks:  sampleStats.uniqueTracks,
    uniqueArtists: sampleStats.uniqueArtists,
    totalMinutes:  sampleStats.totalMinutes,
    history:       sampleHistory,
  })
}
