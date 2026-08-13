import {
    BookmarkIcon,
    BellIcon,
    ClockIcon,
    FlameIcon,
    HouseIcon,
    HistoryIcon,
    LayoutGridIcon,
    UserIcon,
} from 'lucide-react';
import {
    account,
    dashboard,
    communities,
    home,
    latest,
    notifications,
    bookmarks,
    history,
    popular,
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
 * the full nav squeezed down.
 *
 * Compose is not a destination in `PRIMARY_NAV` because it opens the composer
 * rather than navigating, so it is added here on its own terms.
 */
const MOBILE_NAV: readonly CloverNavItem[] = [
    { title: 'Home', href: home(), authedHref: dashboard(), icon: HouseIcon },
    { title: 'Popular', href: popular(), icon: FlameIcon },
    {
        title: 'History',
        href: history(),
        icon: HistoryIcon,
        requiresAuth: true,
    },
    /* The account screen, not the settings page. "You" reading as settings
       was always a stretch, and it is plainly wrong now that the profile is
       edited from a dialog on the account screen rather than from a form on
       the settings one. */
    {
        title: 'You',
        href: account(),
        icon: UserIcon,
        requiresAuth: true,
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
 * Only Home differs by auth state: signed out it is the marketing homepage,
 * signed in it is the feed. A signed-in anon pressing Home and landing back on
 * the sales pitch for a product they have already joined is the bug this
 * resolves. Everything else points at one place regardless.
 */
function navHref(
    item: CloverNavItem,
    signedIn: boolean,
): CloverNavItem['href'] {
    return signedIn && item.authedHref ? item.authedHref : item.href;
}

export { ACCOUNT_MENU, FOOTER_LINKS, MOBILE_NAV, navHref, PRIMARY_NAV };
