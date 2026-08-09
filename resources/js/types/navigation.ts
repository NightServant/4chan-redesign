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
    /** Where this points once signed in, when that differs. Only Home does. */
    authedHref?: NonNullable<InertiaLinkProps['href']>;
    /** Hidden from signed-out anons, who have no such thing to show. */
    requiresAuth?: boolean;
    /** Unread count. Rendered as a badge, omitted when zero or absent. */
    count?: number;
};
