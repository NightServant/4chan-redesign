import { describe, expect, it } from 'vitest';
import {
    ACCOUNT_MENU,
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
    /**
     * Bookmarks, History and Settings left the sidebar for the account menu
     * behind the avatar, where all three already were: the sidebar was a
     * second copy of a list a few pixels away. Notifications stays, because it
     * is the one of the four that menu does not carry.
     */
    it('lists the five sidebar destinations in the designed order', () => {
        expect(PRIMARY_NAV.map((item) => item.title)).toEqual([
            'Home',
            'Popular',
            'Latest',
            'Communities',
            'Notifications',
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

        expect(gated).toEqual(['Notifications']);
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

    /**
     * The phone bar is not the sidebar and no longer has to be a subset of it.
     * History and the profile left the sidebar for the account menu, and a
     * phone has no avatar menu to put them in, so the bar keeps them: five
     * destinations along the bottom is the whole of small-screen navigation.
     */
    it('draws every destination from the sidebar or the account menu', () => {
        const known = [...PRIMARY_NAV, ...ACCOUNT_MENU].map((item) =>
            toUrl(item.href),
        );

        for (const item of MOBILE_NAV) {
            expect(known).toContain(toUrl(item.href));
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

    /**
     * The three that left the sidebar have to still exist somewhere: removing
     * them from `PRIMARY_NAV` alone also took them out of the avatar menu,
     * which reads its destinations by name. The point was to name them once,
     * not to lose them.
     */
    it('keeps the personal destinations for the account menu', () => {
        expect(ACCOUNT_MENU.map((item) => item.title)).toEqual([
            'Bookmarks',
            'History',
            'Settings',
        ]);

        for (const item of ACCOUNT_MENU) {
            expect(item.requiresAuth).toBe(true);
            expect(PRIMARY_NAV).not.toContainEqual(item);
        }
    });
});
