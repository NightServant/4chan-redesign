import { describe, expect, it } from 'vitest';
import { searchUrl, sortOptionsFor, timeAppliesTo } from '@/lib/search-params';
import type { SearchSort } from '@/lib/search-params';

describe('searchUrl', () => {
    it('carries the query alone when everything else is the default', () => {
        expect(searchUrl({ q: 'risc' })).toBe('/search?q=risc');
    });

    /** The same encoding `runSearch` has always produced, so both agree. */
    it('encodes a space as %20', () => {
        expect(searchUrl({ q: 'init systems' })).toBe(
            '/search?q=init%20systems',
        );
    });

    it('puts the tab, the sort and the time in the URL', () => {
        expect(
            searchUrl({
                q: 'risc',
                type: 'comments',
                sort: 'latest',
                time: 'week',
            }),
        ).toBe('/search?q=risc&type=comments&sort=latest&time=week');
    });

    /**
     * Most replies counts replies, which a board and a reply do not have. The
     * menu drops it on those tabs, so a URL built while switching to one must
     * drop it too -- otherwise the server normalises it away and the page
     * comes back showing a sort the anon did not choose.
     */
    it('drops most replies when the tab cannot count replies', () => {
        for (const type of ['comments', 'communities'] as const) {
            expect(searchUrl({ q: 'risc', type, sort: 'replies' })).toBe(
                `/search?q=risc&type=${type}`,
            );
        }

        expect(searchUrl({ q: 'risc', type: 'posts', sort: 'replies' })).toBe(
            '/search?q=risc&type=posts&sort=replies',
        );
    });

    /** A board has no date that means anything here. See `sortOptionsFor`. */
    it('drops the time filter on communities', () => {
        expect(
            searchUrl({ q: 'risc', type: 'communities', time: 'week' }),
        ).toBe('/search?q=risc&type=communities');
    });

    it('is the bare page when there is nothing to search for', () => {
        expect(searchUrl({ q: '' })).toBe('/search');
    });
});

describe('which controls apply', () => {
    it('offers all three sorts where replies can be counted', () => {
        for (const type of ['all', 'posts'] as const) {
            expect(sortOptionsFor(type)).toEqual<SearchSort[]>([
                'relevant',
                'latest',
                'replies',
            ]);
        }
    });

    it('offers no "Top" under any name, on any tab', () => {
        for (const type of [
            'all',
            'posts',
            'communities',
            'comments',
        ] as const) {
            expect(sortOptionsFor(type)).not.toContain('top');
            expect(sortOptionsFor(type)).not.toContain('best');
        }
    });

    it('drops most replies on comments and communities', () => {
        for (const type of ['comments', 'communities'] as const) {
            expect(sortOptionsFor(type)).toEqual<SearchSort[]>([
                'relevant',
                'latest',
            ]);
        }
    });

    it('applies time everywhere but communities', () => {
        expect(timeAppliesTo('all')).toBe(true);
        expect(timeAppliesTo('posts')).toBe(true);
        expect(timeAppliesTo('comments')).toBe(true);
        expect(timeAppliesTo('communities')).toBe(false);
    });
});
