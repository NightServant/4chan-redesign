import {
    BellIcon,
    BookmarkIcon,
    ClockIcon,
    FlameIcon,
    HistoryIcon,
    HouseIcon,
    LayoutGridIcon,
    MailIcon,
    SettingsIcon,
    UserIcon,
} from 'lucide-react';
import {
    bookmarks,
    communities,
    history,
    home,
    latest,
    messages,
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
    { title: 'Home', href: home(), icon: HouseIcon },
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
    { title: 'Messages', href: messages(), icon: MailIcon, requiresAuth: true },
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
    { title: 'Home', href: home(), icon: HouseIcon },
    { title: 'Popular', href: popular(), icon: FlameIcon },
    {
        title: 'History',
        href: history(),
        icon: HistoryIcon,
        requiresAuth: true,
    },
    {
        title: 'Messages',
        href: messages(),
        icon: MailIcon,
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

export { FOOTER_LINKS, MOBILE_NAV, PRIMARY_NAV };
