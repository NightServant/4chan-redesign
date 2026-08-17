import { router } from '@inertiajs/react';
import { rememberSearch } from '@/lib/search-history';
import { search as searchRoute } from '@/routes';

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
    router.visit(`${searchRoute.url()}?q=${encodeURIComponent(trimmed)}`);
}
