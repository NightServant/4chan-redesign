import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    beforeEach(() => {
        localStorage.clear();
        router.visit.mockClear();
    });

    it('does nothing for an empty or blank query', async () => {
        const { runSearch } = await import('@/lib/run-search');

        runSearch('', { signedIn: true });
        runSearch('   ', { signedIn: true });

        expect(router.visit).not.toHaveBeenCalled();
    });

    it('remembers the trimmed query and visits the search results', async () => {
        const { readSearchHistory } = await import('@/lib/search-history');
        const { runSearch } = await import('@/lib/run-search');

        runSearch('  init systems  ', { signedIn: true });

        expect(readSearchHistory()).toEqual(['init systems']);
        expect(router.visit).toHaveBeenCalledWith('/search?q=init%20systems');
    });

    it('encodes the query in the visited URL', async () => {
        const { runSearch } = await import('@/lib/run-search');

        runSearch('100%', { signedIn: true });

        expect(router.visit).toHaveBeenLastCalledWith('/search?q=100%25');
    });

    /**
     * Task 13, fix 1. `runSearch` knows nothing about who is signed in, so a
     * signed-out visitor's terms were written to `clover:search-history` and
     * replayed at them on the suggestions screen — history for somebody the
     * site is not supposed to have any.
     *
     * The assertion is against real storage rather than against a spy on
     * `rememberSearch`: a spy would still pass if the gate were placed on the
     * wrong side of the write, and the whole complaint is about what ends up
     * in `localStorage`.
     */
    it('writes no history for a signed-out anon', async () => {
        const { readSearchHistory } = await import('@/lib/search-history');
        const { runSearch } = await import('@/lib/run-search');

        runSearch('init systems', { signedIn: false });

        expect(readSearchHistory()).toEqual([]);
        expect(localStorage.getItem('clover:search-history')).toBeNull();
    });

    /** The search itself is not gated. Reading is what an anon comes for. */
    it('still runs the search for a signed-out anon', async () => {
        const { runSearch } = await import('@/lib/run-search');

        runSearch('init systems', { signedIn: false });

        expect(router.visit).toHaveBeenCalledWith('/search?q=init%20systems');
    });

    /**
     * Gating the write must not become a reason to clear the key. Somebody who
     * signs out keeps whatever they recorded while signed in; nothing here
     * deletes stored history without being asked.
     */
    it('leaves history already stored alone when signed out', async () => {
        const { readSearchHistory } = await import('@/lib/search-history');
        const { runSearch } = await import('@/lib/run-search');

        localStorage.setItem(
            'clover:search-history',
            JSON.stringify(['btrfs']),
        );

        runSearch('init systems', { signedIn: false });

        expect(readSearchHistory()).toEqual(['btrfs']);
    });
});
