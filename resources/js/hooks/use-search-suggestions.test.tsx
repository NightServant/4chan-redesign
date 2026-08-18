import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';

/**
 * The fetch, the debounce and the abort, extracted out of `SearchField` —
 * which used to be the only caller. The search page's below-`md`
 * suggestions screen (task 6) needs the exact same behaviour for the
 * field an anon types into there, and a second copy of this effect is
 * precisely the class of duplication task 4 spent its time undoing on the
 * history list.
 */
function mockFetch(payload: unknown = { boards: [], threads: [] }) {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
    });

    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

beforeEach(() => {
    vi.useRealTimers();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useSearchSuggestions', () => {
    it('starts empty and not loading', () => {
        mockFetch();

        const { result } = renderHook(() => useSearchSuggestions('', false));

        expect(result.current.results).toEqual({ boards: [], threads: [] });
        expect(result.current.loading).toBe(false);
    });

    it('does nothing while inactive, even with a query', async () => {
        const fetchMock = mockFetch();

        renderHook(() => useSearchSuggestions('g', false));

        await new Promise((resolve) => setTimeout(resolve, 250));

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches once active, including for an empty query', async () => {
        const fetchMock = mockFetch({
            boards: [{ slug: '/g/', name: 'Technology', threads: '379' }],
            threads: [],
        });

        renderHook(() => useSearchSuggestions('', true));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                '/search/suggest?q=',
                expect.objectContaining({
                    headers: { Accept: 'application/json' },
                }),
            ),
        );
    });

    it('encodes the query it sends', async () => {
        const fetchMock = mockFetch();

        renderHook(() => useSearchSuggestions('100%', true));

        await waitFor(() =>
            expect(fetchMock).toHaveBeenLastCalledWith(
                '/search/suggest?q=100%25',
                expect.anything(),
            ),
        );
    });

    it('resolves with the results the server sends', async () => {
        mockFetch({
            boards: [{ slug: '/g/', name: 'Technology', threads: '379' }],
            threads: [],
        });

        const { result } = renderHook(() => useSearchSuggestions('g', true));

        await waitFor(() =>
            expect(result.current.results.boards).toHaveLength(1),
        );
        expect(result.current.loading).toBe(false);
    });

    /**
     * One request per pause, and never two answers racing: a slow response
     * for `ge` must not land after a fast one for `gen` and overwrite it.
     */
    it('aborts the request in flight when the query changes', async () => {
        const fetchMock = mockFetch();

        const { rerender } = renderHook(
            ({ query }) => useSearchSuggestions(query, true),
            { initialProps: { query: 'ge' } },
        );

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        act(() => {
            rerender({ query: 'gen' });
        });

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

        const signals = fetchMock.mock.calls.map((call) => call[1].signal);

        expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(
            true,
        );
        expect(signals[0].aborted).toBe(true);
    });

    it('does not fetch again while becoming inactive', async () => {
        const fetchMock = mockFetch();

        const { rerender } = renderHook(
            ({ active }) => useSearchSuggestions('g', active),
            { initialProps: { active: true } },
        );

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        act(() => {
            rerender({ active: false });
        });

        await new Promise((resolve) => setTimeout(resolve, 250));

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
