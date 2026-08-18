import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBoard, makeThread, makeActivity } from '@/fixtures/factories';
import Board from '@/pages/board';
import type { User } from '@/types/auth';
import type { ActivityEntry, Board as BoardType } from '@/types/clover';

/**
 * The real `Link`/`usePage` require an Inertia page context that only exists
 * inside `createInertiaApp`. This mirrors the double
 * `app-sidebar.test.tsx` uses: `Link` renders a plain anchor (still
 * queryable by role and accessible name) and `usePage` reads a mutable
 * fixture reset in `beforeEach`, which the chrome `Board` renders through
 * `AppLayout` (sidebar, header, mobile nav) also needs.
 */
const ACTIVITY_DOUBLE = [
    makeActivity({ text: 'You replied in /g/', time: '2 min ago' }),
];

const mockPage: {
    props: {
        auth: { user: User | null };
        sidebarOpen: boolean;
        recentActivity: ActivityEntry[];
        sidebarBoards: BoardType[];
    };
    url: string;
} = {
    props: {
        auth: { user: null },
        sidebarOpen: true,
        recentActivity: ACTIVITY_DOUBLE,
        sidebarBoards: [],
    },
    url: '/g/',
};

/**
 * The router double routes both methods through `this.visit`, so a detached
 * `const request = cond ? router.delete : router.post` fails here the way it
 * fails in the browser. `use-bookmark.test.tsx` documents why that matters:
 * a double of three plain functions left every bookmark button in this app
 * dead with the suite green.
 */
const { router } = vi.hoisted(() => ({
    router: {
        visit: vi.fn(),
        post(url: string, data?: unknown, options?: unknown) {
            return this.visit(url, {
                ...(options ?? {}),
                method: 'post',
                data,
            });
        },
        delete(url: string, options?: unknown) {
            return this.visit(url, { ...(options ?? {}), method: 'delete' });
        },
    },
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
    router,
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

/* The server sends this page one board and that board's threads, already
   filtered and in bump order. There is no longer a client-side filter to
   test, so the props are simply what the controller would have produced. */
const TECHNOLOGY = {
    ...makeBoard({ slug: '/g/', name: 'Technology', threads: '18,402' }),
    description: 'Hardware, software and the arguments between them.',
};

const COMICS = {
    ...makeBoard({ slug: '/co/', name: 'Comics', threads: '0' }),
    description: 'Cartoons, comics and storyboards.',
};

const G_THREADS = [
    makeThread({
        board: '/g/',
        title: 'Anons are still arguing about init systems',
    }),
    makeThread({
        board: '/g/',
        title: 'Mainline kernel support or vendor tree',
    }),
];

beforeEach(() => {
    router.visit.mockClear();
    mockPage.props = {
        auth: { user: null },
        sidebarOpen: true,
        recentActivity: ACTIVITY_DOUBLE,
        sidebarBoards: [],
    };
    mockPage.url = '/g/';
});

describe('Board', () => {
    it("renders the board's name, slug and thread count in the header", () => {
        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Technology' }),
        ).toBeInTheDocument();
        /* Scoped to the header: every thread card below carries the board's
           slug too, so an unscoped query matches three nodes. */
        const header = screen.getByRole('banner');

        expect(within(header).getByText('/g/')).toBeInTheDocument();
        expect(within(header).getByText('18,402 threads')).toBeInTheDocument();
    });

    /* The board's threads are chosen by the query now, so what this asserts is
       that the page renders every thread it is handed — not that it filters a
       longer list correctly, which is no longer its job. */
    it('lists every thread it is given', () => {
        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        for (const thread of G_THREADS) {
            expect(
                screen.getByRole('link', { name: thread.title }),
            ).toBeInTheDocument();
        }

        expect(
            screen.getAllByRole('link', { name: /arguing|mainline/i }),
        ).toHaveLength(G_THREADS.length);
    });

    it('renders the empty state and no thread cards for a board with no threads', () => {
        render(<Board board={COMICS} threads={[]} maxCommentChars={2000} />);

        expect(
            screen.getByRole('heading', { name: 'No threads on /co/ yet' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Nothing has been posted to this board. Threads appear here in bump order once they are.',
            ),
        ).toBeInTheDocument();

        for (const thread of G_THREADS) {
            expect(
                screen.queryByRole('link', { name: thread.title }),
            ).not.toBeInTheDocument();
        }
    });

    it("links the empty state's action to popular()", () => {
        render(<Board board={COMICS} threads={[]} maxCommentChars={2000} />);

        const action = screen.getByRole('link', {
            name: 'Browse popular threads',
        });

        expect(action).toHaveAttribute('href', '/popular');
    });

    it('carries a Join control reporting what the server says about this anon', () => {
        const { unmount } = render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        expect(screen.getByRole('button', { name: 'Join' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        unmount();

        render(
            <Board
                board={{ ...TECHNOLOGY, subscribed: true }}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        expect(screen.getByRole('button', { name: 'Joined' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    /**
     * A signed-out anon is what this page is mostly serving. The subscribe
     * route is behind `auth`, so an ungated press is a redirect off a public
     * reading page.
     */
    it('meets a signed-out anon pressing Join with the gate, and sends nothing', async () => {
        const user = userEvent.setup();
        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Join' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(router.visit).not.toHaveBeenCalled();
    });

    it('asks the server to follow the board when an anon is signed in', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = {
            id: 1,
            email: 'anon@example.com',
            email_verified_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
        };

        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Join' }));

        expect(router.visit).toHaveBeenCalledWith(
            `/boards/${TECHNOLOGY.id}/subscribe`,
            expect.objectContaining({ method: 'post', preserveScroll: true }),
        );
    });

    it('has exactly one first-level heading', () => {
        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('has exactly one first-level heading on an empty board too', () => {
        render(<Board board={COMICS} threads={[]} maxCommentChars={2000} />);

        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('renders the sort filter row with all three options', () => {
        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        const tablist = screen.getByRole('tablist');

        expect(
            within(tablist).getByRole('tab', { name: 'Recently bumped' }),
        ).toBeInTheDocument();
        expect(
            within(tablist).getByRole('tab', { name: 'New' }),
        ).toBeInTheDocument();
        expect(
            within(tablist).getByRole('tab', { name: 'Most replies' }),
        ).toBeInTheDocument();
    });

    /**
     * Three labels do not fit a 320px phone, and today they wrap onto a second
     * line, which reads as two rows of controls rather than one. The row
     * scrolls sideways instead, the treatment task 7 gave the search tabs.
     *
     * jsdom has no layout engine, so this is the contract that produces the
     * behaviour, not a measurement of it: the row scrolls, it does not wrap,
     * and no tab may be squeezed narrower than its own label.
     */
    it('scrolls the sort tabs sideways rather than wrapping them', () => {
        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        const tablist = screen.getByRole('tablist');

        expect(tablist).toHaveClass('overflow-x-auto');
        expect(tablist.className).not.toMatch(/\bflex-wrap\b/);
        expect(tablist.className).not.toMatch(/\bw-fit\b/);

        for (const tab of within(tablist).getAllByRole('tab')) {
            expect(tab).toHaveClass('shrink-0', 'whitespace-nowrap');
        }
    });

    /**
     * Reddit's community page carries a visitors-and-contributions line, Wiki
     * / Top 50 / Top Members links, Community highlights and flair filter
     * chips. Clover counts none of that, curates nothing, and 4chan boards
     * carry no flair. Rendering any of it would mean inventing the figure
     * behind it, which is the rule that deleted `Board.online`.
     */
    it('renders no section this application has no source for', () => {
        const { container } = render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        expect(container.textContent).not.toMatch(
            /visitor|contribution|wiki|top 50|top members|moderator|highlight|flair/i,
        );
    });
});
