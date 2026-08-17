import { Link } from '@inertiajs/react';
import {
    SEARCH_TYPES,
    SEARCH_TYPE_LABELS,
    searchUrl,
} from '@/lib/search-params';
import type { SearchSort, SearchTime, SearchType } from '@/lib/search-params';
import { cn } from '@/lib/utils';

/**
 * All · Posts · Communities · Comments, over one query.
 *
 * Links rather than a `Tabs` widget, because each tab *is* a URL: it has to
 * be shareable, survive a reload and open in a new tab, and it is the server
 * that decides what comes back. A roving-tabindex tablist driving
 * `router.visit` would be the same navigation wearing a widget's clothes,
 * with the middle-click and the copy-link-address taken away.
 *
 * That makes `aria-current` the right marker for the active one, and the
 * visible mark is an underline rather than a filled pill — the hairline
 * register the rest of the site is in, and it survives greyscale.
 *
 * The row scrolls sideways rather than wrapping. Four labels do not fit a
 * 320px phone and a second line of tabs under the first reads as two rows of
 * controls rather than one; clipping "Comments" at the edge is the reference's
 * own behaviour and says there is more to scroll to.
 */
type SearchTabsProps = {
    query: string;
    type: SearchType;
    /** Carried across a tab change, minus whatever the destination cannot apply. */
    sort: SearchSort;
    time: SearchTime;
    className?: string;
};

function SearchTabs({ query, type, sort, time, className }: SearchTabsProps) {
    return (
        <nav
            aria-label="Search results"
            data-slot="search-tabs"
            className={cn(
                'flex items-center gap-1 overflow-x-auto border-b border-border',
                className,
            )}
        >
            {SEARCH_TYPES.map((value) => {
                const active = value === type;

                return (
                    <Link
                        key={value}
                        href={searchUrl({ q: query, type: value, sort, time })}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'touch-target-44 -mb-px inline-flex shrink-0 items-center border-b-2 border-transparent px-3 py-2.5 text-body-sm font-medium whitespace-nowrap text-muted-foreground',
                            'transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            active && 'border-primary text-foreground',
                        )}
                    >
                        {SEARCH_TYPE_LABELS[value]}
                    </Link>
                );
            })}
        </nav>
    );
}

export { SearchTabs };
export type { SearchTabsProps };
