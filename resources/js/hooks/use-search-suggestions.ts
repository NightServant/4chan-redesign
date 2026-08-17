import { useEffect, useState } from 'react';
import type { Board, Thread } from '@/types/clover';

/**
 * Boards and threads matching a query, from `/search/suggest`.
 *
 * Shared by two callers: the header dropdown (`SearchField`) and the search
 * page's below-`md` suggestions screen (task 6). Both need the identical
 * fetch/debounce/abort — a slow response for `ge` must not land after a
 * fast one for `gen` and overwrite it — so it lives here once rather than
 * as two copies that could drift the way the history list once did before
 * task 4 undid it.
 */
export type Suggestions = {
    boards: Board[];
    threads: Thread[];
};

export const EMPTY_SUGGESTIONS: Suggestions = { boards: [], threads: [] };

/** Long enough that a fast typist makes one request, not eight. */
const DEBOUNCE_MS = 180;

export type UseSearchSuggestionsReturn = {
    results: Suggestions;
    loading: boolean;
};

/**
 * @param query The text to search for. An empty string is not skipped: the
 * server answers it with the busiest boards, not an empty result.
 * @param active Whether this consumer wants suggestions at all right now.
 * The dropdown passes its own `open` state; the search page's screen is
 * "open" for as long as it is mounted.
 */
export function useSearchSuggestions(
    query: string,
    active: boolean,
): UseSearchSuggestionsReturn {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Suggestions>(EMPTY_SUGGESTIONS);

    useEffect(() => {
        if (!active) {
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            setLoading(true);

            fetch(`/search/suggest?q=${encodeURIComponent(query)}`, {
                signal: controller.signal,
                headers: { Accept: 'application/json' },
            })
                .then((response) => (response.ok ? response.json() : null))
                .then((data: Suggestions | null) => {
                    setResults(data ?? EMPTY_SUGGESTIONS);
                    setLoading(false);
                })
                .catch(() => {
                    /* An abort is the normal case here, not a failure: it
                       means another keystroke arrived. Either way the list
                       keeps what it has rather than flashing empty.

                       `loading` still has to come down. A request that is
                       aborted because the component is going away is
                       harmless, but one aborted by the last keystroke before
                       an anon stops typing left a spinner up over a list
                       that was never going to change again. */
                    setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [query, active]);

    return { results, loading };
}
