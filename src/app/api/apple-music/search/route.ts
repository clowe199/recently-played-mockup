import { NextResponse } from 'next/server'

// Live iTunes Search proxy — the public iTunes Search API needs no auth
// and returns artwork + 30s previews. The page hits this for cover art
// fallbacks and to surface preview clips when you click an album.

export const dynamic = 'force-dynamic'

interface ITunesResult {
  artworkUrl100?: string
  previewUrl?: string
  releaseDate?: string
  trackViewUrl?: string
  collectionViewUrl?: string
}

export async function GET(req: Request) {
  const url  = new URL(req.url)
  const term = url.searchParams.get('term') ?? ''
  const type = url.searchParams.get('type') ?? 'song' // 'song' | 'album'

  if (!term.trim()) return NextResponse.json({ results: [] })

  const entity = type === 'album' ? 'album' : 'song'
  const itunes = new URL('https://itunes.apple.com/search')
  itunes.searchParams.set('term',   term)
  itunes.searchParams.set('entity', entity)
  itunes.searchParams.set('limit',  '5')

  try {
    const res  = await fetch(itunes.toString(), { cache: 'no-store' })
    const data = await res.json()
    const results = (data.results as ITunesResult[] | undefined ?? []).map((r) => ({
      artwork:     r.artworkUrl100?.replace('100x100', '600x600') ?? null,
      previewUrl:  r.previewUrl ?? null,
      releaseDate: r.releaseDate ?? null,
      url:         r.trackViewUrl ?? r.collectionViewUrl ?? null,
    }))
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
