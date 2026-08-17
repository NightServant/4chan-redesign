import {
    BookmarkIcon,
    BellIcon,
    ClockIcon,
    FlameIcon,
    HouseIcon,
    HistoryIcon,
    LayoutGridIcon,
    ScrollTextIcon,
    UserIcon,
} from 'lucide-react';
import {
    account,
    dashboard,
    communities,
    home,
    latest,
    login,
    notifications,
    bookmarks,
    history,
    popular,
    rules,
} from '@/routes';
import type { CloverNavItem } from '@/types/navigation';

/**
 * Every destination in Clover's chrome, defined once. The sidebar, the mobile
 * bar and the account menu all read from here rather than each holding a copy,
 * which is how a nav starts disagreeing with itself.
 *
 * Order is the design's, not alphabetical: browsing destinations first, then
 * the anon's own things, then settings last.
 */
const PRIMARY_NAV: readonly CloverNavItem[] = [
    { title: 'Home', href: home(), authedHref: dashboard(), icon: HouseIcon },
    { title: 'Popular', href: popular(), icon: FlameIcon },
    { title: 'Latest', href: latest(), icon: ClockIcon },
    { title: 'Communities', href: communities(), icon: LayoutGridIcon },
    {
        title: 'Notifications',
        href: notifications(),
        icon: BellIcon,
        requiresAuth: true,
    },
];

/**
 * The account menu's own destinations, which are not sidebar rows.
 *
 * Bookmarks, History and Settings were in `PRIMARY_NAV` and are not any more:
 * all three already sat in the menu behind the avatar, so the sidebar was a
 * second copy of a list a few pixels away. Notifications stays in the sidebar
 * because it is the one of the four the menu does not carry.
 *
 * They live here rather than nowhere because the header reads them by name to
 * build that menu. Removing them from `PRIMARY_NAV` alone took them out of the
 * avatar menu too, which is the opposite of the intent: the point was to name
 * them once, not to lose them.
 */
const ACCOUNT_MENU: readonly CloverNavItem[] = [
    {
        title: 'Bookmarks',
        href: bookmarks(),
        icon: BookmarkIcon,
        requiresAuth: true,
    },
    {
        title: 'History',
        href: history(),
        icon: HistoryIcon,
        requiresAuth: true,
    },
    /* Settings is not on this list. It was, as a row in the avatar menu, and
       it went at the point the menu grew controls that *are* settings: the
       adult-boards switch flips in place, and two-factor links straight at its
       own panel. A third row pointing at the page those two came from was the
       menu offering both the shortcut and the long way round.
       
       The page is still reached from "Edit profile" on the account screen, from
       the two-factor row here, and from "You" on the mobile bar. */
];

/**
 * The bottom bar on small screens. Five is the ceiling: past that the targets
 * get too narrow to hit reliably, so this is a deliberate subset rather than
 * the full nav squeezed down. Four fits.
 *
 * Popular, Latest and History all had slots here once. Popular and Latest
 * are gone because the drawer already carries them — it is the sidebar's own
 * `PRIMARY_NAV` list below `lg`, so the bar no longer has to be the sidebar's
 * understudy for those two. History is gone because it moved onto the
 * account screen below `md` (see `AccountController`); the bar's own "You"
 * slot is where it is read from now.
 *
 * The label is "Rules", not "Community Rules": the longer form wrapped to a
 * second line in an 80px slot (four items in a 320px bar) and set that row's
 * label on a different baseline from its three neighbours, none of which
 * wrap. Only the bar's own label changed — `/rules` keeps its own page
 * heading and title.
 *
 * Likewise "Alerts", not "Notifications": the same 80px-slot defect,
 * estimated at ~94px against that slot, a smaller overrun than "Community
 * Rules" had but not a comfortable one either (task 5). Only the bar's own
 * label changed here too — the sidebar's `PRIMARY_NAV` entry, the
 * `/notifications` route and the page it renders are all untouched.
 */
const MOBILE_NAV: readonly CloverNavItem[] = [
    { title: 'Home', href: home(), authedHref: dashboard(), icon: HouseIcon },
    {
        title: 'Rules',
        href: rules(),
        icon: ScrollTextIcon,
    },
    {
        title: 'Alerts',
        href: notifications(),
        icon: BellIcon,
        requiresAuth: true,
    },
    /**
     * The fourth slot, and the only route into signing in that a phone has.
     *
     * Below `md` the header no longer carries `Log in` / `Create account`,
     * and the drawer was deliberately never given them either — this slot is
     * what is left. `requiresAuth` is not set here on purpose: every other
     * gated item on this list disappears for a signed-out anon, and this one
     * has to do the opposite, since a signed-out anon is exactly who needs
     * to see it. Signed in it reads "You" and opens the account screen,
     * exactly as it always has; signed out it reads "Log in" and opens the
     * sign-in page instead of vanishing.
     */
    {
        title: 'Log in',
        href: login(),
        authedTitle: 'You',
        authedHref: account(),
        icon: UserIcon,
    },
];

/** Sits at the foot of the expanded sidebar. Not navigation, just reference. */
const FOOTER_LINKS: readonly { title: string; href: string }[] = [
    { title: 'Rules', href: '/rules' },
    { title: 'FAQ', href: '/faq' },
    { title: 'Terms', href: '/terms' },
    { title: 'Status', href: '/status' },
];

/**
 * Where a nav item actually points for this anon.
 *
 * Home and the mobile bar's sign-in slot differ by auth state; everything
 * else points at one place regardless. A signed-in anon pressing Home and
 * landing back on the sales pitch for a product they have already joined is
 * the bug that case resolves.
 */
function navHref(
    item: CloverNavItem,
    signedIn: boolean,
): CloverNavItem['href'] {
    return signedIn && item.authedHref ? item.authedHref : item.href;
}

/**
 * What a nav item reads for this anon, mirroring `navHref`.
 *
 * Only the mobile bar's fourth slot differs by auth state today — "Log in"
 * signed out, "You" signed in — but this exists as its own function rather
 * than a component reading `item.authedTitle` directly, so a second consumer
 * of `MOBILE_NAV` reads the same label rather than re-deriving it.
 */
function navTitle(item: CloverNavItem, signedIn: boolean): string {
    return signedIn && item.authedTitle ? item.authedTitle : item.title;
}

export {
    ACCOUNT_MENU,
    FOOTER_LINKS,
    MOBILE_NAV,
    navHref,
    navTitle,
    PRIMARY_NAV,
};
