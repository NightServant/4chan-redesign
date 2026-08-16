import { act, render, screen } from '@testing-library/react';
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

/**
 * `router.on` is captured the same way `app-layout.test.tsx` captures it, so
 * a test can fire a fake Inertia navigation without a real visit. `AppHeader`
 * needs this now too: it listens for `navigate` to collapse the mobile search
 * button back down, the same reason `AppLayout` listens for it to close the
 * sidebar drawer.
 */
const { navigateCallbacks } = vi.hoisted(() => ({
    navigateCallbacks: [] as Array<() => void>,
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    router: {
        on: (event: string, callback: () => void) => {
            if (event === 'navigate') {
                navigateCallbacks.push(callback);
            }

            return () => {};
        },
        patch: vi.fn(),
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
    navigateCallbacks.length = 0;
});

afterEach(() => {
    vi.restoreAllMocks();
});

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
     * Below `md` there is no room for a hamburger, a search control, a theme
     * toggle *and* two full-size auth buttons in one row -- that is the
     * overflow this task exists to fix. The brief describes that row as
     * hamburger, search, theme toggle: nothing else. `AppSidebar` carries
     * `Log in` / `Create account` below `md` instead (its own tests cover
     * that), so the header keeps both here -- still real links, still
     * reachable at `md` and up exactly as before -- and only stops showing
     * them below it.
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
     * The contract below `md` for a signed-out anon, stated directly: the
     * hamburger, the search control and the theme toggle carry no `md:`
     * visibility gate at all -- unconditionally reachable at every width --
     * while `Log in` and `Create account` carry exactly the opposite, a gate
     * that keeps them out below `md` and back at `md` and up. jsdom cannot
     * evaluate the media query itself, so this is the class-level version of
     * that fact: the three that must always be there have no `hidden`/`md:`
     * pair on them, and the two that must not have exactly one.
     */
    it('below `md` a signed-out anon reaches exactly the hamburger, search and theme toggle', () => {
        renderHeader();

        const hamburger = screen.getByRole('button', { name: /open sidebar/i });
        const search = screen.getByRole('button', { name: 'Search' });
        const theme = screen.getByRole('button', {
            name: /switch to (light|dark) theme/i,
        });
        const logIn = screen.getByRole('link', { name: 'Log in' });
        const createAccount = screen.getByRole('link', {
            name: 'Create account',
        });

        for (const control of [hamburger, search, theme]) {
            expect(control.className).not.toMatch(/(^|\s)hidden(\s|$)/);
        }

        for (const control of [logIn, createAccount]) {
            expect(control.className).toMatch(/(^|\s)hidden(\s|$)/);
            expect(control.className).toMatch(/md:inline-flex/);
        }
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

        /* The field is a combobox now, not a button, and it renders its own
           positioning wrapper for the dropdown, so the constraint is two
           levels up rather than one. */
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
     * Below `md` the field's wrapper used to collapse to a literal 0px: a
     * bordered box with a magnifier `<svg>` that had no handler, sitting over
     * an input nothing could type into. Tapping it did nothing, and nothing in
     * the accessibility tree said otherwise either -- the decorative glyph and
     * the zero-width input were the whole story. This button is the real
     * control in its place: a real `<button>`, a real accessible name, hidden
     * only once `md` and up hand the job back to the inline field.
     */
    describe('mobile search', () => {
        it('offers a real, labelled search button below `md`', () => {
            renderHeader();

            const trigger = screen.getByRole('button', { name: 'Search' });

            expect(trigger).toHaveClass('md:hidden');
            expect(trigger.tagName).toBe('BUTTON');

            /* The glyph inside carries no name of its own -- the button's
               `aria-label` is what a screen reader announces, so the icon
               being decorative here is correct rather than the bug the old
               field had. */
            const icon = trigger.querySelector('svg');
            expect(icon).toHaveAttribute('aria-hidden', 'true');
        });

        it('is absent from the document before render finds nothing else named "Search" pretending to be it', () => {
            renderHeader();

            /* Only one control answers to this name: the button. The field
               itself is named "Search boards and threads", not "Search", so
               there is no ambiguity for a query this exact to resolve. */
            expect(
                screen.getAllByRole('button', { name: 'Search' }),
            ).toHaveLength(1);
        });

        it('focuses the field and opens its dropdown when the button is pressed, then steps aside for it', async () => {
            const user = userEvent.setup();
            renderHeader();

            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'Search' }));

            const field = screen.getByRole('combobox', {
                name: /search boards and threads/i,
            });

            expect(field).toHaveFocus();
            expect(screen.getByRole('listbox')).toBeInTheDocument();

            /* The button and the field occupy the same slot below `md`; both
               visible at once would be two controls claiming the same job.
               Visibility itself is a CSS fact jsdom cannot see, so this reads
               the class that carries it instead. */
            expect(screen.getByRole('button', { name: 'Search' })).toHaveClass(
                'hidden',
            );
        });

        it('collapses back to the button once focus leaves the field', async () => {
            const user = userEvent.setup();
            renderHeader();

            await user.click(screen.getByRole('button', { name: 'Search' }));
            expect(screen.getByRole('button', { name: 'Search' })).toHaveClass(
                'hidden',
            );

            /* Tabbing to the next control in the header -- the theme toggle
               -- moves focus outside the search area entirely, which is what
               should close it. A click inside the results dropdown must not:
               that case is what the "opens ... then steps aside" test above
               already covers by never leaving the field. */
            await user.tab();

            expect(
                screen.getByRole('button', { name: 'Search' }),
            ).not.toHaveClass('hidden');
        });

        it('collapses back to the button when an Inertia navigation completes', async () => {
            const user = userEvent.setup();
            renderHeader();

            await user.click(screen.getByRole('button', { name: 'Search' }));
            expect(screen.getByRole('button', { name: 'Search' })).toHaveClass(
                'hidden',
            );

            expect(navigateCallbacks.length).toBeGreaterThan(0);
            act(() => {
                for (const callback of navigateCallbacks) {
                    callback();
                }
            });

            expect(
                screen.getByRole('button', { name: 'Search' }),
            ).not.toHaveClass('hidden');
        });

        /**
         * Signed in, the collapsed row already carries a hamburger and three
         * icon buttons (bell, theme toggle, avatar) alongside the search
         * button -- tighter controls than the signed-out case's two
         * full-size links, but real width all the same. Measured at 320px:
         * 272px inner width, 38px hamburger + 130px of icon buttons + 56px
         * of `gap-7` leaves the expanded field's `w-full` wrapper only 48px
         * to fill -- the original defect ("a bordered box ... over an input
         * nothing could type into") with a different cause. The hamburger
         * and the right-hand group step aside while the field is expanded so
         * it can have the row to itself, the same shape of fix already in
         * this file for `Log in` / `Create account`.
         */
        describe('signed in', () => {
            it('gives the field the whole row while expanded: hamburger and account controls step aside', async () => {
                const user = userEvent.setup();
                mockPage.props.auth.user = SIGNED_IN_USER;
                renderHeader();

                await user.click(
                    screen.getByRole('button', { name: 'Search' }),
                );

                const hamburger = screen.getByRole('button', {
                    name: /open sidebar/i,
                });
                const actions = document.querySelector(
                    '[data-slot="app-header-actions"]',
                );

                expect(hamburger).toHaveClass('hidden');
                expect(actions).toHaveClass('hidden');

                const field = screen.getByRole('combobox', {
                    name: /search boards and threads/i,
                });
                expect(field).toHaveFocus();
            });

            it('keeps the hamburger, bell, theme toggle and avatar reachable below `md` while collapsed', () => {
                mockPage.props.auth.user = SIGNED_IN_USER;
                renderHeader();

                const hamburger = screen.getByRole('button', {
                    name: /open sidebar/i,
                });
                const notifications = screen.getByRole('button', {
                    name: /notifications/i,
                });
                const theme = screen.getByRole('button', {
                    name: /switch to (light|dark) theme/i,
                });
                const avatar = screen.getByRole('button', {
                    name: 'Account menu',
                });

                for (const control of [
                    hamburger,
                    notifications,
                    theme,
                    avatar,
                ]) {
                    expect(control.className).not.toMatch(/(^|\s)hidden(\s|$)/);
                }
            });

            /**
             * `md:` overrides are what make the `hidden` gate above a
             * mobile-only fact rather than a permanent one. jsdom cannot
             * evaluate the media query itself, so this pins the class that
             * carries it, in both states -- collapsed, where nothing is
             * hidden yet the override still belongs on the element, and
             * expanded, where it is what undoes the hide at `md` and up.
             */
            it('carries the `md:` override that restores the hamburger and account controls, expanded or not', async () => {
                const user = userEvent.setup();
                mockPage.props.auth.user = SIGNED_IN_USER;
                renderHeader();

                const hamburger = screen.getByRole('button', {
                    name: /open sidebar/i,
                });
                const actions = document.querySelector(
                    '[data-slot="app-header-actions"]',
                );

                expect(hamburger).toHaveClass('md:inline-flex');
                expect(actions).toHaveClass('md:flex');

                await user.click(
                    screen.getByRole('button', { name: 'Search' }),
                );

                expect(hamburger).toHaveClass('md:inline-flex');
                expect(actions).toHaveClass('md:flex');
            });

            /**
             * The `onBlur` collapse path lives on the field's own wrapper,
             * not on the hamburger or the account group -- they are siblings
             * of it, never inside the `contains` check it runs, so hiding
             * them carries no risk of changing what that check sees. This is
             * the behavioural half of that: focus leaving the field must
             * still bring everything back, hamburger and account controls
             * included, not just un-hide the search button.
             */
            it('brings the hamburger and account controls back when focus leaves the expanded field', async () => {
                const user = userEvent.setup();
                mockPage.props.auth.user = SIGNED_IN_USER;
                renderHeader();

                await user.click(
                    screen.getByRole('button', { name: 'Search' }),
                );

                const hamburger = screen.getByRole('button', {
                    name: /open sidebar/i,
                });
                const actions = document.querySelector(
                    '[data-slot="app-header-actions"]',
                );

                expect(hamburger).toHaveClass('hidden');
                expect(actions).toHaveClass('hidden');

                await user.tab();

                expect(hamburger).not.toHaveClass('hidden');
                expect(actions).not.toHaveClass('hidden');
            });
        });
    });

    /**
     * A wrapping row was the first cut at the overflow this task exists to
     * fix, needed while `Log in` and `Create account` were still in the row
     * below `md`. They render only at `md` and up now (see the test above),
     * so below `md` the row is back to exactly three fixed-size controls --
     * hamburger, the collapsed search button, the theme toggle -- comfortably
     * inside 320px on their own, and the row is a fixed `h-16` again rather
     * than a `min-h-16` that could grow to two lines it no longer needs.
     * Measured live at 320px signed out: `scrollWidth` and `clientWidth` both
     * 320, expanded and collapsed.
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
});
