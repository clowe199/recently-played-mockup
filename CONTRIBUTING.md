# Contributing

This is a small project. Contributions welcome but not expected.

## What's in scope

- **Bug fixes** to the page itself.
- **More data-source recipes** in [`docs/data-sources.md`](docs/data-sources.md).
  If you wired this up to YouTube Music, Tidal, Plex, Subsonic, or something
  else exotic, a PR adding the recipe is great.
- **Better documentation**. If you got stuck somewhere, that's evidence the
  docs failed — a PR fixing the part that tripped you up helps the next
  person.
- **Accessibility improvements**. Keyboard nav, screen reader labels,
  reduced-motion handling.

## What's out of scope

- **New features that bloat the page.** This is meant to be a starting
  point, not a Swiss army knife. If you're adding a tab system or a search
  bar, that's a fork, not a PR.
- **Build-system changes** (alternate bundlers, monorepo splits, etc.) —
  the deliberate simplicity is the point.
- **Adding a database, auth, or a scrobble-write path** as part of the
  default project. Document the pattern in `docs/`, but the mockup stays
  data-stub-first.

## How

1. Fork.
2. Branch off `main`.
3. Make the change.
4. Verify it builds (`npm run build`).
5. Open a PR with a one-paragraph description of what changed and why.

That's it.

## A note on style

The single-file `page.tsx` is intentional. Don't split it up.

The Tailwind classes are intentionally long and inline. Don't extract them
into `@apply` blocks or styled components.

The comments throughout the codebase favor explaining *why* over *what*.
Match that pattern.

## Reporting bugs

Open an issue with:

- A short description of what you expected vs what happened.
- Browser + OS, if it's a rendering issue.
- A link to a reproduction if you can — even a CodeSandbox of a reduced
  case helps.

For sensitive bug reports (e.g. an XSS in a recipe), email instead of filing
an issue.

---

That's the whole contributing guide. Be excellent.
