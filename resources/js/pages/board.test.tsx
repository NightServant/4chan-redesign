import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBoard, makeThread } from '@/fixtures/factories';
import Board from '@/pages/board';
import type { User } from '@/types/auth';

/**
 * The real `Link`/`usePage` require an Inertia page context that only exists
 * inside `createInertiaApp`. This mirrors the double
 * `app-sidebar.test.tsx` uses: `Link` renders a plain anchor (still
 * queryable by role and accessible name) and `usePage` reads a mutable
 * fixture reset in `beforeEach`, which the chrome `Board` renders through
 * `AppLayout` (sidebar, header, mobile nav) also needs.
 */
const mockPage: {
    props: { auth: { user: User | null }; sidebarOpen: boolean };
    url: string;
} = {
    props: { auth: { user: null }, sidebarOpen: true },
    url: '/g/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
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
    makeThread({ board: '/g/', title: 'Anons are still arguing about init systems' }),
    makeThread({ board: '/g/', title: 'Mainline kernel support or vendor tree' }),
];

beforeEach(() => {
    mockPage.props = { auth: { user: null }, sidebarOpen: true };
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
        expect(
            screen.getByText('/g/ · 18,402 threads'),
        ).toBeInTheDocument();
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

        expect(screen.getAllByRole('link', { name: /arguing|mainline/i }))
            .toHaveLength(G_THREADS.length);
    });

    it('renders the empty state and no thread cards for a board with no threads', () => {
        render(
            <Board board={COMICS} threads={[]} maxCommentChars={2000} />,
        );

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
        render(
            <Board board={COMICS} threads={[]} maxCommentChars={2000} />,
        );

        const action = screen.getByRole('link', {
            name: 'Browse popular threads',
        });

        expect(action).toHaveAttribute('href', '/popular');
    });

    it('toggles the subscribe control and exposes its pressed state to assistive technology', async () => {
        const user = userEvent.setup();
        render(
            <Board
                board={TECHNOLOGY}
                threads={G_THREADS}
                maxCommentChars={2000}
            />,
        );

        const toggle = screen.getByRole('button', { name: 'Subscribe' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        await user.click(toggle);

        expect(
            screen.getByRole('button', { name: 'Subscribed' }),
        ).toHaveAttribute('aria-pressed', 'true');
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
        render(
            <Board board={COMICS} threads={[]} maxCommentChars={2000} />,
        );

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
            within(tablist).getByRole('tab', { name: 'Most blessed' }),
        ).toBeInTheDocument();
    });
});
