# Recently Played

> A self-hostable music profile page. Fork it, theme it, plug your own data in,
> share `your-domain.com/music`.

This is the public listening history page from [clowe.dev/music](https://clowe.dev/music) —
extracted, cleaned up, and packaged as a Next.js template you can run in about
two minutes and ship in about ten.

```
$ git clone https://github.com/clowe199/recently-played-mockup
$ cd recently-played-mockup && npm install && npm run dev
$ open http://localhost:3000
```

That's it. No env vars. No database. It works.

---

## What you're getting

A single beautifully-animated page at `/music`:

- A **3D CoverFlow** album carousel — keyboard, touch, and click controls
- A **stats strip** — total plays, unique tracks, time listened
- A **now-playing indicator** with a synced visualizer, for when something is
  actively spinning
- A **per-album detail panel** with track list, repeat-rate stats, and 30-second
  audio previews (powered by the public iTunes Search API — no auth needed)
- A **theme that auto-adapts** to the album's artwork — ambient blurred cover
  art behind everything

All of it bundled into a clean Next.js 15 app with TypeScript, Tailwind, and
Framer Motion. No build secrets, no proprietary fonts, MIT licensed.

> **Heads up.** The bundled data is just sample tracks — Catfish and the
> Bottlemen, MGMT, Fleetwood Mac, the classics. You're meant to replace it.
> See [Wire up your data](docs/data-sources.md).

---

## See it live

[**clowe.dev/music**](https://clowe.dev/music) — the production deploy this
template was extracted from. Same page, real data.

## Deploy your own

One click, three providers:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?template=https%3A%2F%2Fgithub.com%2Fclowe199%2Frecently-played-mockup&referralCode=PoO3nM)
&nbsp;
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fclowe199%2Frecently-played-mockup)

Full deploy walkthroughs (including Fly, Docker, and bare-metal Node) live
in [docs/deploy.md](docs/deploy.md).

---

## Where to go next

| Guide | What it covers |
| --- | --- |
| [**Getting started**](docs/getting-started.md) | First five minutes, including the one knob worth touching before you do anything else |
| [**Customize**](docs/customize.md) | Theme colors, fonts, copy — making it yours without forking the universe |
| [**Wire up your data**](docs/data-sources.md) | Recipes for plugging in real listening history: Last.fm, Spotify export, a Postgres DB, your own scrobbler |
| [**Deploy**](docs/deploy.md) | Railway, Vercel, Fly, Docker, bare-metal Node — pick your fighter |
| [**Architecture**](docs/architecture.md) | How the page is built and why it animates the way it does |
| [**stylo API**](docs/stylo-api.md) | The endpoints the stylo iOS app calls — and which of them this repo does *not* implement yet |

If you just want to get a feel for the code, the entire UI is in one file:
[`src/app/music/page.tsx`](src/app/music/page.tsx). 1,200 lines, no
indirection, ctrl-F-friendly. Open it and read top to bottom.

---

## Where it came from

This page is the `/music` route of [clowe.dev](https://clowe.dev), which feeds
off the [CloweScrobbler](https://github.com/clowe199) iOS app — an app that
watches Apple Music on a phone and scrobbles every play back to the user's own
server. The iOS app's onboarding lets users either point at the author's
hosted endpoint or self-host their own. This repo is the "self-host their own"
recommendation: a starting point with the UI already designed, so the only
thing left to build is the data pipe.

But you don't need any of that context to use this. If you've got a list of
songs and a deploy target, you have everything you need.

---

## License

MIT. Do whatever you want. A mention back is appreciated but not required.

## Credits

Design and original implementation: [clowe](https://clowe.dev).
Album previews: the [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/).
Sample data: a small slice of the author's actual listening history,
because writing fake song titles is harder than it sounds.
