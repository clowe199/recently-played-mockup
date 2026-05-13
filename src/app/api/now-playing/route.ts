import { NextResponse } from 'next/server'
import { sampleHistory } from '@/lib/sampleHistory'

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
