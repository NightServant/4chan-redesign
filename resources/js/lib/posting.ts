/**
 * Rules that govern writing a post, shared by every surface that accepts one.
 *
 * The reply composer and the new-thread dialog were built in parallel and each
 * declared this limit separately. They happened to agree, which is luck rather
 * than design: two constants with the same value and different names drift the
 * first time the product changes its mind.
 *
 * The product has now changed its mind, and the fix that kept them together is
 * what makes the change safe. 4chan's `boards.json` carries `max_comment_chars`
 * **per board** — 2000, 3000 or 5000 depending on where you are posting — so a
 * single global number is not something either composer can go on knowing. Each
 * one takes the real limit as a `maxCommentChars` prop, fed from the page that
 * knows which board is being posted to.
 *
 * This module therefore stops being the source of the limit and becomes the
 * source of the *default*: one shared fallback that both composers name in their
 * default parameter. That is what still stops them drifting. Deleting the
 * constant outright was the alternative and it is worse, because then each
 * composer picks its own literal for the "nobody told me" case and we are back
 * to two numbers with different names.
 */

/**
 * Fallback character limit for a post body, used only when no board's own
 * `max_comment_chars` is available.
 *
 * 2000 is the lowest and by far the most common of the three real values, which
 * makes it the safe direction to be wrong in: a composer falling back to it
 * warns an anon early rather than letting them write 4000 characters the board
 * will reject. It is not the truth for every board, and any surface that knows
 * its board must pass that board's own limit instead of relying on this.
 */
export const POST_MAX_LENGTH = 2000;

/**
 * Mirrors `clover.attachments.max_kilobytes`: the biggest image a reply may
 * carry.
 *
 * Checked in the browser as well as on the server because the server never
 * sees an oversized upload. Vercel refuses a request body over about 4.5 MB
 * before PHP starts, with a bare 413 the page cannot turn into a message, so
 * the only place an anon can be told is here, before the request is made.
 */
export const ATTACHMENT_MAX_BYTES = 4096 * 1024;

/** Why this file cannot be attached, or null when its size is fine. */
export function attachmentTooLarge(file: File): string | null {
    if (file.size <= ATTACHMENT_MAX_BYTES) {
        return null;
    }

    const megabytes = (file.size / (1024 * 1024)).toFixed(1);

    return `That image is ${megabytes} MB, and the limit is ${ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB.`;
}
