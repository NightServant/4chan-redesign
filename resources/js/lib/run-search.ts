import { router } from '@inertiajs/react';
import { rememberSearch } from '@/lib/search-history';
import { searchUrl } from '@/lib/search-params';

/**
 * Submitting a search: `rememberSearch`, then a real navigation to the
 * results page.
 *
 * Extracted out of `SearchField`, which used to be the only caller. The
 * search page's below-`md` suggestions screen (task 6) submits the same
 * way pressing Enter in the header field always has — this is that logic
 * in one place, not forked into a second copy of it.
 *
 * A page visit, not a fetch: typing is not navigation and must not push
 * history, but pressing Enter or tapping a result *is* navigation, exactly
 * the distinction `SearchField`'s own docblock already draws between
 * `fetch` and `router.visit`.
 *
 * ## Why `signedIn` is a required argument
 *
 * This module has no page context and no way to ask who is signed in, which is
 * how a signed-out visitor's terms ended up written to `clover:search-history`
 * and replayed at them on the suggestions screen (task 13, fix 1). The two
 * callers are both components and both already know, so the answer is passed
 * in rather than guessed at.
 *
 * Required rather than defaulted, and named after the condition rather than
 * after the effect: a `remember?: boolean` that defaults to `true` puts the
 * bug back for whichever caller forgets it, and `remember` says nothing about
 * *when* it may be false.
 */
export function runSearch(
    term: string,
    { signedIn }: { signedIn: boolean },
): void {
    const trimmed = term.trim();

    if (trimmed === '') {
        return;
    }

    /* The write only. Reading is deliberately left alone: an anon who signs
       out keeps whatever they already recorded, and nothing here deletes a key
       it was not asked to delete. */
    if (signedIn) {
        rememberSearch(trimmed);
    }

    /* One URL builder for the whole feature: submitting a search lands on the
       All tab with the default ordering, which is exactly `searchUrl`'s own
       defaults, so this produces the same string it always did without a
       second copy of the query-string assembly (task 7). */
    router.visit(searchUrl({ q: trimmed }));
}
