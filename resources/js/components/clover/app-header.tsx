import { Link, router, usePage } from '@inertiajs/react';
import {
    EyeIcon,
    ArrowBigUpIcon,
    BellIcon,
    BookmarkIcon,
    LogOutIcon,
    MessageSquareIcon,
    MoonIcon,
    ShieldIcon,
    SunIcon,
    UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { AnonAvatar } from '@/components/clover/anon-avatar';
import { NotificationItem } from '@/components/clover/notification-item';
import { PatternField } from '@/components/clover/pattern-field';
import { SearchField } from '@/components/clover/search-field';
import { Switch } from '@/components/clover/switch';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { ACCOUNT_MENU, PRIMARY_NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { account, login, logout, register } from '@/routes';
import { update as boardPreference } from '@/routes/board-preference';
import { edit as editSecurity } from '@/routes/security';
import type { CloverNavItem } from '@/types/navigation';

/**
 * The sticky bar across the top of the app: search, a compose action, icon
 * actions and the account. It sits above content on `z-30`, one above the
 * sidebar's `z-20`, and reads its destinations from `PRIMARY_NAV` rather than
 * holding a second copy of the chrome's nav.
 */

/** Bounded to what the notifications menu previews before "See all". */
const NOTIFICATION_PREVIEW_COUNT = 3;

/**
 * `ActivityEntry` carries Lucide icon names as plain strings so the payload stays
 * framework-agnostic. This is the one place that turns a name back into a
 * component; anything not in this fixture falls back to the bell, since a
 * notification row with no icon reads as broken.
 */
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
    'message-square': MessageSquareIcon,
    'arrow-big-up': ArrowBigUpIcon,
    shield: ShieldIcon,
    bookmark: BookmarkIcon,
};

function findNavItem(title: string): CloverNavItem | undefined {
    return (
        ACCOUNT_MENU.find((item) => item.title === title) ??
        PRIMARY_NAV.find((item) => item.title === title)
    );
}

type AppHeaderProps = Omit<ComponentProps<'header'>, 'children'> & {
    /**
     * `onCompose` is gone with the composer it opened.
     *
     * Clover accepts no uploads, and a board where every new thread opens
     * without an image is not the board it is mirroring. The dialog was also
     * mounted by nothing, so the button opened a component no screen rendered.
     */
};

function AppHeader({ className, ...props }: AppHeaderProps) {
    const { auth, recentActivity } = usePage().props;
    const user = auth.user;
    const showsMatureBoards = Boolean(user?.shows_mature_boards);

    /**
     * Written straight to the server rather than held here. It changes what
     * every board query returns, so a local copy would be a second opinion on
     * a preference the database already owns.
     */
    function toggleMatureBoards(): void {
        router.patch(
            boardPreference().url,
            { shows_mature_boards: !showsMatureBoards },
            { preserveScroll: true },
        );
    }

    const isSignedIn = Boolean(user);
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    const bookmarksItem = findNavItem('Bookmarks');
    const historyItem = findNavItem('History');
    const settingsItem = findNavItem('Settings');
    const notificationsItem = findNavItem('Notifications');

    const notificationPreview = recentActivity.slice(
        0,
        NOTIFICATION_PREVIEW_COUNT,
    );
    const unreadCount = notificationPreview.length;

    return (
        <header
            data-slot="app-header"
            className={cn(
                'sticky top-0 z-30 h-16 border-b border-border bg-bg',
                className,
            )}
            {...props}
        >
            <PatternField depth={0} feather={false} className="h-full">
                {/* The same container the feed uses, and the field is sized to
                    the same column the threads are, so search sits directly
                    over the posts rather than floating at its own width in a
                    full-bleed bar. It was capped at 520px against a 760px
                    column, which read as two grids that happened to share a
                    page. */}
                <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-7 px-6">
                    <div className="max-w-[760px] min-w-0 flex-1">
                        <SearchField />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        {isSignedIn && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="relative"
                                        aria-label={`Notifications, ${unreadCount} unread`}
                                    >
                                        <BellIcon aria-hidden="true" />
                                        <span
                                            aria-hidden="true"
                                            className="absolute top-2 right-2 size-1.5 rounded-full bg-primary"
                                        />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-[340px]"
                                >
                                    <DropdownMenuLabel>
                                        Notifications
                                    </DropdownMenuLabel>
                                    {notificationPreview.map((entry, index) => {
                                        const Icon =
                                            ACTIVITY_ICONS[entry.icon] ??
                                            BellIcon;

                                        return (
                                            <NotificationItem
                                                key={`${entry.time}-${index}`}
                                                leading={<Icon />}
                                                title={entry.text}
                                                meta={entry.time}
                                                unread
                                            />
                                        );
                                    })}
                                    <DropdownMenuSeparator />
                                    {notificationsItem && (
                                        <DropdownMenuItem asChild>
                                            <Link href={notificationsItem.href}>
                                                See all notifications
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={
                                isDark
                                    ? 'Switch to light theme'
                                    : 'Switch to dark theme'
                            }
                            onClick={() =>
                                updateAppearance(isDark ? 'light' : 'dark')
                            }
                        >
                            {isDark ? (
                                <SunIcon aria-hidden="true" />
                            ) : (
                                <MoonIcon aria-hidden="true" />
                            )}
                        </Button>

                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Account menu for ${user.name}`}
                                    >
                                        <AnonAvatar seed={String(user.id)} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-[240px]"
                                >
                                    <DropdownMenuLabel>
                                        {user.name}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={account()}>
                                            <UserIcon aria-hidden="true" />
                                            Your profile
                                        </Link>
                                    </DropdownMenuItem>
                                    {bookmarksItem && (
                                        <DropdownMenuItem asChild>
                                            <Link href={bookmarksItem.href}>
                                                <bookmarksItem.icon aria-hidden="true" />
                                                Bookmarks
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {historyItem && (
                                        <DropdownMenuItem asChild>
                                            <Link href={historyItem.href}>
                                                <historyItem.icon aria-hidden="true" />
                                                History
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />

                                    {/* The two settings that were worth
                                        keeping, brought up to where an anon
                                        actually is.
                                        
                                        Adult boards changes what every screen
                                        shows, and two-factor is the one
                                        security control that is not a form
                                        field, so both were a page visit away
                                        from a preference they affect
                                        everywhere. */}
                                    <DropdownMenuItem
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            toggleMatureBoards();
                                        }}
                                    >
                                        <EyeIcon aria-hidden="true" />
                                        Show adult boards
                                        <Switch
                                            checked={showsMatureBoards}
                                            aria-label="Show adult boards"
                                            className="ml-auto"
                                            tabIndex={-1}
                                        />
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild>
                                        <Link href={editSecurity()}>
                                            <ShieldIcon aria-hidden="true" />
                                            Two-factor authentication
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    {settingsItem && (
                                        <DropdownMenuItem asChild>
                                            <Link href={settingsItem.href}>
                                                <settingsItem.icon aria-hidden="true" />
                                                Settings
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        asChild
                                        variant="destructive"
                                    >
                                        <Link href={logout()} as="button">
                                            <LogOutIcon aria-hidden="true" />
                                            Sign out
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Button variant="ghost" asChild>
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                <Button variant="primary" asChild>
                                    <Link href={register()}>
                                        Create account
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </PatternField>
        </header>
    );
}

export { AppHeader };
export type { AppHeaderProps };
