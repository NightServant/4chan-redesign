import { router } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { AppHeader } from '@/components/clover/app-header';
import { Sheet } from '@/components/ui/sheet';
import type { User } from '@/types/auth';
import type { ActivityEntry, Board, ThreadNotification } from '@/types/clover';

/**
 * The real `Link`/`usePage` require an Inertia page context that only exists
 * inside `createInertiaApp`. This mirrors the double `app-sidebar.test.tsx`
 * already uses: `Link` renders a plain anchor (or a button when `as="button"`
 * is given, matching Inertia's own behaviour for non-GET links), and
 * `usePage` reads a mutable fixture reset in `beforeEach`.
 */

/**
 * The header's hamburger is a `SheetTrigger`, which throws outside a `Sheet`
 * ancestor: Radix's dialog context has nowhere to read from. The real `Sheet`
 * lives in `AppLayout`, one level up; this stands in for it exactly the way
 * the mocked `Link` above stands in for Inertia's router context.
 */
function renderHeader() {
    return render(
        <Sheet>
            <AppHeader />
        </Sheet>,
    );
}
/**
 * Four notifications, because the header previews three — the fourth is what
 * proves the preview stops while the badge still counts it.
 *
 * These used to be `recentActivity`: "You replied in /g/", the reader's own
 * actions announced back to them under a label promising news. The menu shows
 * what arrived in threads they are in now.
 */
const NOTIFICATIONS: ThreadNotification[] = [
    {
        threadId: 1,
        no: 58210441,
        board: '/g/',
        title: 'Anons are still arguing about init systems',
        replies: 3,
        reason: 'saved',
        time: '2 min ago',
    },
    {
        threadId: 2,
        no: 58210442,
        board: '/x/',
        title: 'Something in the walls',
        replies: 1,
        reason: 'posted',
        time: '1 hr ago',
    },
    {
        threadId: 3,
        no: 58210443,
        board: '/biz/',
        title: 'Mainline kernel support or vendor tree',
        replies: 12,
        reason: 'saved',
        time: '3 hr ago',
    },
    {
        threadId: 4,
        no: 58210444,
        board: '/fit/',
        title: 'Overhead press form check',
        replies: 2,
        reason: 'posted',
        time: '5 hr ago',
    },
];

const mockPage: {
    props: {
        auth: { user: User | null };
        sidebarOpen: boolean;
        recentActivity: ActivityEntry[];
        threadNotifications: ThreadNotification[];
        sidebarBoards: Board[];
    };
    url: string;
} = {
    props: {
        auth: { user: null },
        sidebarOpen: true,
        recentActivity: [],
        threadNotifications: NOTIFICATIONS,
        sidebarBoards: [],
    },
    url: '/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    router: {
        patch: vi.fn(),
        visit: vi.fn(),
    },
    Link: ({
        href,
        as,
        children,
        ...props
    }: {
        href: string | { url: string };
        as?: string;
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        if (as === 'button') {
            return (
                <button type="button" {...props}>
                    {children}
                </button>
            );
        }

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

/**
 * Radix's menu drives its listbox with pointer capture and scroll APIs that
 * jsdom does not implement. Stub them so the menus can actually open,
 * matching the pattern in select.test.tsx and dropdown-menu.test.tsx.
 */
beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
});

const SIGNED_IN_USER: User = {
    id: 7,
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
    mockPage.props = {
        auth: { user: null },
        sidebarOpen: true,
        recentActivity: [],
        threadNotifications: NOTIFICATIONS,
        sidebarBoards: [],
    };
    mockPage.url = '/';
    document.documentElement.classList.remove('dark');
    vi.mocked(router.visit).mockClear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

/** Any control with a `hidden` token that is not part of an `md:...` pair. */
function hasBareHidden(el: Element): boolean {
    return /(^|\s)hidden(\s|$)/.test(el.className);
}

describe('AppHeader', () => {
    /**
     * Starting a thread is gone. Clover accepts no uploads, and a board where
     * every new thread opens without an image is not the board it is
     * mirroring. The dialog it opened was also mounted by nothing, so the
     * button opened a component no screen rendered.
     */
    it('offers no way to start a thread', () => {
        renderHeader();

        expect(
            screen.queryByRole('button', { name: /new thread/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /new thread/i }),
        ).not.toBeInTheDocument();
    });

    it('shows Log in and Create account and no avatar for a signed-out anon', () => {
        renderHeader();

        expect(
            screen.getByRole('link', { name: 'Log in' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="anon-avatar"]'),
        ).not.toBeInTheDocument();
    });

    /**
     * Below `md` there is no room for a hamburger, a search field and a
     * theme toggle *and* two full-size auth buttons in one row -- that is
     * the overflow task 3 exists to fix. The bottom bar's fourth slot is the
     * one route into signing in on a phone now (see `mobile-nav.test.tsx`),
     * so the header keeps both links here -- still real, still reachable at
     * `md` and up exactly as before -- and only stops showing them below it.
     */
    it('hides Log in and Create account below `md`, unchanged at `md` and up', () => {
        renderHeader();

        const logIn = screen.getByRole('link', { name: 'Log in' });
        const createAccount = screen.getByRole('link', {
            name: 'Create account',
        });

        expect(logIn).toHaveClass('hidden', 'md:inline-flex');
        expect(createAccount).toHaveClass('hidden', 'md:inline-flex');
    });

    /**
     * The contract below `md`, stated directly: exactly the hamburger, the
     * search field and the theme toggle carry no `md:` visibility gate at
     * all -- unconditionally reachable at every width -- while everything
     * else in the row carries exactly the opposite, a gate that keeps it out
     * below `md` and back at `md` and up. jsdom cannot evaluate the media
     * query itself, so this is the class-level version of that fact.
     *
     * Signed out, the gated pair is `Log in` / `Create account`. Signed in
     * it is the bell and the avatar instead -- Gabe's rejection of the
     * five-glyph row (hamburger, magnifier, bell, theme toggle, avatar) is
     * what this task exists to answer, so the signed-in case is the one that
     * actually matters here.
     */
    it('below `md`, signed out, reaches exactly the hamburger, the search field and the theme toggle', () => {
        renderHeader();

        const hamburger = screen.getByRole('button', { name: /open sidebar/i });
        const search = screen.getByRole('combobox', {
            name: /search boards and threads/i,
        });
        const theme = screen.getByRole('button', {
            name: /switch to (light|dark) theme/i,
        });
        const logIn = screen.getByRole('link', { name: 'Log in' });
        const createAccount = screen.getByRole('link', {
            name: 'Create account',
        });

        for (const control of [hamburger, search, theme]) {
            expect(hasBareHidden(control)).toBe(false);
        }

        for (const control of [logIn, createAccount]) {
            expect(hasBareHidden(control)).toBe(true);
            expect(control.className).toMatch(/md:inline-flex/);
        }
    });

    it('below `md`, signed in, reaches exactly the hamburger, the search field and the theme toggle -- no bell, no avatar', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;
        renderHeader();

        const hamburger = screen.getByRole('button', { name: /open sidebar/i });
        const search = screen.getByRole('combobox', {
            name: /search boards and threads/i,
        });
        const theme = screen.getByRole('button', {
            name: /switch to (light|dark) theme/i,
        });
        const notifications = screen.getByRole('button', {
            name: /notifications/i,
        });
        const avatar = screen.getByRole('button', { name: 'Account menu' });

        for (const control of [hamburger, search, theme]) {
            expect(hasBareHidden(control)).toBe(false);
        }

        for (const control of [notifications, avatar]) {
            expect(hasBareHidden(control)).toBe(true);
            expect(control.className).toMatch(/md:inline-flex/);
        }
    });

    /**
     * The icon that used to stand in for the field below `md` -- tap it,
     * get a button 110px from centre with nothing to type into -- is gone
     * outright, not merely hidden. There is exactly one search control at
     * every width now: the field itself.
     */
    it('offers no separate search button at any width -- the field is the control', () => {
        renderHeader();

        expect(
            screen.queryByRole('button', { name: /^search$/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('combobox', {
                name: /search boards and threads/i,
            }),
        ).toBeInTheDocument();
    });

    /**
     * No prior tap, because there is nothing left to tap: the field is a
     * real, typable input from the first render, at the narrowest width
     * this header supports.
     */
    it('is typable at 320px with no prior tap', async () => {
        const user = userEvent.setup();
        renderHeader();

        const field = screen.getByRole('combobox', {
            name: /search boards and threads/i,
        });

        await user.type(field, 'g');

        expect(field).toHaveValue('g');
    });

    /**
     * `gap-4`/`md:gap-7` is the arithmetic the header's own docblock states:
     * at 320px, `gap-7` on both sides of the field would leave it under its
     * 160px minimum, and `gap-4` does not. Pinned here as a guard against
     * someone restoring the wider gap below `md` without re-checking the sum.
     */
    it('uses the narrower gap below `md` that keeps the field at its minimum width', () => {
        renderHeader();

        const row = document.querySelector('[data-slot="app-header-row"]');

        expect(row).toHaveClass('gap-4', 'md:gap-7');
    });

    it('shows the account avatar trigger and opens the account menu on click, with items reachable', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;

        renderHeader();

        expect(
            screen.queryByRole('link', { name: 'Log in' }),
        ).not.toBeInTheDocument();

        /* Named for what it opens, not for who is signed in. The trigger used
           to be labelled "Account menu for {full name}", and the menu printed
           that name at the top of itself — on a site whose premise is that it
           does not know who you are. */
        const trigger = screen.getByRole('button', { name: 'Account menu' });
        expect(
            document.querySelector('[data-slot="anon-avatar"]'),
        ).toBeInTheDocument();

        await user.click(trigger);

        expect(
            await screen.findByRole('menuitem', { name: /your profile/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: /bookmarks/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: /history/i }),
        ).toBeInTheDocument();

        /* No "Settings" row. The two rows this menu already carries *are*
           settings -- the adult-boards switch flips in place, two-factor links
           at its own panel -- so a third pointing at the page they came from
           offered the shortcut and the long way round at once. */
        expect(
            screen.queryByRole('menuitem', { name: /^settings$/i }),
        ).not.toBeInTheDocument();

        const signOut = screen.getByRole('menuitem', { name: /sign out/i });
        expect(signOut.tagName).toBe('BUTTON');
    });

    /**
     * The count is everything the server sent, not everything the menu shows.
     * It used to be the preview's own length, which made it the constant 3 for
     * every account that had ever done anything.
     */
    it('names the notifications button with the count, not colour alone', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;

        renderHeader();

        expect(
            screen.getByRole('button', { name: 'Notifications, 4 new' }),
        ).toBeInTheDocument();
    });

    /**
     * A brand new account has nothing in its threads, and used to wear an
     * unread dot anyway: the dot was painted unconditionally. Asserted through
     * the accessible name, because the dot itself is `aria-hidden` — colour is
     * never the only carrier.
     */
    it('says nothing is new when nothing is, and paints no dot', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;
        mockPage.props.threadNotifications = [];

        const { container } = renderHeader();

        expect(
            screen.getByRole('button', { name: 'Notifications, nothing new' }),
        ).toBeInTheDocument();
        expect(container.querySelector('.bg-primary.rounded-full')).toBeNull();
    });

    it('says so in the menu when there is nothing new', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;
        mockPage.props.threadNotifications = [];

        renderHeader();

        await user.click(
            screen.getByRole('button', { name: 'Notifications, nothing new' }),
        );

        expect(
            await screen.findByText(/nothing new in the threads you/i),
        ).toBeInTheDocument();
    });

    it('previews the first three and links each at its thread', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;

        renderHeader();

        await user.click(
            screen.getByRole('button', { name: 'Notifications, 4 new' }),
        );

        expect(
            await screen.findByText(NOTIFICATIONS[0].title, { exact: false }),
        ).toBeInTheDocument();

        /* The fourth is counted by the badge and not drawn by the menu. */
        expect(
            screen.queryByText(NOTIFICATIONS[3].title, { exact: false }),
        ).not.toBeInTheDocument();

        const rows = screen.getAllByRole('link', { name: /new repl/i });

        expect(rows).toHaveLength(3);
        expect(rows[0]).toHaveAttribute('href', '/g/58210441');

        const seeAll = screen.getByRole('menuitem', {
            name: /see all notifications/i,
        });
        expect(seeAll).toHaveAttribute('href', '/notifications');
    });

    it('hides notifications and messages for a signed-out anon, who has nothing to show there', () => {
        renderHeader();

        expect(
            screen.queryByRole('button', { name: /notifications/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /^messages$/i }),
        ).not.toBeInTheDocument();
    });

    it('names the theme toggle by what pressing it does, and flips that name when pressed', async () => {
        const user = userEvent.setup();
        renderHeader();

        const toggle = screen.getByRole('button', {
            name: /switch to (light|dark) theme/i,
        });
        const initialName = toggle.getAttribute('aria-label');

        await user.click(toggle);

        const nextName = toggle.getAttribute('aria-label');
        expect(nextName).toMatch(/switch to (light|dark) theme/i);
        expect(nextName).not.toBe(initialName);
    });

    /**
     * The field is sized to the column the threads are in, and sits in the
     * same container, so search is directly over the posts. It was capped at
     * 520px against a 760px column in a full-bleed bar, which read as two
     * grids that happened to share a page.
     */
    it('aligns the search field with the thread column', () => {
        renderHeader();

        const search = screen.getByRole('combobox', {
            name: /search boards and threads/i,
        });

        /* Both measures come from one place now, so the header and the feed
           cannot drift apart when the page widens on a large display. */
        expect(
            search.closest('[class*="max-w-(--measure-column)"]'),
        ).not.toBeNull();
        expect(
            search.closest('[class*="max-w-(--measure-page)"]'),
        ).not.toBeNull();
    });

    /** The paper runs through the chrome as well as the content. */
    it('is drawn on the same patterned paper as the page', () => {
        const { container } = renderHeader();

        expect(
            container.querySelector('[data-slot="pattern-field-paper"]')
                ?.className,
        ).toMatch(/bg-dots/);
    });

    it('is a sticky bar sitting above content, not fixed', () => {
        renderHeader();

        const header = document.querySelector('[data-slot="app-header"]');

        expect(header).toHaveClass('sticky', 'top-0');
        expect(header).not.toHaveClass('fixed');
    });

    /**
     * Below `lg` the sidebar is a drawer instead of a persistent rail, and
     * this is its only entry point once closed. Named to match the sidebar's
     * own "Collapse sidebar" / "Expand sidebar" toggles rather than the
     * generic "menu", since it opens that same component. Hidden at `lg` and
     * up: the rail is back by then, and a trigger for a drawer nothing can
     * open is a control that does nothing.
     */
    it('renders a hamburger that opens the sidebar drawer, hidden at `lg` and up', () => {
        renderHeader();

        const trigger = screen.getByRole('button', { name: /open sidebar/i });
        expect(trigger).toHaveClass('lg:hidden');
    });

    /**
     * The row is a fixed `h-16` at every width: three fixed-size controls
     * below `md` (hamburger, field, theme toggle) fit 320px on their own by
     * the arithmetic pinned above, so nothing here ever needs to wrap or
     * grow to a second line. An earlier cut at this task used `flex-wrap` /
     * `min-h-16` to cope with a row that carried more than three controls
     * below `md`; once the bell, the avatar and the auth buttons are gone
     * from that row, there is nothing left for a wrap fix to do.
     */
    it('keeps the header a fixed single-line height, not a wrapping row', () => {
        renderHeader();

        const header = document.querySelector('[data-slot="app-header"]');
        const row = document.querySelector('[data-slot="app-header-row"]');

        expect(header).toHaveClass('h-16');
        expect(header).not.toHaveClass('min-h-16');
        expect(row).toHaveClass('h-16');
        expect(row).not.toHaveClass('flex-wrap');
    });

    /**
     * Task 6: below `md`, the header field no longer opens the dropdown in
     * place -- there is not enough room to make that dropdown useful, which
     * is why Reddit's mobile search screen was the reference. It navigates
     * instead. The real, dropdown-capable field stays exactly as it is at
     * `md` and up, where the dropdown already works; this is a second,
     * `md:hidden` control living beside it, not a change to it.
     */
    describe('below `md`, the search field', () => {
        it('is a real button, distinct from the dropdown-capable field beside it', () => {
            renderHeader();

            const trigger = screen.getByRole('button', {
                name: 'Search boards and threads',
            });

            expect(trigger.tagName).toBe('BUTTON');
            expect(trigger).toHaveClass('md:hidden');

            /* The real field is still there for `md` and up, untouched --
               only visible below `md` as a decoy. */
            expect(
                screen.getByRole('combobox', {
                    name: 'Search boards and threads',
                }),
            ).toBeInTheDocument();
        });

        it('visits the search page on click', async () => {
            const user = userEvent.setup();
            renderHeader();

            await user.click(
                screen.getByRole('button', {
                    name: 'Search boards and threads',
                }),
            );

            expect(router.visit).toHaveBeenCalledWith('/search');
        });

        /** "Tapping or focusing" — both have to trigger it, not just one. */
        it('also visits the search page on focus, not only on click', () => {
            renderHeader();

            const trigger = screen.getByRole('button', {
                name: 'Search boards and threads',
            });

            trigger.focus();

            expect(router.visit).toHaveBeenCalledWith('/search');
        });
    });

    /**
     * On the search page itself below `md`, the page supplies its own app
     * bar (back control + the field, focused on arrival) in the header's
     * place, so the real header has to step aside there rather than stack a
     * second bar above it. At `md` and up nothing about the search page is
     * different from any other page, so the header stays exactly as it is.
     */
    describe('on the search page', () => {
        it('hides the whole header below `md`, unchanged at `md` and up', () => {
            mockPage.url = '/search';
            renderHeader();

            const header = document.querySelector('[data-slot="app-header"]');
            expect(header).toHaveClass('hidden', 'md:block');
        });

        it('still hides below `md` once a query is in the URL, not only for the bare suggestions page', () => {
            mockPage.url = '/search?q=g';
            renderHeader();

            const header = document.querySelector('[data-slot="app-header"]');
            expect(header).toHaveClass('hidden', 'md:block');
        });

        it('does not hide the header on any other page', () => {
            mockPage.url = '/g/';
            renderHeader();

            const header = document.querySelector('[data-slot="app-header"]');
            expect(header?.className).not.toMatch(/(^|\s)hidden(\s|$)/);
        });
    });
});
