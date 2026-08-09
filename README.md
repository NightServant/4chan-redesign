# Clover

**A 4chan redesign. Same boards, threads and greentext, without the 2003 interface.**

Clover keeps what imageboards got right, anonymity, boards instead of followers,
and no algorithmic timeline, and rebuilds the surface around it. It is a
Laravel 13 + Inertia + React application, ported from a design system rather
than styled ad hoc.

> **Status: in progress.** The design system and the public pages are built and
> tested. The backend data layer is not, so threads and boards currently render
> from typed fixtures. See [Progress track](#progress-track).

---

## Overview

4chan's information architecture has aged well. Its interface has not.

Clover is a front-to-back redesign that treats the underlying model as correct:
anonymous posting, subject-scoped boards, bump-order ranking, human moderation.
What changes is everything a person actually touches. A real type scale. A
colour system authored in OKLCH so both themes are derived from one set of
values. Components that are keyboard operable and readable by a screen reader,
because an imageboard read at 2am on a phone is not a place to be precious about
accessibility.

The design lives in a Claude Design project and is treated as a **blueprint, not
a spec**. Where the prototype and good practice disagree, good practice wins,
and the departure gets written down. Three examples that shipped:

- The prototype animates the sidebar's `width` on collapse. Animating layout
  properties causes jank, so the width snaps and only colour transitions.
- Its light theme sets button text to `#FFFFFF`, which is **3.06:1** against the
  light green and fails WCAG AA. The authored `#06130B` gives **6.20:1** and is
  what ships.
- Its `Switch` animates `justify-content` to slide the thumb. The thumb
  translates instead.

---

## Features

### The product

**Anonymous by default.** Any board is readable without an account. Posting,
commenting and blessing require one, and posts are still signed Anonymous. An
account is an identity for moderation, not a profile for an audience.

**Boards, not follows.** You subscribe to subjects. Nobody accumulates
followers, so nobody optimises for them.

**Blessings and curses.** Ranking is bump order plus blessings; curses sink a
thread and replies bump it back up. There is no recommendation feed deciding
what you see. The vocabulary is deliberate and enforced throughout the codebase:
a vote is a blessing or a curse, never an upvote.

**Janitors, not bots.** Moderation is scoped to boards and performed by people,
with a public action log.

**Greentext preserved.** Markdown, quotes and `>greentext` work the way they
always have.

**Fast on purpose.** No infinite scroll, no autoplay, no tracking scripts.

### The implementation

**One token layer, two themes.** Every colour is authored once in OKLCH and
mapped through Tailwind's `@theme` to both shadcn aliases and Clover-native
utilities. Dark is the default; light is a first-class, fully authored scope,
not an inversion. No neutral is pure `#000` or `#fff`, every one carries a
slight green tint so surfaces separate without borders doing all the work.

**A tested component library.** 57 components across three namespaces:
primitives (`ui/`), Clover-specific components (`clover/`), and homepage
sections (`home/`). Overlays and menus are built on Radix, so focus trapping,
roving tabindex and typeahead are correct rather than approximated.

**Accessibility as a build constraint.** Focus indicators are never removed.
State is never conveyed by colour alone. The comment tree renders as real nested
lists so depth and position reach a screen reader. Tests assert accessible names
and keyboard paths, not class strings.

**A command palette.** ⌘K / Ctrl+K, built on `cmdk`. Net-new work: the design
prototype has no palette.

**Two variable fonts, subset to WOFF2.** Inter for text, Space Grotesk for
display. No monospace font ships; machine values use Inter with tabular figures,
which is what monospace was doing here anyway.

**Motion that means something.** Four duration tokens, exits at roughly 65% of
their enter, layout properties never animated, and a global
`prefers-reduced-motion` rule that is asserted against the compiled stylesheet
rather than assumed.

---

## Brand colour palette

One green on a near-black field. Green marks state and action; it is **never** a
page background or a large fill. Values are authored in OKLCH, which keeps
lightness perceptually even across hues and makes the two themes derivable from
one set of decisions. Hex below is the sRGB equivalent, for reference only.

### Dark (default)

| | Token | Hex | OKLCH | Role |
|---|---|---|---|---|
| ![](https://placehold.co/18x18/080A09/080A09.png) | `--bg` | `#080A09` | `14.18% 0.0042 165.2` | Page field |
| ![](https://placehold.co/18x18/111513/111513.png) | `--surface` | `#111513` | `19.06% 0.0074 164.1` | Cards, rails |
| ![](https://placehold.co/18x18/171C19/171C19.png) | `--surface-elevated` | `#171C19` | `22.01% 0.0095 159.2` | Menus, dialogs |
| ![](https://placehold.co/18x18/1B241E/1B241E.png) | `--border-hairline` | `#1B241E` | `24.93% 0.0171 155.8` | Dividers |
| ![](https://placehold.co/18x18/34C76F/34C76F.png) | `--primary` | `#34C76F` | `73.37% 0.1751 152.1` | Action, active state |
| ![](https://placehold.co/18x18/F2F5F2/F2F5F2.png) | `--text-primary` | `#F2F5F2` | `96.7% 0.0051 145.5` | Body text |
| ![](https://placehold.co/18x18/9AA39C/9AA39C.png) | `--text-muted` | `#9AA39C` | `70.61% 0.0143 152.5` | Secondary text |
| ![](https://placehold.co/18x18/75807A/75807A.png) | `--text-faint` | `#75807A` | `58.89% 0.0158 162.2` | Machine values |
| ![](https://placehold.co/18x18/F85149/F85149.png) | `--danger` | `#F85149` | `66.51% 0.2046 27` | Destructive |
| ![](https://placehold.co/18x18/D6A420/D6A420.png) | `--warning` | `#D6A420` | `74.53% 0.1453 85.2` | Caution |

### Light

| | Token | Hex | OKLCH | Role |
|---|---|---|---|---|
| ![](https://placehold.co/18x18/F6F8F6/F6F8F6.png) | `--bg` | `#F6F8F6` | `97.71% 0.0034 145.5` | Page field |
| ![](https://placehold.co/18x18/FBFEFC/FBFEFC.png) | `--surface` | `#FBFEFC` | `99.4% 0.004 150` | Cards, rails |
| ![](https://placehold.co/18x18/DFE5E0/DFE5E0.png) | `--border-hairline` | `#DFE5E0` | `91.59% 0.0093 150.7` | Dividers |
| ![](https://placehold.co/18x18/2AA85C/2AA85C.png) | `--primary` | `#2AA85C` | `64.67% 0.1552 151.9` | Action, active state |
| ![](https://placehold.co/18x18/06130B/06130B.png) | `--text-on-primary` | `#06130B` | `17.12% 0.0256 156.5` | Text on green |
| ![](https://placehold.co/18x18/0D1411/0D1411.png) | `--text-primary` | `#0D1411` | `18.28% 0.0123 166.9` | Body text |
| ![](https://placehold.co/18x18/4C574F/4C574F.png) | `--text-muted` | `#4C574F` | `44.45% 0.0189 154` | Secondary text |
| ![](https://placehold.co/18x18/C93A32/C93A32.png) | `--danger` | `#C93A32` | `56.06% 0.1812 27.8` | Destructive |

**Two rules the palette enforces.** No neutral is pure white or black, every one
is tinted toward the brand hue, so surfaces read as a family. And
`--text-on-primary` stays dark in both themes: white on the light green measures
3.06:1 and fails WCAG AA, where the dark value measures 6.20:1. A test asserts
this and will fail if anyone reintroduces white.

---

## Technology stack

### Backend

| | |
|---|---|
| PHP | 8.4 |
| Laravel | 13 |
| Inertia (Laravel adapter) | 3 |
| Laravel Fortify | 1 (auth, two-factor, passkeys) |
| Laravel Wayfinder | 0.1 (typed route helpers for the client) |
| Pest | 4 |
| Larastan | 3 (level 7) |
| Pint | 1 |

### Frontend

| | |
|---|---|
| React | 19 |
| TypeScript | 5.7, strict |
| Inertia (React adapter) | 3 |
| Tailwind CSS | 4 (`@theme`, no config file) |
| Vite | 8 |
| class-variance-authority | 0.7 (component variants) |
| Radix UI | dialog, dropdown, context menu, select, tabs, tooltip, checkbox |
| cmdk | 1.1 (command palette) |
| Sonner | 2 (toasts) |
| Lucide | icons, the only glyph source; no emoji anywhere |
| Vitest + Testing Library | 4 / 16 |
| ESLint 9, Prettier 3 | |

### Tooling

Laravel Herd for local serving, GitHub Actions for CI. Every pull request runs
type analysis, the JS suite, the PHP suite, lint and format checks across PHP
8.4 and 8.5. `main` is protected: squash merges only, linear history, three
required green checks.

---

## Progress track

Work is sequenced into gated tasks. Each is built, reviewed, merged to `main` as
a single squashed commit, and verified on `main` before the next begins.

### Done

| Task | What landed | PR |
|---|---|---|
| **1** | **Design foundation.** OKLCH token layer, both theme scopes, two variable fonts, typed domain contracts and fixtures. | [#4](https://github.com/NightServant/4chan-redesign/pull/4) |
| **2** | **Core primitives and form controls.** Button, Card, Badge, Input, Textarea, Select, Checkbox, Tag, avatars, form and search fields. | [#7](https://github.com/NightServant/4chan-redesign/pull/7) |
| **3** | **Overlays, navigation, feedback.** Dialog, MenuSurface family, Dropdown, ContextMenu, CommandPalette, Toast, NotificationItem, Tabs, Pagination. | [#8](https://github.com/NightServant/4chan-redesign/pull/8) |
| **4** | **App chrome and layouts.** Collapsible sidebar, sticky header, mobile bottom bar, eight stub routes. Breadcrumbs and the shadcn sidebar primitive removed. | [#9](https://github.com/NightServant/4chan-redesign/pull/9) |
| **5** | **Community layer.** ThreadCard, VoteControl, MediaPlaceholder, CommentTree, Panel, Switch, Progress, Tooltip, Skeleton. | [#10](https://github.com/NightServant/4chan-redesign/pull/10) |
| **6** | **Homepage.** Nav, hero, boards, trending, features, how it works, footer. Eleven information routes added. | [#11](https://github.com/NightServant/4chan-redesign/pull/11) |
| **6.1** | **Visual fixes.** Sidebar rail alignment, hero card overlap, header backdrop blur, and a missing `--color-bg` token that left every sticky surface transparent. | [#12](https://github.com/NightServant/4chan-redesign/pull/12) |

**Current suite: 409 frontend tests, 85 backend tests.** Every component is
built test-first.

### Planned

| Task | Scope |
|---|---|
| **7** | Feed and board pages, thread routing |
| **8** | Thread view and composer |
| **9** | Account, history, auth screens and error pages |
| **10** | Design and build the six screens the prototype never covered: settings, messages, bookmarks, communities, two-factor, passkeys |
| **11** | Backend data layer, replacing fixtures with Eloquent |

### Known gaps

- **No backend yet.** Boards, threads and replies render from typed fixtures in
  `resources/js/fixtures/`. The contracts in `resources/js/types/clover.ts` are
  designed so components do not change when Eloquent replaces them.
- **Thread routes do not exist.** `ThreadCard` accepts an `href` override so
  surfaces that show a card before Task 7 can point it somewhere real.
- **Authenticated screens are only partly restyled.** `/dashboard` still renders
  starter-kit placeholders, and the split auth layout bypasses the token layer.
  Tasks 7 and 9 respectively.

---

## Local development

Requires PHP 8.4+, Node 22+ and Composer. The database is SQLite, created on
first migrate.

```bash
composer setup
```

That installs both dependency trees, copies `.env`, generates a key, migrates
and builds assets. Then:

```bash
composer dev
```

Served by [Laravel Herd](https://herd.laravel.com) at `https://4chan-redesign.test`.

### Checks

```bash
composer ci:check        # everything CI runs, in one command
```

Or individually:

```bash
npm run test:js          # Vitest
php artisan test         # Pest
npm run types:check      # tsc --noEmit
composer types:check     # Larastan (PHPStan level 7)
npm run lint             # ESLint, with --fix
npm run format           # Prettier
vendor/bin/pint          # PHP formatting
```

---

## Licence

No licence has been chosen yet, so default copyright applies and the code is not
yet free to reuse. A licence file will land before the project is considered
finished.

Clover is an independent redesign exercise and is not affiliated with 4chan.
