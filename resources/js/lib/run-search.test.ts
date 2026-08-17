import { describe, expect, it, vi } from 'vitest';

const { router } = vi.hoisted(() => ({ router: { visit: vi.fn() } }));

vi.mock('@inertiajs/react', () => ({ router }));

/**
 * `rememberSearch` then `/search?q=`, extracted out of `SearchField` — which
 * used to be the only caller. The search page's below-`md` suggestions
 * screen (task 6) submits a search the same way pressing Enter in the
 * header field always has, and this is that logic, in one place rather
 * than forked into a second copy the brief warned against.
 */
describe('runSearch', () => {
    it('does nothing for an empty or blank query', async () => {
        const { runSearch } = await import('@/lib/run-search');

        runSearch('');
        runSearch('   ');

        expect(router.visit).not.toHaveBeenCalled();
    });

    it('remembers the trimmed query and visits the search results', async () => {
        const { readSearchHistory } = await import('@/lib/search-history');
        const { runSearch } = await import('@/lib/run-search');

        localStorage.clear();
        runSearch('  init systems  ');

        expect(readSearchHistory()).toEqual(['init systems']);
        expect(router.visit).toHaveBeenCalledWith('/search?q=init%20systems');
    });

    it('encodes the query in the visited URL', async () => {
        const { runSearch } = await import('@/lib/run-search');

        runSearch('100%');

        expect(router.visit).toHaveBeenLastCalledWith('/search?q=100%25');
    });
});
