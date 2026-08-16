import { Link, usePage } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { MOBILE_NAV, navHref } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/**
 * The bottom bar on small screens. It is one of two ways to navigate below
 * `lg` — the header's hamburger drawer is the other, reachable at every width
 * below `lg`, including here. This bar's own keyboard and screen-reader
 * behaviour still carries as much weight as the sidebar's: it is what a
 * signed-in anon reaches for first below `md`, drawer or no drawer.
 *
 * `requiresAuth` entries drop out for signed-out anons, which means the bar
 * renders a variable number of items. Distributing with `flex-1` rather than
 * a fixed five-column grid keeps two items and five items both looking
 * deliberate.
 */

type MobileNavProps = Omit<ComponentProps<'nav'>, 'children'>;

function MobileNav({ className, ...props }: MobileNavProps) {
    const { props: pageProps } = usePage();
    const { isCurrentUrl } = useCurrentUrl();
    const signedIn = Boolean(pageProps.auth.user);

    const items = MOBILE_NAV.filter((item) => !item.requiresAuth || signedIn);

    return (
        <nav
            aria-label="Primary"
            data-slot="mobile-nav"
            className={cn(
                'fixed inset-x-0 bottom-0 z-[25] flex border-t border-border bg-surface md:hidden',
                'pb-[calc(0.375rem+env(safe-area-inset-bottom))]',
                className,
            )}
            {...props}
        >
            {items.map((item) => {
                const href = navHref(item, signedIn);
                const active = isCurrentUrl(href);
                const Icon = item.icon;

                return (
                    <Link
                        key={item.title}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5',
                            'transition-colors duration-[var(--duration-hover)] ease-standard',
                            active ? 'text-primary' : 'text-faint',
                        )}
                    >
                        <Icon aria-hidden="true" className="size-5" />
                        <span className="text-label font-medium">
                            {item.title}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}

export { MobileNav };
export type { MobileNavProps };
