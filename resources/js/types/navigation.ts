import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
};

/**
 * A destination in Clover's chrome. Unlike `NavItem` the icon is required:
 * every row in the sidebar and the mobile bar carries one, and the collapsed
 * sidebar has nothing but the icon to identify it by.
 */
export type CloverNavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon: LucideIcon;
    /** Where this points once signed in, when that differs. Home and the
     *  mobile bar's sign-in slot both do. */
    authedHref?: NonNullable<InertiaLinkProps['href']>;
    /**
     * What this reads once signed in, when that differs from `title`.
     *
     * Only the mobile bar's fourth slot does: signed out it reads "Log in"
     * and points at `/login`; signed in it reads "You" and points at
     * `/account`. It needs its own field rather than branching inside a
     * component, the same reason `authedHref` is a field and not a prop —
     * every consumer of this list should read the same label for the same
     * anon rather than each guessing it locally.
     */
    authedTitle?: string;
    /** Hidden from signed-out anons, who have no such thing to show. */
    requiresAuth?: boolean;
    /** Unread count. Rendered as a badge, omitted when zero or absent. */
    count?: number;
};
