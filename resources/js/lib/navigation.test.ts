import { describe, expect, it } from 'vitest';
import {
    ACCOUNT_MENU,
    FOOTER_LINKS,
    MOBILE_NAV,
    navHref,
    navTitle,
    PRIMARY_NAV,
} from '@/lib/navigation';
import { toUrl } from '@/lib/utils';
import { account, login } from '@/routes';

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
     * get too narrow to hit reliably. Four fits.
     */
    it('carries at most five destinations', () => {
        expect(MOBILE_NAV.length).toBeLessThanOrEqual(5);
    });

    it('lists Home, Community Rules, Notifications and the sign-in slot, in that order', () => {
        expect(MOBILE_NAV.map((item) => item.title)).toEqual([
            'Home',
            'Community Rules',
            'Notifications',
            'Log in',
        ]);
    });

    /**
     * Popular, Latest and History all had bar slots once. Popular and Latest
     * are reachable from the drawer now (it is `PRIMARY_NAV`, the sidebar's
     * own list, below `lg`); History moved onto the account screen. None of
     * the three should still have a place on the bar.
     */
    it('drops Popular, Latest and History from the bar', () => {
        const titles = MOBILE_NAV.map((item) => item.title);

        for (const gone of ['Popular', 'Latest', 'History']) {
            expect(titles).not.toContain(gone);
        }
    });

    /** Every destination on the bar has to resolve to a real route. */
    it('gives every destination a resolvable href', () => {
        for (const item of MOBILE_NAV) {
            expect(toUrl(item.href), `${item.title} has no href`).toMatch(
                /^\//,
            );
        }
    });

    /**
     * Every other gated item on this list disappears for a signed-out anon.
     * This one is the opposite on purpose: below `md` the header carries no
     * auth buttons and the drawer carries none either, so this slot is the
     * only route into signing in a signed-out phone has, and it must never
     * be filtered out the way `requiresAuth` items are.
     */
    it('never marks the sign-in slot as requiring an account', () => {
        const signInSlot = MOBILE_NAV.find((item) => item.title === 'Log in');

        expect(signInSlot).toBeDefined();
        expect(signInSlot?.requiresAuth).toBeFalsy();
    });

    it('reads "Log in" and points at /login for a signed-out anon', () => {
        const signInSlot = MOBILE_NAV.find((item) => item.title === 'Log in')!;

        expect(navTitle(signInSlot, false)).toBe('Log in');
        expect(toUrl(navHref(signInSlot, false))).toBe(toUrl(login()));
    });

    it('reads "You" and points at /account for a signed-in anon', () => {
        const signInSlot = MOBILE_NAV.find((item) => item.title === 'Log in')!;

        expect(navTitle(signInSlot, true)).toBe('You');
        expect(toUrl(navHref(signInSlot, true))).toBe(toUrl(account()));
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
        /* Settings is not here. It was, as a row in the avatar menu, and it
           went once the menu grew controls that *are* settings: the adult-
           boards switch flips in place and two-factor links at its own panel,
           so a third row pointing at the page those came from offered the
           shortcut and the long way round at once. */
        expect(ACCOUNT_MENU.map((item) => item.title)).toEqual([
            'Bookmarks',
            'History',
        ]);

        for (const item of ACCOUNT_MENU) {
            expect(item.requiresAuth).toBe(true);
            expect(PRIMARY_NAV).not.toContainEqual(item);
        }
    });
});

/** `navTitle` mirrors `navHref`: same idea, the label instead of the URL. */
describe('navTitle', () => {
    it('leaves every item with no authedTitle reading the same in both states', () => {
        for (const item of [...PRIMARY_NAV, ...ACCOUNT_MENU]) {
            expect(navTitle(item, true)).toBe(item.title);
            expect(navTitle(item, false)).toBe(item.title);
        }
    });
});
