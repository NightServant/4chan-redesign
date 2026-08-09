import { describe, expect, it } from 'vitest';
import {
    FOOTER_LINKS,
    MOBILE_NAV,
    navHref,
    PRIMARY_NAV,
} from '@/lib/navigation';
import { toUrl } from '@/lib/utils';

/**
 * The sidebar, the mobile bar and the header all read their destinations from
 * this one module. These tests exist because three components reading three
 * copies of the same list is how a nav starts disagreeing with itself.
 */
describe('PRIMARY_NAV', () => {
    it('lists the nine Clover destinations in the designed order', () => {
        expect(PRIMARY_NAV.map((item) => item.title)).toEqual([
            'Home',
            'Popular',
            'Latest',
            'Communities',
            'Bookmarks',
            'History',
            'Messages',
            'Notifications',
            'Settings',
        ]);
    });

    it('gives every destination an icon and a resolvable href', () => {
        for (const item of PRIMARY_NAV) {
            expect(item.icon, `${item.title} has no icon`).toBeTruthy();
            expect(item.href, `${item.title} has no href`).toBeTruthy();
        }
    });

    it('marks exactly the personal destinations as requiring an account', () => {
        const gated = PRIMARY_NAV.filter((item) => item.requiresAuth).map(
            (item) => item.title,
        );

        expect(gated).toEqual([
            'Bookmarks',
            'History',
            'Messages',
            'Notifications',
            'Settings',
        ]);
    });

    it('uses no emoji in any label', () => {
        for (const item of PRIMARY_NAV) {
            expect(item.title).toMatch(/^[\w\s]+$/);
        }
    });
});

describe('MOBILE_NAV', () => {
    /**
     * Material caps a bottom bar at five destinations; past that the targets
     * get too narrow to hit reliably.
     */
    it('carries at most five destinations', () => {
        expect(MOBILE_NAV.length).toBeLessThanOrEqual(5);
    });

    it('draws every destination from the primary nav so the two cannot disagree', () => {
        const primaryHrefs = PRIMARY_NAV.map((item) => toUrl(item.href));

        for (const item of MOBILE_NAV) {
            expect(primaryHrefs).toContain(toUrl(item.href));
        }
    });
});

describe('FOOTER_LINKS', () => {
    it('lists the four utility links', () => {
        expect(FOOTER_LINKS.map((link) => link.title)).toEqual([
            'Rules',
            'FAQ',
            'Terms',
            'Status',
        ]);
    });
});

/**
 * Signed in, "Home" means the feed, not the marketing page. A signed-in anon
 * pressing Home and landing back on the sales pitch for a product they have
 * already joined is the bug this resolves.
 */
describe('navHref', () => {
    const homeItem = PRIMARY_NAV.find((item) => item.title === 'Home')!;

    it('sends a signed-out visitor to the marketing homepage', () => {
        expect(toUrl(navHref(homeItem, false))).toBe('/');
    });

    it('sends a signed-in anon to the feed', () => {
        expect(toUrl(navHref(homeItem, true))).toBe('/dashboard');
    });

    it('leaves every other destination alone in both states', () => {
        for (const item of PRIMARY_NAV.filter((i) => i.title !== 'Home')) {
            expect(toUrl(navHref(item, true))).toBe(toUrl(item.href));
            expect(toUrl(navHref(item, false))).toBe(toUrl(item.href));
        }
    });
});
