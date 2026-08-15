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
    /** Whether 4chan marks this board not worksafe. See `Thread.nsfw`. */
    nsfw: boolean;
    /** This application's own id, which the subscribe route takes. */
    id: number;
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
    /** Whether this anon follows it. Always false when signed out. */
    subscribed: boolean;
}

/**
 * An attachment on a post.
 *
 * Files live on 4chan's CDN and are addressed by `tim`, its own id for them,
 * never by the filename an anon uploaded. Nothing is downloaded or stored by
 * this application: it holds the id of a file, not the file.
 *
 * Both URLs go straight into `src`, so the browser fetches them from 4chan and
 * 4chan sees the request. That is the documented arrangement and what every
 * other client does, and it is the reason `concealed` is a server decision
 * rather than a styling hint.
 */
export interface Attachment {
    /** Pre-formatted name, dimensions and size, e.g. `x230.png · 1440x900 · 412 KB`. */
    label: string;
    /** The original filename with its extension, for the accessible name. */
    filename: string;
    /**
     * Always JPEG, whatever the original was — upstream's rule, not a guess.
     *
     * **Nothing renders this today.** 4chan caps a thumbnail at 250px on the
     * long side for an OP and 125px for a reply, which is too small to look
     * at and too small to scale up, so both the card and the post load the
     * original instead. It is kept because it is real data that costs one
     * `sprintf` and is the right source the moment a dense grid exists — the
     * account screen's media tab, in task 11b. If that never lands, this and
     * the two `thumb` dimensions below should go.
     */
    thumbnailUrl: string;
    fullUrl: string;
    /** The original's dimensions. What reserves the box before it loads. */
    width: number | null;
    height: number | null;
    /** See `thumbnailUrl`: carried, not currently rendered. */
    thumbWidth: number | null;
    thumbHeight: number | null;
    /**
     * Why this is covered, or null when it is shown outright.
     *
     * `spoiler` is 4chan's own flag, set by whoever posted it. `mature` is
     * ours and covers every image on a board 4chan marks not worksafe.
     *
     * A covered attachment is not merely blurred: nothing sets `src` until an
     * anon asks for it, so the file is never fetched. A CSS filter over an
     * image the browser has already downloaded conceals nothing.
     */
    concealed: 'spoiler' | 'mature' | null;
}

export interface Thread {
    /**
     * This application's own id, which the write routes take.
     *
     * Not `no`: post numbers are a per-board sequence upstream, so `/g/1234`
     * and `/b/1234` can both exist and a route keyed on the number alone is
     * ambiguous. The number is what an anon sees; this is what identifies it.
     */
    id: number;
    /** Post number, rendered as `>>58210441`. */
    no: number;
    board: BoardSlug;
    boardName: string;
    /** Relative and pre-formatted, e.g. `4 min ago`. */
    time: string;
    title: string;
    excerpt?: string;
    /**
     * Whether the board this sits on is one 4chan marks not worksafe.
     *
     * Marked, not hidden. Hiding is the `worksafe` preference's job and it
     * happens on the server; this exists so a thread that has been shown can
     * still say what it is before somebody opens it in an office.
     */
    nsfw: boolean;
    replies: number;
    /**
     * Attached images on the thread. Pre-formatted, e.g. `48`.
     *
     * Was a view count under fixtures. Nothing upstream counts views and
     * nothing here counted them either, so the card reports something the
     * API actually returns instead of a number with no source.
     */
    images: string;
    /** The OP's attachment, or null when the thread opened without one. */
    media: Attachment | null;
    pinned: boolean;
    /** Whether this anon has saved it. Always false when signed out. */
    bookmarked: boolean;
}

/**
 * A reply within a thread. Replies nest, so this type is recursive.
 *
 * `quotes` holds the post numbers this reply is answering. Clover renders them
 * as `>>58210441` references rather than threading arrows, which is how the
 * board has always worked and is the one convention worth preserving.
 */
export interface Comment {
    /** This application's own id, distinct from the board's `no`. See `Thread.id`. */
    id: number;
    no: number;
    /** Post numbers this reply quotes. Empty for a direct reply to the OP. */
    quotes: number[];
    /** Almost always `Anonymous`. A tripcode when an anon chose to sign. */
    author: string;
    /** Relative and pre-formatted, e.g. `4 min ago`. */
    time: string;
    body: string;
    /** True for the anon who opened the thread. */
    op: boolean;
    /**
     * This reply's own attachment. Replies carry images as often as the OP
     * does, and rendering the thread without them drops most of what is on a
     * board like /wg/ or /3/.
     */
    media: Attachment | null;
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

/**
 * New replies in a thread this anon is in.
 *
 * Not "someone replied to you", which this product cannot say: a post carries
 * no identity, so there is no author to address a reply to. The notification
 * belongs to the thread, and `reason` is which of the anon's own actions put
 * that thread on the list.
 */
export interface ThreadNotification {
    threadId: number;
    no: number;
    board: BoardSlug;
    title: string;
    /** How many posts arrived since this anon last looked. Never zero. */
    replies: number;
    reason: 'saved' | 'posted';
    /** Relative and pre-formatted, e.g. `2 hr ago`. */
    time: string;
}

/**
 * A thread this anon opened, and when they were last on it.
 *
 * It used to be a flattened shape of its own — title, board, post number,
 * attachment — which is how the history screen ended up drawing a card nothing
 * else on the site drew. It carries the thread itself now, exactly as the feed
 * receives it, so both screens render the same component and a field added to
 * a thread reaches both.
 */
export interface HistoryEntry {
    thread: Thread;
    /** Absolute and pre-formatted, e.g. `Today, 14:02`. */
    when: string;
    /**
     * Which day it belongs to, decided server-side.
     *
     * The screen used to read this off the front of `when`, which only worked
     * because a fixture wrote `Today,` and `Yesterday,` by hand. A real
     * timestamp knows its own day and the client should not be parsing prose
     * to recover it.
     */
    day: 'Today' | 'Yesterday' | 'Earlier';
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
    /** What the heading shows: the stored handle, or the `anon_{id}` fallback. */
    handle: string;
    /**
     * What is actually stored, which is null for an anon who has set none.
     *
     * Both, because the two are needed for different jobs and conflating them
     * breaks one of them: the heading must always read as something, and the
     * edit dialog must not seed its field with `anon_41` — an anon who opened
     * the dialog to fix their bio would save the fallback as a real handle on
     * the way out.
     */
    storedHandle: string | null;
    /** Opt-in post signature, e.g. `!!Xk29fLp2`. Null when never set. */
    tripcode: string | null;
    bio: string;
    /** Absolute and pre-formatted, e.g. `14 Mar 2024`. */
    joined: string;
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
    /**
     * 4chan's own `ws_board` flag. Boards where this is false are hidden
     * unless an anon has opted into seeing them.
     */
    worksafe: boolean;
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
    /**
     * 4chan's own `ws_board` flag. Boards where this is false are hidden
     * unless an anon has opted into seeing them.
     */
    worksafe: boolean;
}
