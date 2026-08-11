import { Link, usePage } from '@inertiajs/react';
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { BoardAvatar } from '@/components/clover/board-avatar';
import { Mark, Wordmark } from '@/components/clover/wordmark';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { FOOTER_LINKS, navHref, PRIMARY_NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { CloverNavItem } from '@/types/navigation';

/**
 * The primary nav down the left side. Sticky and full height, hidden below
 * `md` where the mobile bar takes over.
 *
 * Width never animates: it is a layout property, and the taste laws ban
 * animating those outright. Collapse is instant; only colour, background and
 * the label's presence change.
 */

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Boards you use caps at five rows, whatever the fixture holds. */
const MAX_BOARD_ROWS = 5;

const rowBaseClasses =
    'flex h-[38px] items-center gap-3 rounded-lg text-body-sm transition-colors duration-[var(--duration-hover)] ease-standard';

const rowRestClasses =
    'font-normal text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:font-medium';

const rowActiveClasses = 'bg-primary-soft font-semibold text-primary';

/** Shared by the collapse and expand toggles so both sit on the same axis. */
const toggleClasses =
    'flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover hover:text-foreground';

type AppSidebarProps = Omit<ComponentProps<'aside'>, 'children'>;

function AppSidebar({ className, ...props }: AppSidebarProps) {
    const { auth, sidebarOpen, sidebarBoards } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();
    const [open, setOpen] = useState(sidebarOpen);

    function toggleOpen(): void {
        const next = !open;
        setOpen(next);
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }

    const visibleNav = PRIMARY_NAV.filter(
        (item) => !item.requiresAuth || Boolean(auth.user),
    );
    /* Shared from `HandleInertiaRequests`, already filtered by the anon's
       content settings and already capped server-side. Sliced again here only
       so the row count stays this component's decision. */
    const boards = sidebarBoards.slice(0, MAX_BOARD_ROWS);

    function renderRow(item: CloverNavItem) {
        const href = navHref(item, Boolean(auth.user));
        const active = isCurrentUrl(href);
        const Icon = item.icon;

        const row = (
            <Link
                href={href}
                data-slot="sidebar-row"
                aria-current={active ? 'page' : undefined}
                className={cn(
                    rowBaseClasses,
                    /* Collapsed, the row is only an icon, so it centres on the
                       rail's axis. Keeping the expanded padding here is what
                       pushed every glyph left of the toggle above it. */
                    open ? 'px-[11px]' : 'justify-center px-0',
                    active ? rowActiveClasses : rowRestClasses,
                )}
            >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className={cn('truncate', !open && 'sr-only')}>
                    {item.title}
                </span>
            </Link>
        );

        if (open) {
            return <div key={item.title}>{row}</div>;
        }

        return (
            <Tooltip key={item.title}>
                <TooltipTrigger asChild>{row}</TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
        );
    }

    return (
        <TooltipProvider>
            <aside
                data-slot="app-sidebar"
                className={cn(
                    'sticky top-0 z-20 hidden h-screen shrink-0 flex-col border-r border-border bg-bg md:flex',
                    open ? 'w-[268px]' : 'w-[76px]',
                    className,
                )}
                {...props}
            >
                {/* Exactly the header's height, so the wordmark and the
                    header content share a baseline. The sidebar is a sibling
                    of the header's column, not its parent, so nothing lines
                    these up automatically. */}
                <div
                    data-slot="sidebar-brand"
                    className={cn(
                        'flex h-16 shrink-0 items-center px-3',
                        open ? 'justify-between gap-1' : 'justify-center',
                    )}
                >
                    <Link
                        href={home()}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover"
                    >
                        {open ? (
                            <Wordmark />
                        ) : (
                            <Mark aria-label="clover, home" />
                        )}
                    </Link>

                    {open ? (
                        <button
                            type="button"
                            onClick={toggleOpen}
                            className={toggleClasses}
                        >
                            <PanelLeftCloseIcon
                                aria-hidden="true"
                                className="size-4"
                            />
                            <span className="sr-only">Collapse sidebar</span>
                        </button>
                    ) : null}
                </div>

                {/* Collapsed, the toggle drops below the mark and centres on
                    the same axis as every nav icon. Side by side they would
                    not fit a 76px rail. */}
                {!open ? (
                    <div className="flex shrink-0 justify-center px-2 pb-2">
                        <button
                            type="button"
                            onClick={toggleOpen}
                            className={toggleClasses}
                        >
                            <PanelLeftOpenIcon
                                aria-hidden="true"
                                className="size-4"
                            />
                            <span className="sr-only">Expand sidebar</span>
                        </button>
                    </div>
                ) : null}

                <nav
                    aria-label="Primary"
                    className="flex flex-col gap-0.5 px-2 py-2"
                >
                    {visibleNav.map((item) => renderRow(item))}
                </nav>

                {open && boards.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-0.5 px-2 py-2">
                        <p className="px-[11px] py-1 text-label text-faint uppercase">
                            Boards you use
                        </p>
                        {boards.map((board) => (
                            <Link
                                key={board.slug}
                                href={board.slug}
                                className="flex h-[38px] items-center gap-3 rounded-lg px-[11px] text-body-sm text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:bg-surface-hover hover:text-foreground"
                            >
                                <BoardAvatar
                                    slug={board.slug}
                                    size={20}
                                    decorative
                                />
                                <span className="truncate">
                                    {board.slug} {board.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                ) : null}

                <div className="mt-auto" />

                {open ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-4 text-caption text-faint">
                        {FOOTER_LINKS.map((link) => (
                            <Link
                                key={link.title}
                                href={link.href}
                                className="transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground"
                            >
                                {link.title}
                            </Link>
                        ))}
                    </div>
                ) : null}
            </aside>
        </TooltipProvider>
    );
}

export { AppSidebar };
export type { AppSidebarProps };
