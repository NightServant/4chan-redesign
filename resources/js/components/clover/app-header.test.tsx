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
        render(<AppHeader />);

        expect(
            screen.queryByRole('button', { name: /new thread/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /new thread/i }),
        ).not.toBeInTheDocument();
    });

    it('shows Log in and Create account and no avatar for a signed-out anon', () => {
        render(<AppHeader />);

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

    it('shows the account avatar trigger and opens the account menu on click, with items reachable', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppHeader />);

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

        render(<AppHeader />);

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

        const { container } = render(<AppHeader />);

        expect(
            screen.getByRole('button', { name: 'Notifications, nothing new' }),
        ).toBeInTheDocument();
        expect(container.querySelector('.bg-primary.rounded-full')).toBeNull();
    });

    it('says so in the menu when there is nothing new', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;
        mockPage.props.threadNotifications = [];

        render(<AppHeader />);

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

        render(<AppHeader />);

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
        render(<AppHeader />);

        expect(
            screen.queryByRole('button', { name: /notifications/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /^messages$/i }),
        ).not.toBeInTheDocument();
    });

    it('names the theme toggle by what pressing it does, and flips that name when pressed', async () => {
        const user = userEvent.setup();
        render(<AppHeader />);

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
        render(<AppHeader />);

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
        const { container } = render(<AppHeader />);

        expect(
            container.querySelector('[data-slot="pattern-field-paper"]')
                ?.className,
        ).toMatch(/bg-dots/);
    });

    it('is a sticky bar sitting above content, not fixed', () => {
        render(<AppHeader />);

        const header = document.querySelector('[data-slot="app-header"]');

        expect(header).toHaveClass('sticky', 'top-0');
        expect(header).not.toHaveClass('fixed');
    });
});
