// Sample listening history used by the stub API routes. Swap this out
// for a real data source (database, scrobbler endpoint, etc.) — the
// shape is what the /music page expects.

export interface SampleTrack {
  name: string
  artist: string
  album: string
  /** Apple Music / iTunes CDN URL. Leave null to fall back to the
   *  iTunes Search lookup in /api/apple-music/search. */
  artwork: string | null
  /** Open-in-Apple-Music link, optional. */
  url: string | null
  /** ms since epoch */
  playedAt: number
  /** track length in ms, optional but enables duration formatting */
  durationMs?: number
}

const HOURS = 60 * 60 * 1000

// Use offsets from "now" so the page always shows fresh-looking timestamps
// no matter when someone clones the repo.
const now = () => Date.now()

export const sampleHistory: SampleTrack[] = [
  { name: 'Cocoon',         artist: 'Catfish and the Bottlemen', album: 'The Balcony',  artwork: null, url: null, playedAt: now() - 0.05 * HOURS, durationMs: 232000 },
  { name: 'Kathleen',       artist: 'Catfish and the Bottlemen', album: 'The Balcony',  artwork: null, url: null, playedAt: now() - 0.20 * HOURS, durationMs: 215000 },
  { name: 'Pacifier',       artist: 'Catfish and the Bottlemen', album: 'The Balcony',  artwork: null, url: null, playedAt: now() - 0.40 * HOURS, durationMs: 226000 },
  { name: 'Sweater Weather',artist: 'The Neighbourhood',         album: 'I Love You.',  artwork: null, url: null, playedAt: now() - 1.10 * HOURS, durationMs: 240000 },
  { name: 'Afraid',         artist: 'The Neighbourhood',         album: 'I Love You.',  artwork: null, url: null, playedAt: now() - 1.45 * HOURS, durationMs: 198000 },
  { name: 'Electric Feel',  artist: 'MGMT',                      album: 'Oracular Spectacular', artwork: null, url: null, playedAt: now() - 3 * HOURS, durationMs: 229000 },
  { name: 'Time to Pretend',artist: 'MGMT',                      album: 'Oracular Spectacular', artwork: null, url: null, playedAt: now() - 3.5 * HOURS, durationMs: 257000 },
  { name: 'Kids',           artist: 'MGMT',                      album: 'Oracular Spectacular', artwork: null, url: null, playedAt: now() - 4 * HOURS, durationMs: 302000 },
  { name: 'Pumped Up Kicks',artist: 'Foster The People',         album: 'Torches',      artwork: null, url: null, playedAt: now() - 5 * HOURS, durationMs: 240000 },
  { name: 'Houdini',        artist: 'Foster The People',         album: 'Torches',      artwork: null, url: null, playedAt: now() - 5.4 * HOURS, durationMs: 261000 },
  { name: 'Helena Beat',    artist: 'Foster The People',         album: 'Torches',      artwork: null, url: null, playedAt: now() - 6 * HOURS, durationMs: 244000 },
  { name: 'Mr. Brightside', artist: 'The Killers',               album: 'Hot Fuss',     artwork: null, url: null, playedAt: now() - 8 * HOURS, durationMs: 222000 },
  { name: 'Somebody Told Me',artist: 'The Killers',              album: 'Hot Fuss',     artwork: null, url: null, playedAt: now() - 8.5 * HOURS, durationMs: 197000 },
  { name: 'Are We Still Friends?', artist: 'Tyler, The Creator', album: 'IGOR',         artwork: null, url: null, playedAt: now() - 10 * HOURS, durationMs: 257000 },
  { name: 'EARFQUAKE',      artist: 'Tyler, The Creator',        album: 'IGOR',         artwork: null, url: null, playedAt: now() - 10.4 * HOURS, durationMs: 190000 },
  { name: 'I THINK',        artist: 'Tyler, The Creator',        album: 'IGOR',         artwork: null, url: null, playedAt: now() - 11 * HOURS, durationMs: 228000 },
  { name: 'Redbone',        artist: 'Childish Gambino',          album: 'Awaken, My Love!', artwork: null, url: null, playedAt: now() - 14 * HOURS, durationMs: 326000 },
  { name: 'Me and Your Mama',artist: 'Childish Gambino',         album: 'Awaken, My Love!', artwork: null, url: null, playedAt: now() - 14.5 * HOURS, durationMs: 387000 },
  { name: 'Stand By Me',    artist: 'Ben E. King',               album: "Don't Play That Song!", artwork: null, url: null, playedAt: now() - 22 * HOURS, durationMs: 178000 },
  { name: 'Dreams',         artist: 'Fleetwood Mac',             album: 'Rumours',      artwork: null, url: null, playedAt: now() - 26 * HOURS, durationMs: 257000 },
  { name: 'The Chain',      artist: 'Fleetwood Mac',             album: 'Rumours',      artwork: null, url: null, playedAt: now() - 27 * HOURS, durationMs: 270000 },
  { name: 'Go Your Own Way',artist: 'Fleetwood Mac',             album: 'Rumours',      artwork: null, url: null, playedAt: now() - 28 * HOURS, durationMs: 218000 },
]

export const sampleStats = {
  totalTracks: 1247,
  uniqueTracks: 382,
  uniqueArtists: 156,
  totalMinutes: 64 * 60 + 12, // 64h 12m
}
