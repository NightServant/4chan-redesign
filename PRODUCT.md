# Product

## Register

product

The homepage hero is the one brand surface: treat it as brand when designing it, and everything behind it (feed, boards, threads, account) as product.

## Users

Anons who already read 4chan and want the same boards in an interface built for reading. They arrive from a shared thread link or the homepage, often on a phone, and mostly read; a minority sign in to reply, bookmark or follow boards. Reading needs no account, so the first screen has to work for someone who will never sign up.

## Product Purpose

Clover is a live mirror of 4chan's 77 boards: it reads 4chan's public API, refreshes through the day, and lays threads out for reading. Replies are nested under the post they answer, there is one feed across every board, and pages work on a phone. Success is a reader finding a thread and following a conversation without fighting the interface. Clover is not affiliated with 4chan and adds nothing that ranks people: no votes, no karma, no profiles of others.

## Brand Personality

Dry, precise, quiet. Copy states what is true and stops: specific, never cheerful, no marketing voice, no emoji. Confidence comes from showing real boards and real threads, not from claims. Empty states and errors are plain. The interface should feel like a well-made reading tool that gets out of the way.

## Anti-references

- The Reddit / social-feed look: votes and scores, karma, avatars and profiles, engagement bait, infinite autoplay feeds, "trending for you" algorithms. Clover has nothing to score and says so.

## Design Principles

1. **Words match what the code does.** No label, count or claim may describe more than its query does; copy changes ship with a test. A false sentence is a bug.
2. **Show the real thing.** Real boards, real threads, real counts. Never fabricate social proof, mock data or testimonials.
3. **Reading first.** Every decision is judged by whether it makes a thread easier to read and follow; anything that competes with reading loses.
4. **Quiet confidence.** One accent, used sparingly; hierarchy from type and space, not decoration.
5. **Anonymous by default.** Nothing identifies a reader to others; the product never asks for more than a reply needs.

## Accessibility & Inclusion

WCAG 2.2 AA: AA contrast in both themes, full keyboard use with visible focus, semantic headings and landmarks, 44px touch targets. Motion respects `prefers-reduced-motion`: marquees and transitions stop or simplify. Works from 320px up.
