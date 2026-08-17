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
import { useCurrentUrl } from '@/hooks/use-current-url';
import { ACCOUNT_MENU, PRIMARY_NAV } from '@/lib/navigation';
import { cn, plural } from '@/lib/utils';
import { account, login, logout, register, search } from '@/routes';
import { update as boardPreference } from '@/routes/board-preference';
import { edit as editTwoFactor } from '@/routes/two-factor';
import type { CloverNavItem } from '@/types/navigation';

/**
 * The sticky bar across the top of the app: search, icon actions and the
 * account. It sits above content on `z-30`, one above the
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
 * Below `md`, signed in or out, the row is exactly three controls: the
 * hamburger, the search field, the theme toggle. Nothing else fits, and
 * nothing else is meant to. Gabe's decision, made on a screenshot of the row
 * carrying five — hamburger, magnifier, bell, theme toggle, avatar — with the
 * search box squeezed into the ~96px between the hamburger and the
 * right-hand group, sitting at 110px instead of near the centre. The bell
 * drops below `md` because Notifications has its own bottom-bar slot there;
 * the avatar and its dropdown drop because every row the dropdown carried has
 * a home below `md` on the account screen now (`Sign out` and `Two-factor
 * authentication` included — see `AccountController` and `pages/account.tsx`
 * before assuming the dropdown can just disappear, the same thing this
 * component's own history got wrong once already). `Log in` / `Create
 * account` stay hidden below `md` as they already were. At `md` and up
 * every one of these is back, unchanged: the bell, the avatar, the dropdown,
 * the auth buttons, the wider gap.
 *
 * The search control below `md` is a button drawn as a search bar — border,
 * radius, magnifier inside, the word "Search" — that visits `/search`, where
 * the whole screen is the field. It is not the `SearchField` beside it: a
 * dropdown inside a 164px control was the shape Gabe rejected, and a field
 * that opens a panel over the row it lives in is not what a phone wants
 * anyway. `SearchField` is still here, gated `hidden md:block`, and is the
 * control at `md` and up.
 *
 * The button carries the same accessible name as the field, so an anon
 * reaches "Search boards and threads" whichever one their width renders.
 *
 * Giving it room is the arithmetic `gap-4 md:gap-7` exists for. At a 320px
 * viewport: 320 − 48 (`px-6`) − 76 (two 38px icon buttons, hamburger and
 * theme toggle) = 196px before gaps. `gap-7` (28px) on both sides would spend
 * 56 of that, leaving the field 140px — under the field's own 160px
 * minimum. `gap-4` (16px) spends 32, leaving 164px, comfortably over it.
 * `md:gap-7` restores the wider gap at `md` and up, where the field is
 * already the larger inline one this same arithmetic does not apply to.
 *
 * Pressing that button visits `/search`. Only pressing: it carried an
 * `onFocus` doing the same thing, which on a control that takes focus only
 * from Tab or a screen reader meant tabbing off the hamburger left the
 * header before the theme toggle could be reached. `/search` with no query
 * is a
 * suggestions page (recent searches, busiest boards), the same two sources
 * the dropdown already draws from; see `pages/search.tsx`. That page draws
 * its own app bar (back control, the real field, focused on arrival) below
 * `md`, in this header's place, so this header hides itself entirely below
 * `md` while `usePage().url` matches `/search` — including
 * `/search?q=...`, since `useCurrentUrl` compares by pathname and the query
 * string does not change it. At `md` and up the search page is not
 * special: the header, and its dropdown, are unchanged there.
 *
 * `⌘K` stays the desktop field's own shortcut, decided rather than left to
 * fall out however it fell: `SearchField` stays mounted below `md` (only
 * its wrapper is `hidden`, not the component), so the listener is still
 * live, but `input.current.focus()` on a `display: none` element focuses
 * nothing in a real browser. Below `md` the shortcut is inert instead of
 * doing something surprising, without this file needing to know `⌘K`
 * exists at all.
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
     * `/search` and `/search?q=...` both have the pathname `/search` —
     * `isCurrentUrl` compares by pathname, so a query string does not
     * defeat this. The search page supplies its own app bar below `md`
     * whenever this is true; see the docblock above.
     */
    const { isCurrentUrl } = useCurrentUrl();
    const onSearchPage = isCurrentUrl(search());

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
                /* The search page draws its own app bar in this header's
                   place below `md`; see the docblock above. Unaffected at
                   `md` and up, where the search page is not special. */
                onSearchPage && 'hidden md:block',
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
                    className="mx-auto flex h-16 w-full max-w-(--measure-page) items-center gap-4 px-6 md:gap-7"
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

                    {/* Two controls sharing one slot, not one control
                        changing behaviour by width: the dropdown-capable
                        `SearchField` (`md` and up, unchanged) and a plain
                        button beside it (`md:hidden`) that visits the
                        search page instead of opening a dropdown in ~164px.
                        See this file's own docblock for why, and
                        `SearchField` for the ghost placeholder that answers
                        "Search" below `md` and "Search boards and threads"
                        at `md` and up -- matched here so the same accessible
                        name reaches an anon whichever control is on screen. */}
                    <div className="max-w-(--measure-column) min-w-0 flex-1">
                        {/* Click only. This carried an `onFocus` that visited
                            the same page, on the reading that "tapping or
                            focusing the search field" meant both -- but that
                            is a button, and the only ways a button takes
                            focus are Tab and a screen reader's swipe. Below
                            `md` the tab order is hamburger, this, theme
                            toggle, so tabbing off the hamburger navigated
                            away before the toggle could ever be reached, and
                            a swipe did the same thing to a VoiceOver user
                            every time they came back. A tap fires `focus`
                            then `click`, so it also issued two visits per
                            press. */}
                        <button
                            type="button"
                            aria-label="Search boards and threads"
                            onClick={() => router.visit(search().url)}
                            className="touch-target-44 flex h-9.5 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-body-sm text-muted-foreground md:hidden"
                        >
                            <SearchIcon
                                aria-hidden="true"
                                className="size-4 shrink-0 text-faint"
                            />
                            Search
                        </button>

                        <div className="hidden md:block">
                            <SearchField />
                        </div>
                    </div>

                    {/* Hidden below `md`: the bell has its own bottom-bar
                        slot there (Notifications), and every row the avatar
                        dropdown carries below it has a home on the account
                        screen instead (`Sign out` and `Two-factor
                        authentication` included). `md:inline-flex` restores
                        it at `md` and up, where the dropdown is still the
                        only way to reach any of them. */}
                    <div
                        data-slot="app-header-actions"
                        className="ml-auto flex items-center gap-2"
                    >
                        {isSignedIn && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="relative hidden md:inline-flex"
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
                                        className="hidden md:inline-flex"
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
                                    stay in the markup at every width, only
                                    hidden below `md` and visible again
                                    unchanged at `md` and up — since a
                                    signed-out anon on a narrower screen still
                                    needs the styles and markup ready the
                                    moment the viewport grows past this one. */}
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
