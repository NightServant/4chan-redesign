<p align="center">
  <img src="public/favicon.svg" alt="Clover mark: a four-leaf clover on a brand-green rounded square" width="72" height="72"/>
</p>

<h1 align="center">Clover</h1>

<p align="center"><em>The same boards, threads and greentext. Without the 2003 interface.</em></p>

A redesign of 4chan built on Laravel, Inertia and React. Fly through boards that keep bump order instead of an algorithm, read threads where greentext still works, bless or curse a post without an account following you around, and browse it all in a design system authored once in OKLCH and derived into two themes.

## Overview

4chan's information architecture has aged well. Its interface has not.

Clover treats the underlying model as correct: anonymous posting, subject-scoped boards, bump-order ranking, human moderation. What changes is everything a person actually touches. A real type scale, a colour system where both themes fall out of one set of values, and components that are keyboard operable and readable by a screen reader, because an imageboard read at 2am on a phone is no place to be precious about accessibility.

The design lives in a Claude Design project and is treated as a blueprint, not a spec. Where the prototype and good practice disagree, good practice wins and the departure is written down. The prototype animates the sidebar's `width` on collapse, so the width snaps and only colour transitions. Its light theme sets button text to `#FFFFFF`, which measures 3.06:1 against the light green and fails WCAG AA, so the authored `#06130B` ships instead at 6.20:1. Its `Switch` animates `justify-content` to slide the thumb, so the thumb translates.

Some of it is not a port at all. The prototype has no command palette, no thread page and no composer: it stubs the last two with copy claiming the design system ships them, and it does not. Those are net-new work built to sit inside the system rather than beside it.

Boards, threads and posts are ingested from 4chan's read-only JSON API into Eloquent and reach the screens as Inertia props. Everything account-shaped — profiles, settings, two-factor, passkeys — is this application's own, so Clover is two data sources behind one set of typed contracts rather than a mirror.

## Features

- **Token foundation** &mdash; every colour authored once in OKLCH, mapped through Tailwind's `@theme` to both shadcn aliases and Clover-native utilities; dark by default with a fully authored light scope, and no neutral pure black or white
- **Component library** &mdash; 64 components across primitives, Clover-specific components, and page sections, each built test-first
- **Overlays on Radix** &mdash; dialog, dropdown, context menu, tabs, tooltip and select, so focus trapping, roving tabindex and typeahead are correct rather than approximated
- **Command palette** &mdash; ⌘K / Ctrl+K over `cmdk`, net-new work the design prototype never covered
- **App chrome** &mdash; collapsible sidebar with persisted state, sticky header with account and notification menus, and a mobile bottom bar that respects the home-indicator inset
- **Community layer** &mdash; thread cards with a stretched-link target so vote buttons stay independently focusable, a recursive comment tree with real list semantics, collapse and a depth cap, and blessings and curses rather than upvotes
- **Feed, boards and threads** &mdash; three feed sorts, a board page per slug with a real empty state, and a thread view that handles a post number matching nothing as an ordinary case rather than an error
- **Real data, read-only upstream** &mdash; 77 boards, their catalogs and their posts ingested from 4chan's JSON API by `clover:sync`, rate limited to one request a second and conditional on `If-Modified-Since`; nothing is ever written back
- **Greentext that works** &mdash; post bodies are parsed from 4chan's HTML to plain text on ingest, then rendered line by line with quote lines styled and `>>` references picked out, without `dangerouslySetInnerHTML` anywhere
- **Adult boards behind an opt-in** &mdash; `ws_board` drives it, the preference is account-level and off by default, and a board you have not opted into answers 404 rather than 403 so its existence is not confirmed
- **Imageboard URLs** &mdash; `/g/` is a board and `/g/109522303` a thread, constrained to the synced slug list so they cannot shadow the site's own pages
- **Composers that do not lie** &mdash; a reply form inline where replying belongs and a dialog for starting a thread, both refusing empty input, both enforcing the board's own `max_comment_chars` rather than one global guess, and both stating in the source that nothing is submitted yet
- **Marketing homepage** &mdash; hero, board grid, trending strip, features, and a footer whose every destination resolves to a real page
- **Accessibility as a build constraint** &mdash; focus rings never removed, state never carried by colour alone, tests asserting accessible names and keyboard paths instead of class strings
- **Motion that means something** &mdash; four duration tokens, exits at roughly 65% of their enter, layout properties never animated, and a reduced-motion rule asserted against the compiled stylesheet
- **Two variable fonts** &mdash; Inter and Space Grotesk, subset to WOFF2; no monospace ships, and machine values use Inter with tabular figures

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Laravel 13](https://laravel.com) · PHP 8.4 · [Inertia 3](https://inertiajs.com) |
| Frontend | [React 19](https://react.dev) · TypeScript 5.7 (strict) · [Vite 8](https://vite.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) (`@theme`, no config file) · class-variance-authority · tw-animate-css |
| Components | [Radix UI](https://radix-ui.com) primitives · [cmdk](https://cmdk.paco.me) · [Sonner](https://sonner.emilkowal.ski) · [Lucide](https://lucide.dev) icons |
| Auth | [Laravel Fortify](https://laravel.com/docs/fortify) · two-factor · passkeys |
| Routing | [Wayfinder](https://github.com/laravel/wayfinder) typed route helpers |
| Database | SQLite · Eloquent |
| Upstream data | [4chan read-only JSON API](https://github.com/4chan/4chan-API) · scheduled ingest |
| Testing | [Pest 4](https://pestphp.com) · [Vitest 4](https://vitest.dev) · Testing Library |
| Quality | Larastan (level 7) · Pint · ESLint 9 · Prettier 3 |

## Brand

The identity is one green on a near-black field. Space Grotesk carries the wordmark and headings, Inter carries body text, and machine values (post numbers, board slugs, byte counts) use Inter with tabular figures so digit columns hold still as counts change. There is no monospace font: tabular figures were what monospace was doing here anyway.

Green marks state and action. It is never a page background and never a large fill.

### Color palette

![Clover brand palette: dark and light scopes, one green on fog-tinted neutrals](docs/brand-palette.svg)

Colours are authored in OKLCH, which keeps lightness perceptually even across hues and lets both themes derive from one set of decisions. Hex below is the sRGB equivalent, for reference only. All tokens live in [`resources/css/app.css`](resources/css/app.css); components consume semantic utilities (`bg-surface`, `text-faint`, `border-border`), so the theme retunes in one place.

| Token | Role | OKLCH | Hex |
|---|---|---|---|
| Field | `--bg` (dark) | `oklch(14.18% 0.0042 165.2)` | `#080A09` |
| Surface | `--surface` (dark) | `oklch(19.06% 0.0074 164.1)` | `#111513` |
| Primary | `--primary` (dark) | `oklch(73.37% 0.1751 152.1)` | `#34C76F` |
| Text | `--text-primary` (dark) | `oklch(96.7% 0.0051 145.5)` | `#F2F5F2` |
| Muted | `--text-muted` (dark) | `oklch(70.61% 0.0143 152.5)` | `#9AA39C` |
| Field | `--bg` (light) | `oklch(97.71% 0.0034 145.5)` | `#F6F8F6` |
| Primary | `--primary` (light) | `oklch(64.67% 0.1552 151.9)` | `#2AA85C` |
| On primary | `--text-on-primary` | `oklch(17.12% 0.0256 156.5)` | `#06130B` |
| Danger | `--danger` (dark) | `oklch(66.51% 0.2046 27)` | `#F85149` |
| Warning | `--warning` (dark) | `oklch(74.53% 0.1453 85.2)` | `#D6A420` |

Two rules the palette enforces. No neutral is pure white or black, every one is tinted toward the brand hue so surfaces read as a family. And `--text-on-primary` stays dark in both themes: white on the light green measures 3.06:1 and fails WCAG AA, where the dark value measures 6.20:1. A test asserts this and fails if anyone reintroduces white.

### Brand icon

The mark is a single glyph, drawn once in [`resources/js/components/clover/wordmark.tsx`](resources/js/components/clover/wordmark.tsx) and reused wherever it appears:

- `Mark` &mdash; the glyph alone, used in the collapsed sidebar rail
- `Wordmark` &mdash; the glyph plus the word `clover`, always lowercase, used in the expanded sidebar, the homepage nav and the footer
- [`public/favicon.svg`](public/favicon.svg) &mdash; the same glyph in near-black on a brand-green rounded square

The prototype masks a PNG for the glyph. A raster mask cannot recolour cleanly across two themes and costs a request for one shape, so the app uses a vector icon that both themes can tint.

## Local setup

**Prerequisites:** PHP 8.4+, Node 22+, Composer. The database is SQLite and is created on first migrate. No API keys or paid accounts required.

```bash
# 1. Clone
git clone https://github.com/NightServant/4chan-redesign.git
cd 4chan-redesign

# 2. Install both dependency trees, copy .env, generate a key, migrate, build
composer setup

# 3. Pull real boards and threads from 4chan (one request a second)
php artisan clover:sync --with-posts

# 4. Run the dev server
composer dev
```

Without step 3 the site runs and every route resolves, but there are no boards
and the feed says so. `clover:sync --board=g --limit=5` is enough to see it
working without spending several minutes on a full sync.

Open [http://localhost:8000](http://localhost:8000). Served by [Laravel Herd](https://herd.laravel.com) at `https://4chan-redesign.test` if you use it.

> **Note:** the site renders without a running queue or cache. If a page 500s after a fresh pull, run `npm run build` first: Pest asserts against the compiled stylesheet and skips those checks when assets are unbuilt.

### Useful commands

```bash
composer ci:check        # everything CI runs, in one command

npm run test:js          # Vitest
php artisan test         # Pest
npm run types:check      # tsc --noEmit
composer types:check     # Larastan, level 7
npm run lint             # ESLint, with --fix
npm run format           # Prettier
vendor/bin/pint          # PHP formatting
```

## Progress

Work is sequenced into gated tasks. Each is built, reviewed, merged to `main` as one squashed commit, and verified on `main` before the next begins. **Current suite: 835 frontend tests, 212 backend tests.**

| Task | Scope | Status |
|---|---|---|
| 1 | Design foundation: OKLCH tokens, both theme scopes, two variable fonts, typed contracts | [Merged](https://github.com/NightServant/4chan-redesign/pull/4) |
| 2 | Core primitives and form controls | [Merged](https://github.com/NightServant/4chan-redesign/pull/7) |
| 3 | Overlays, navigation, feedback; command palette | [Merged](https://github.com/NightServant/4chan-redesign/pull/8) |
| 4 | App chrome and Inertia layouts; breadcrumbs and the shadcn sidebar removed | [Merged](https://github.com/NightServant/4chan-redesign/pull/9) |
| 5 | Community layer: thread cards, votes, comment tree, skeletons | [Merged](https://github.com/NightServant/4chan-redesign/pull/10) |
| 6 | Homepage, plus eleven information routes | [Merged](https://github.com/NightServant/4chan-redesign/pull/11) |
| 6.1 | Visual fixes from review: rail alignment, hero overlap, header backdrop | [Merged](https://github.com/NightServant/4chan-redesign/pull/12) |
| 7 | Feed and board pages; board and thread routing | [Merged](https://github.com/NightServant/4chan-redesign/pull/15) |
| 8 | Thread view, reply composer, new-thread dialog, auth gate | [Merged](https://github.com/NightServant/4chan-redesign/pull/16) |
| 8.1 | Review fixes: Home resolves by auth state, feed sort tabs removed | [Merged](https://github.com/NightServant/4chan-redesign/pull/17) |
| 9 | Account, history, auth screens, error pages | [Merged](https://github.com/NightServant/4chan-redesign/pull/19) |
| 10 | The six screens the prototype never covered: settings, messages, bookmarks, communities, two-factor, passkeys | [Merged](https://github.com/NightServant/4chan-redesign/pull/19) |
| 11a | Read layer: ingest from 4chan's API, board and thread models, per-board limits, mature-board gating | In review |
| 11b | Account layer: bookmarks, history, messages, blessings and curses, local posting | Planned |

The app is navigable end to end: homepage, feed, board, thread, reply. Every link resolves.

### Known gaps

- **Nothing submits yet.** The API upstream is read-only, so posting is Clover's own and lands in task 11b along with blessings, bookmarks, history and messages. Composers hold local state and say so rather than faking a post that vanishes on reload.
- **The feed does not page.** It is one query with a limit. The previous "Load more" was removed rather than kept, because it showed two skeletons and put itself back — paging a server-backed feed needs a cursor on the prop.
- **Account-shaped fixtures remain** in `resources/js/fixtures/clover.ts`: profile, history, bookmarks, conversations and activity. Task 11b replaces them.
- **Nothing has been checked in a browser by eye.** Every route is asserted to render, but the visual review of task 11a has not happened.
- **`php artisan route:cache` freezes the board list.** The `/{board}` constraint is built from the synced table, so a deployment that caches routes must re-cache them after a sync adds boards.

## Data notes

Board, thread and post content is **real, and comes from 4chan**, via its [read-only JSON API](https://github.com/4chan/4chan-API). It is fetched server-side, at most one request a second with `If-Modified-Since` as the API's documentation asks, and nothing is ever sent upstream — the API accepts `GET`, `HEAD` and `OPTIONS` only. Everything an anon does here stays in this application's database.

Post bodies are parsed to plain text on the way in. The API returns `com` as HTML written by anonymous strangers, so it is converted once during ingest rather than trusted into the DOM at render time; there is no `dangerouslySetInnerHTML` anywhere in the app.

**Attachments are metadata only.** The API reports a real filename, extension, dimensions and byte size, and those are what the placeholder renders. No image is fetched, hotlinked or displayed.

Boards 4chan marks `ws_board: 0` are hidden unless an anon opts in, and a signed-out visitor always gets the filtered view. Requesting one you have not opted into returns 404 rather than 403, so the board's existence is not confirmed to someone who asked not to see boards like it.

Two figures the design carried were removed rather than estimated, because the API publishes neither at any scope: a per-board "anons online" count, and per-thread views. Where a number has no source it is not shown. The same rule governs copy: the rail's moderation panel no longer claims a board is under slow mode, because nothing upstream reports moderation state.

Fonts are Inter and Space Grotesk, both under the SIL Open Font License, vendored and subset to WOFF2. Icons are Lucide, ISC licensed.

## Licence

No licence has been chosen yet, so default copyright applies and the code is not yet free to reuse. A licence file will land before the project is considered finished.

Clover is an independent redesign exercise and is not affiliated with 4chan.
