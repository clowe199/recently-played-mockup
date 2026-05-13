import { NextResponse } from 'next/server'

// Stub Spotify search. Returns nothing — the page falls back to a
// "Search Spotify" link automatically. Wire this up to the Spotify
// Web API if you want exact-match Spotify links per track.

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ url: null })
}
