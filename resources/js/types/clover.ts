/**
 * Domain types for Clover.
 *
 * These mirror the shapes the design prototype renders and are satisfied by
 * Inertia props from Eloquent models. Board, thread and post rows are ingested
 * from 4chan's read-only JSON API by `clover:sync`; everything account-shaped
 * is this application's own.
 *
 * Two fields changed when the real API replaced the fixtures, both because the
 * fixture carried a number nothing upstream publishes: `Board.online` became
 * `Board.threads`, and `Thread.views` became `Thread.images`. The rule that
 * forced it is the same one that governs attachments — a figure with no source
 * is not displayed, and it is certainly not invented.
 */

/** Board slugs carry their delimiters, e.g. `/g/`. */
export type BoardSlug = `/${string}/`;

export interface Board {
    slug: BoardSlug;
    name: string;
    /**
     * Live thread count on the board. Pre-formatted, e.g. `18,402`.
     *
     * This was an "anons online" figure while the screens ran on fixtures.
     * 4chan's JSON API publishes no online count — not per board and not
     * site-wide — so keeping the field would have meant inventing the number
     * on every render. Thread count is the closest thing the API does report,
     * and it is counted rather than estimated.
     */
    threads: string;
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
    /**
     * Blessings are Clover's own, not 4chan's: the board has no votes to
     * import, so this counts what anons here have given. Zero on an ingested
     * thread nobody has blessed yet, which is a true zero rather than a
     * missing value.
     */
    blessings: number;
    replies: number;
    /**
     * Attached images on the thread. Pre-formatted, e.g. `48`.
     *
     * Was a view count under fixtures. Nothing upstream counts views and
     * nothing here counted them either, so the card reports something the
     * API actually returns instead of a number with no source.
     */
    images: string;
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

/**
 * The anon whose account this is.
 *
 * Every field here is account-scoped, never post-scoped: the whole point of
 * the product is that a post carries none of it. `handle` names the account,
 * and `tripcode` is the opt-in signature an anon may attach to a post — the
 * only thing on this type that can ever appear beside something they wrote.
 */
export interface Profile {
    handle: string;
    /** Opt-in post signature, e.g. `!!Xk29fLp2`. Null when never set. */
    tripcode: string | null;
    bio: string;
    /** Absolute and pre-formatted, e.g. `14 Mar 2024`. */
    joined: string;
    /** Boards this anon janitors. Empty for anons who do not. */
    janitorScope: BoardSlug[];
}

/**
 * A counted figure on the profile header. Pre-formatted, because the
 * separator is a display concern and the backend should not guess a locale.
 */
export interface ProfileStat {
    label: string;
    /** Pre-formatted, e.g. `11,204`. */
    value: string;
}

export interface Achievement {
    /** Lucide icon name. */
    icon: string;
    title: string;
    /** Pre-formatted, e.g. `Since Mar 2024`. */
    meta: string;
}

/**
 * A reply this anon wrote, as listed on their own profile.
 *
 * `quoted` is the greentext line being answered, kept separate from `body` so
 * it can be rendered in the quote colour without parsing the body for a
 * leading `>`. Absent when the reply quotes nothing.
 */
export interface ProfileComment {
    no: number;
    board: BoardSlug;
    /** The thread this reply lives in. */
    threadNo: number;
    time: string;
    body: string;
    quoted?: string;
}

/** A thread the anon saved. Wraps a `Thread` rather than restating it. */
export interface Bookmark {
    thread: Thread;
    /** Pre-formatted, e.g. `Saved 2 days ago`. */
    savedAt: string;
    /** The anon's own note. Empty string when they wrote none. */
    note: string;
}

/**
 * A board as listed in the directory.
 *
 * Extends `Board` with the copy and state the directory needs. `slug` must
 * be a routable board: the directory links every row, so a slug the router
 * does not know would ship a dead link on a page whose entire job is links.
 */
export interface BoardDirectoryEntry extends Board {
    description: string;
    /**
     * Clover's own grouping, not 4chan's: `boards.json` carries no category.
     * Describes subject matter only and says nothing about whether a board is
     * worksafe — `worksafe` is the field that decides what an anon is shown.
     */
    category: string;
    subscribed: boolean;
    /**
     * 4chan's own `ws_board` flag. Boards where this is false are hidden
     * unless an anon has opted into seeing them.
     */
    worksafe: boolean;
}

/** One message in a conversation. */
export interface Message {
    id: number;
    /** True when this anon wrote it, false when the other did. */
    outgoing: boolean;
    body: string;
    /** Relative and pre-formatted, e.g. `2 min ago`. */
    time: string;
}

/**
 * A conversation with one other anon.
 *
 * Correspondents are identified by handle, not by post: messaging is an
 * account feature and carries no thread identity with it.
 */
export interface Conversation {
    id: number;
    /** The other anon's handle. */
    handle: string;
    /** Pre-formatted, e.g. `2 min ago`. */
    time: string;
    /** Unread count. Zero when nothing is unread. */
    unread: number;
    messages: Message[];
}
