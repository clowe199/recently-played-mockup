# Recently Played — Mockup

A self-hostable Next.js mockup of the
[clowe.dev/music](https://clowe.dev/music) page. Fork it, theme it,
plug your own data in, ship a public listening profile at
`your-domain.com/music`.

This is the page the [CloweScrobbler iOS app](https://apps.apple.com)
self-host onboarding sends users to as a starting template — but it's
just a Next.js project, you can use it with anything that produces a
scrobble history.

## What's in it

- `src/app/music/page.tsx` — the full page: 3D CoverFlow album carousel,
  stats strip, now-playing indicator, audio preview player, per-album
  detail panel with track list. Framer Motion for animation.
- `src/app/api/apple-music/history` — stub endpoint returning bundled
  sample data so the page renders out-of-the-box. **Replace this** with
  your real history source.
- `src/app/api/apple-music/search` — live proxy to the public
  [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html)
  (no auth needed). Powers artwork fallbacks and 30s previews.
- `src/app/api/now-playing` — stub. Returns the top sample track so the
  LIVE strip shows. Wire to your real "currently playing" source.
- `src/app/api/spotify/search` — stub. Returns null; the page falls back
  to a generic Spotify search link.
- `src/lib/sampleHistory.ts` — the bundled sample data. Edit freely.

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/music`.

## Make it yours

1. **Swap the history source.** Edit
   [`src/app/api/apple-music/history/route.ts`](src/app/api/apple-music/history/route.ts)
   to read from your database, a Last.fm proxy, a Spotify export, or
   whatever you're scrobbling to. Keep the response shape the same and
   the page won't need any changes.
2. **Wire up now-playing** (optional). Edit
   [`src/app/api/now-playing/route.ts`](src/app/api/now-playing/route.ts)
   to return whatever your scrobbler reports is currently playing, or
   `{ track: null }` when nothing is.
3. **Theme it.** The accent color (`#fc3c44`, Apple Music red) appears
   throughout `page.tsx` — find/replace to rebrand. The dark canvas is
   `#0a0a0f` in `globals.css` and the page wrapper.
4. **Deploy.** Vercel, Railway, Render, Fly, or any Node host. No env
   vars are required for the mockup itself; add your own as you wire
   up real data.

## License

MIT. Fork freely.

## Credits

Original design + page by [clowe](https://clowe.dev). Sample track
data is for demonstration only.
