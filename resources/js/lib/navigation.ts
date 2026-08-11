import {
    BellIcon,
    BookmarkIcon,
    ClockIcon,
    FlameIcon,
    HistoryIcon,
    HouseIcon,
    LayoutGridIcon,
    SettingsIcon,
    UserIcon,
} from 'lucide-react';
import {
    bookmarks,
    dashboard,
    communities,
    history,
    home,
    latest,
    notifications,
    popular,
} from '@/routes';
import { edit as editProfile } from '@/routes/profile';
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
    {
        title: 'Notifications',
        href: notifications(),
        icon: BellIcon,
        requiresAuth: true,
    },
    {
        title: 'Settings',
        href: editProfile(),
        icon: SettingsIcon,
        requiresAuth: true,
    },
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
    {
        title: 'You',
        href: editProfile(),
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

export { FOOTER_LINKS, MOBILE_NAV, navHref, PRIMARY_NAV };
