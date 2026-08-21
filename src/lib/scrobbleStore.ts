/**
 * Where scrobbles go.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE DEFAULT IMPLEMENTATION IS IN MEMORY AND IS NOT PERSISTENCE.
 *
 * It is gone on restart, and on a serverless host (Vercel, Netlify) each
 * instance has its own copy — so a scrobble written by one request may be
 * invisible to the next. It exists so that a fresh fork ACCEPTS scrobbles
 * correctly and you can watch the round trip work, not so you can keep a
 * year of listening in it.
 *
 * Swapping it is meant to be one file. Implement the same three functions
 * against Postgres, SQLite, Redis, a JSON file on a VPS — anything that
 * outlives the process — and every route keeps working untouched.
 * docs/data-sources.md has the recipes.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface Scrobble {
  name: string
  artist: string
  album: string | null
  artwork: string | null
  /** ms since epoch — when the play STARTED */
  playedAt: number
  durationMs: number
}

/** Two plays of the same track this close together are the same play. */
const DEDUPE_WINDOW_MS = 60_000

const store: Scrobble[] = []

/**
 * Returns false when this looked like a resend rather than a new play.
 *
 * Dedupe is not optional politeness. stylo retries a scrobble whose network
 * call failed, and its Recover flow resubmits older plays it thinks were
 * missed — so the same play genuinely does arrive twice, and a server that
 * takes both will inflate your history a little every time the tube goes
 * through a tunnel.
 */
export async function addScrobble(s: Scrobble): Promise<boolean> {
  const duplicate = store.some(
    (existing) =>
      existing.name === s.name &&
      existing.artist === s.artist &&
      Math.abs(existing.playedAt - s.playedAt) < DEDUPE_WINDOW_MS,
  )
  if (duplicate) return false

  store.push(s)
  store.sort((a, b) => b.playedAt - a.playedAt)
  return true
}

/** Backfills art for a play that arrived before its artwork resolved. */
export async function setArtwork(playedAt: number, artworkURL: string): Promise<boolean> {
  const match = store.find((s) => Math.abs(s.playedAt - playedAt) < DEDUPE_WINDOW_MS)
  if (!match) return false
  match.artwork = artworkURL
  return true
}

/** Newest first. `limit = 0` means none — used by the stats-only call. */
export async function listScrobbles(limit?: number): Promise<Scrobble[]> {
  if (limit === 0) return []
  return limit ? store.slice(0, limit) : store.slice()
}
