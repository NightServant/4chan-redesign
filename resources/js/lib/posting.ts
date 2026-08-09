/**
 * Rules that govern writing a post, shared by every surface that accepts one.
 *
 * The reply composer and the new-thread dialog were built in parallel and each
 * declared this limit separately. They happened to agree, which is luck rather
 * than design: two constants with the same value and different names drift the
 * first time the product changes its mind.
 */

/**
 * Maximum characters in a post body.
 *
 * 4chan's own limit, which Clover keeps. Round, well known to the audience this
 * product is for, and long enough that no ordinary post brushes against it.
 */
export const POST_MAX_LENGTH = 2000;
