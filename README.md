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

Boards, threads and replies currently render from typed fixtures. The contracts in `resources/js/types/clover.ts` are shaped so components do not change when Eloquent replaces them.

## Features

- **Token foundation** &mdash; every colour authored once in OKLCH, mapped through Tailwind's `@theme` to both shadcn aliases and Clover-native utilities; dark by default with a fully authored light scope, and no neutral pure black or white
- **Component library** &mdash; 57 components across primitives, Clover-specific components and homepage sections, each built test-first
- **Overlays on Radix** &mdash; dialog, dropdown, context menu, tabs, tooltip and select, so focus trapping, roving tabindex and typeahead are correct rather than approximated
- **Command palette** &mdash; ⌘K / Ctrl+K over `cmdk`, net-new work the design prototype never covered
- **App chrome** &mdash; collapsible sidebar with persisted state, sticky header with account and notification menus, and a mobile bottom bar that respects the home-indicator inset
- **Community layer** &mdash; thread cards with a stretched-link target so vote buttons stay independently focusable, a recursive comment tree with real list semantics, collapse and a depth cap, and blessings and curses rather than upvotes
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

# 3. Run the dev server
composer dev
```

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

Work is sequenced into gated tasks. Each is built, reviewed, merged to `main` as one squashed commit, and verified on `main` before the next begins. **Current suite: 409 frontend tests, 85 backend tests.**

| Task | Scope | Status |
|---|---|---|
| 1 | Design foundation: OKLCH tokens, both theme scopes, two variable fonts, typed contracts | [Merged](https://github.com/NightServant/4chan-redesign/pull/4) |
| 2 | Core primitives and form controls | [Merged](https://github.com/NightServant/4chan-redesign/pull/7) |
| 3 | Overlays, navigation, feedback; command palette | [Merged](https://github.com/NightServant/4chan-redesign/pull/8) |
| 4 | App chrome and Inertia layouts; breadcrumbs and the shadcn sidebar removed | [Merged](https://github.com/NightServant/4chan-redesign/pull/9) |
| 5 | Community layer: thread cards, votes, comment tree, skeletons | [Merged](https://github.com/NightServant/4chan-redesign/pull/10) |
| 6 | Homepage, plus eleven information routes | [Merged](https://github.com/NightServant/4chan-redesign/pull/11) |
| 6.1 | Visual fixes from review: rail alignment, hero overlap, header backdrop | [Merged](https://github.com/NightServant/4chan-redesign/pull/12) |
| 7 | Feed and board pages, thread routing | Planned |
| 8 | Thread view and composer | Planned |
| 9 | Account, history, auth screens, error pages | Planned |
| 10 | The six screens the prototype never covered: settings, messages, bookmarks, communities, two-factor, passkeys | Planned |
| 11 | Backend data layer, replacing fixtures with Eloquent | Planned |

### Known gaps

- **No backend yet.** Boards, threads and replies render from fixtures in `resources/js/fixtures/`.
- **Thread routes do not exist.** `ThreadCard` accepts an `href` override so surfaces showing a card before Task 7 point somewhere real.
- **Authenticated screens are partly restyled.** `/dashboard` still renders starter-kit placeholders and the split auth layout bypasses the token layer. Tasks 7 and 9.

## Data notes

Board, thread and reply content is fixture data written for this project, in the product's voice. It is not scraped from 4chan and no real posts are reproduced. Attachments are never invented: media renders as a labelled placeholder carrying filename, dimensions and size rather than a stock photograph.

Fonts are Inter and Space Grotesk, both under the SIL Open Font License, vendored and subset to WOFF2. Icons are Lucide, ISC licensed.

## Licence

No licence has been chosen yet, so default copyright applies and the code is not yet free to reuse. A licence file will land before the project is considered finished.

Clover is an independent redesign exercise and is not affiliated with 4chan.
