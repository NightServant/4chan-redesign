import { Link, router, usePage } from '@inertiajs/react';
import {
    EyeIcon,
    BellIcon,
    BookmarkIcon,
    LogOutIcon,
    MenuIcon,
    MessageSquareIcon,
    MoonIcon,
    SearchIcon,
    ShieldIcon,
    SunIcon,
    UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
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
import { SheetTrigger } from '@/components/ui/sheet';
import { useAppearance } from '@/hooks/use-appearance';
import { ACCOUNT_MENU, PRIMARY_NAV } from '@/lib/navigation';
import { cn, plural } from '@/lib/utils';
import { account, login, logout, register } from '@/routes';
import { update as boardPreference } from '@/routes/board-preference';
import { edit as editTwoFactor } from '@/routes/two-factor';
import type { CloverNavItem } from '@/types/navigation';

/**
 * The sticky bar across the top of the app: search, a compose action, icon
 * actions and the account. It sits above content on `z-30`, one above the
 * sidebar's `z-20`, and reads its destinations from `PRIMARY_NAV` rather than
 * holding a second copy of the chrome's nav.
 *
 * Below `lg` it also carries the trigger for the sidebar drawer. The trigger
 * has to live somewhere always on screen, since the drawer it opens is
 * closed by default; `AppHeader` renders on every page the drawer does, so it
 * is where the trigger lives rather than a header carrying one only
 * sometimes. It is a `SheetTrigger`, which reads the drawer's open state from
 * the `Sheet` `AppLayout` renders around this component — nothing is passed
 * down as a prop, so this component does not need to know whether it is
 * mounted inside one until it actually renders.
 *
 * Below `md` there is no room left for the inline search field once the
 * hamburger and the account controls are on screen too: at 320px it measured
 * out to 355px of content in a 272px row, and the field — the one thing with
 * genuine flex-shrink — absorbed all of the deficit down to a literal 0px. A
 * bordered box with a magnifier `<svg>` remained, decorative and with no
 * handler, over an input nothing could type into. There was no way to search
 * on a phone.
 *
 * Below `md` a real button stands in the field's place now, and `Log in` /
 * `Create account` stop rendering there too: a hamburger, a search control
 * and a theme toggle already fill a 320px row on their own, and two
 * full-size auth buttons never fit alongside them at any width this small.
 * The design below `md` is exactly that row — hamburger, search, theme
 * toggle — and nothing past it; a signed-out anon on a phone has no sign-in
 * control anywhere in the app shell until task 4 settles that on the bottom
 * bar. At `md` and up both buttons, and the row itself, are unchanged.
 */

/** Bounded to what the notifications menu previews before "See all". */
const NOTIFICATION_PREVIEW_COUNT = 3;

/**
 * Which of an anon's own actions put a thread on the list. Two reasons, both
 * closed sets from the server, so this is a lookup rather than a fallback
 * chain: an unmatched icon name cannot happen.
 */
const NOTIFICATION_ICONS: Record<string, ReactNode> = {
    saved: <BookmarkIcon />,
    posted: <MessageSquareIcon />,
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
    const { auth, threadNotifications } = usePage().props;
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

    /**
     * Whether the mobile search button has handed its slot to the field.
     *
     * Below `md` the button and the field occupy the same spot in the row
     * rather than both being laid out at once — there is not the width to
     * spare for that, and it is also the wrong picture: only one of them is
     * ever the active control. Reset on navigation for the same reason
     * `AppLayout` resets the drawer's open state on navigation: this header
     * is part of a persistent layout, so nothing else unmounts it between
     * visits to put the field back for the next page on its own.
     */
    const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);

    useEffect(() => {
        return router.on('navigate', () => setMobileSearchExpanded(false));
    }, []);

    const bookmarksItem = findNavItem('Bookmarks');
    const historyItem = findNavItem('History');
    const notificationsItem = findNavItem('Notifications');

    const notificationPreview = threadNotifications.slice(
        0,
        NOTIFICATION_PREVIEW_COUNT,
    );

    /* Everything the server sent, not everything the menu shows. The badge
       used to count the preview, which made it a constant. */
    const unreadCount = threadNotifications.length;

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
                <div
                    data-slot="app-header-row"
                    className="mx-auto flex h-16 w-full max-w-(--measure-page) items-center gap-7 px-6"
                >
                    {/* Below `lg` the sidebar is a drawer rather than a
                        persistent rail, so this is the only way back into it
                        once it is closed. Named to match the sidebar's own
                        "Collapse sidebar" / "Expand sidebar" toggles, since it
                        opens that same component. Hidden at `lg` and up,
                        where the rail is back and a trigger for a drawer
                        nothing can reach would do nothing. */}
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Open sidebar"
                            className="lg:hidden"
                        >
                            <MenuIcon aria-hidden="true" />
                        </Button>
                    </SheetTrigger>

                    {/* This wrapper is the row's actual flex item, sized
                        exactly as the plain field wrapper it replaces was —
                        the button and the field both live inside it rather
                        than each carrying their own slot, since they trade
                        places rather than coexisting. `justify-center` only
                        matters below `md`, where it is usually the only
                        visible child and centring it is the point; at `md`
                        and up the field fills the box on its own and the
                        alignment is moot. */}
                    <div
                        className="flex max-w-(--measure-column) min-w-0 flex-1 items-center justify-center"
                        onBlur={(event) => {
                            /* Tabbing or clicking to anything outside this box
                               — the theme toggle, a link, the page itself —
                               closes the field back down to the button.
                               Clicking a result inside the dropdown does not:
                               that click lands on a descendant of this same
                               box, which `contains` still reports as inside
                               it. */
                            if (
                                mobileSearchExpanded &&
                                !event.currentTarget.contains(
                                    event.relatedTarget as Node | null,
                                )
                            ) {
                                setMobileSearchExpanded(false);
                            }
                        }}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Search"
                            onClick={() => setMobileSearchExpanded(true)}
                            className={cn(
                                'md:hidden',
                                mobileSearchExpanded && 'hidden',
                            )}
                        >
                            <SearchIcon aria-hidden="true" />
                        </Button>

                        <SearchField
                            focusRequested={mobileSearchExpanded}
                            className={cn(
                                'w-full',
                                mobileSearchExpanded ? 'flex' : 'hidden',
                                'md:flex',
                            )}
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        {isSignedIn && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="relative"
                                        aria-label={
                                            unreadCount === 0
                                                ? 'Notifications, nothing new'
                                                : `Notifications, ${unreadCount} new`
                                        }
                                    >
                                        <BellIcon aria-hidden="true" />
                                        {/* Painted only when there is
                                            something to paint. It used to be
                                            unconditional, over a count that
                                            was however many rows the menu
                                            happened to preview -- so a brand
                                            new account with no history at all
                                            wore an unread dot. A badge that is
                                            always on is not a badge. */}
                                        {unreadCount > 0 && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute top-2 right-2 size-1.5 rounded-full bg-primary"
                                            />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-[340px]"
                                >
                                    <DropdownMenuLabel>
                                        Notifications
                                    </DropdownMenuLabel>

                                    {/* This menu used to preview
                                        `recentActivity` -- "You replied in
                                        /g/" -- which is a list of the reader's
                                        own actions announced back to them
                                        under a label promising news. What it
                                        shows now is what arrived in threads
                                        they are in while they were away. */}
                                    {notificationPreview.length === 0 ? (
                                        <p className="px-2 py-3 text-body-sm text-muted-foreground">
                                            Nothing new in the threads you saved
                                            or posted in.
                                        </p>
                                    ) : (
                                        notificationPreview.map(
                                            (notification) => (
                                                <NotificationItem
                                                    key={notification.threadId}
                                                    leading={
                                                        NOTIFICATION_ICONS[
                                                            notification.reason
                                                        ]
                                                    }
                                                    href={`${notification.board}${notification.no}`}
                                                    title={`${plural(notification.replies, 'new reply', 'new replies')} in ${notification.board}`}
                                                    meta={`${notification.title} · ${notification.time}`}
                                                    unread
                                                />
                                            ),
                                        )
                                    )}
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
                                        aria-label="Account menu"
                                    >
                                        <AnonAvatar seed={String(user.id)} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-[240px]"
                                >
                                    {/* No name at the top of this menu. It
                                        printed the full name an anon typed at
                                        registration, in the chrome of every
                                        screen, on a site whose whole claim is
                                        that it does not know who you are. The
                                        field is gone; so is the row. */}
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

                                    {/* The two-factor page itself.

                                        This pointed at `/settings#two-factor`,
                                        which lands an anon in the middle of a
                                        page of six panels and asks them to
                                        find the thing they pressed a button to
                                        reach. Two-factor has a page now. */}
                                    <DropdownMenuItem asChild>
                                        <Link href={editTwoFactor()}>
                                            <ShieldIcon aria-hidden="true" />
                                            Two-factor authentication
                                        </Link>
                                    </DropdownMenuItem>

                                    {/* No "Settings" row. The two rows above
                                        *are* settings -- one flips in place,
                                        the other links straight at its own
                                        panel -- so a third pointing at the page
                                        they came from offered the shortcut and
                                        the long way round at once. */}
                                    <DropdownMenuSeparator />
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
                                {/* Hidden below `md`: a hamburger, a search
                                    control and a theme toggle are already the
                                    full width of a 320px row, and these two
                                    full-size buttons do not fit next to them.
                                    Neither branch is deleted — both links
                                    render at every width, unchanged at `md`
                                    and up — since a signed-out anon on a
                                    narrower screen still needs the styles and
                                    markup ready the moment the viewport grows
                                    past this one. */}
                                <Button
                                    variant="ghost"
                                    asChild
                                    className="hidden md:inline-flex"
                                >
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                <Button
                                    variant="primary"
                                    asChild
                                    className="hidden md:inline-flex"
                                >
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
