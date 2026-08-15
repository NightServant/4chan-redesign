import { beforeEach, describe, expect, it } from 'vitest';
import {
    HISTORY_LIMIT,
    forgetSearch,
    readSearchHistory,
    rememberSearch,
    searchHistorySnapshot,
    subscribeToSearchHistory,
} from '@/lib/search-history';

beforeEach(() => {
    localStorage.clear();
});

describe('search history', () => {
    it('remembers a search and reads it back', () => {
        rememberSearch('init systems');

        expect(readSearchHistory()).toEqual(['init systems']);
    });

    it('puts the most recent search first', () => {
        rememberSearch('first');
        rememberSearch('second');

        expect(readSearchHistory()).toEqual(['second', 'first']);
    });

    /**
     * Searching the same thing twice is the common case — an anon comes back
     * to a term they use often. It should move to the top, not appear twice.
     */
    it('moves a repeated search to the front rather than duplicating it', () => {
        rememberSearch('kernel');
        rememberSearch('wallpaper');
        rememberSearch('kernel');

        expect(readSearchHistory()).toEqual(['kernel', 'wallpaper']);
    });

    it('matches a repeat regardless of case or surrounding space', () => {
        rememberSearch('Kernel');
        rememberSearch('  kernel  ');

        expect(readSearchHistory()).toEqual(['kernel']);
    });

    it('keeps only the most recent entries', () => {
        for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
            rememberSearch(`query ${i}`);
        }

        const history = readSearchHistory();

        expect(history).toHaveLength(HISTORY_LIMIT);
        expect(history[0]).toBe(`query ${HISTORY_LIMIT + 4}`);
        expect(history).not.toContain('query 0');
    });

    it('records nothing for a blank search', () => {
        rememberSearch('   ');
        rememberSearch('');

        expect(readSearchHistory()).toEqual([]);
    });

    it('forgets one entry and leaves the rest', () => {
        rememberSearch('keep me');
        rememberSearch('drop me');

        forgetSearch('drop me');

        expect(readSearchHistory()).toEqual(['keep me']);
    });

    /**
     * `localStorage` is shared with every other script on the origin and
     * survives deploys, so what comes out of it is untrusted input. A parse
     * error must read as "no history", never as a crash on a control an anon
     * merely focused.
     */
    it('reads as empty when the stored value is not a list of strings', () => {
        localStorage.setItem('clover:search-history', '{"not":"an array"}');
        expect(readSearchHistory()).toEqual([]);

        localStorage.setItem('clover:search-history', '[1, 2, 3]');
        expect(readSearchHistory()).toEqual([]);

        localStorage.setItem('clover:search-history', 'not json at all');
        expect(readSearchHistory()).toEqual([]);
    });

    it('recovers by overwriting a corrupt value on the next search', () => {
        localStorage.setItem('clover:search-history', 'not json at all');

        rememberSearch('kernel');

        expect(readSearchHistory()).toEqual(['kernel']);
    });

    /**
     * `useSyncExternalStore` compares snapshots by identity and re-renders
     * whenever they differ. A snapshot that parsed a fresh array every call
     * would differ every time and spin the component in an infinite loop, so
     * an unchanged store has to return the very same array.
     */
    it('returns the same array while the store has not changed', () => {
        rememberSearch('kernel');

        expect(searchHistorySnapshot()).toBe(searchHistorySnapshot());
    });

    it('returns a new snapshot once the store changes', () => {
        rememberSearch('kernel');
        const before = searchHistorySnapshot();

        rememberSearch('wallpaper');

        expect(searchHistorySnapshot()).not.toBe(before);
        expect(searchHistorySnapshot()).toEqual(['wallpaper', 'kernel']);
    });

    it('tells subscribers when a search is remembered or forgotten', () => {
        let calls = 0;
        const unsubscribe = subscribeToSearchHistory(() => {
            calls++;
        });

        rememberSearch('kernel');
        forgetSearch('kernel');

        expect(calls).toBe(2);

        unsubscribe();
        rememberSearch('after');

        expect(calls).toBe(2);
    });
});
