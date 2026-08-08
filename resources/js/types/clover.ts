/**
 * Domain types for Clover.
 *
 * These mirror the shapes the design prototype renders. They are consumed by
 * the fixtures in `@/fixtures/clover` today and will be satisfied by Inertia
 * props from Eloquent models later — the components in between should not
 * need to change when that swap happens.
 */

/** Board slugs carry their delimiters, e.g. `/g/`. */
export type BoardSlug = `/${string}/`;

export interface Board {
    slug: BoardSlug;
    name: string;
    /** Pre-formatted for display, e.g. `41,208`. */
    online: string;
}

export interface Thread {
    /** Post number, rendered as `>>58210441`. */
    no: number;
    board: BoardSlug;
    boardName: string;
    /** Relative and pre-formatted, e.g. `4 min ago`. */
    time: string;
    title: string;
    excerpt?: string;
    blessings: number;
    replies: number;
    /** Pre-formatted for display, e.g. `48,201`. */
    views: string;
    /**
     * Media is never invented in mocks. When present this is the filename,
     * dimensions and size — rendered over the placeholder weave, not an image.
     */
    media: string | null;
    pinned: boolean;
}

/**
 * A reply within a thread. Replies nest, so this type is recursive.
 *
 * `quotes` holds the post numbers this reply is answering. Clover renders them
 * as `>>58210441` references rather than threading arrows, which is how the
 * board has always worked and is the one convention worth preserving.
 */
export interface Comment {
    no: number;
    /** Post numbers this reply quotes. Empty for a direct reply to the OP. */
    quotes: number[];
    /** Almost always `Anonymous`. A tripcode when an anon chose to sign. */
    author: string;
    /** Relative and pre-formatted, e.g. `4 min ago`. */
    time: string;
    body: string;
    blessings: number;
    /** True for the anon who opened the thread. */
    op: boolean;
    replies: Comment[];
}

export interface TrendingTag {
    tag: string;
    /** Pre-formatted, e.g. `4,182 posts`. */
    posts: string;
}

export interface ActivityEntry {
    /** Lucide icon name. */
    icon: string;
    text: string;
    time: string;
}

export interface HistoryEntry {
    no: number;
    board: BoardSlug;
    title: string;
    /** Absolute and pre-formatted, e.g. `Today, 14:02`. */
    when: string;
    /** Read progress, 0-100. */
    progress: number;
    media: string;
}
