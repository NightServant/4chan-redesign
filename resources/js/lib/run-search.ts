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
 */
export function runSearch(term: string): void {
    const trimmed = term.trim();

    if (trimmed === '') {
        return;
    }

    rememberSearch(trimmed);

    /* One URL builder for the whole feature: submitting a search lands on the
       All tab with the default ordering, which is exactly `searchUrl`'s own
       defaults, so this produces the same string it always did without a
       second copy of the query-string assembly (task 7). */
    router.visit(searchUrl({ q: trimmed }));
}
