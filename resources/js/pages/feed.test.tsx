import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePaged, makeThread } from '@/fixtures/factories';
import Feed from '@/pages/feed';
import type { User } from '@/types/auth';

/**
 * `usePage`/`Link`/`Head` need a real Inertia app context this test does not
 * have. Mirrors the mock in `app-sidebar.test.tsx` and `mobile-nav.test.tsx`:
 * `Link` renders a plain anchor so the DOM stays queryable by role, `usePage`
 * reads a mutable fixture, `router.visit` is a spy so navigation
 * is observable without a real one happening.
 *
 * `feed/rail` is mocked too: it is owned by a different Task 7 worker and may
 * not exist yet at the moment this file is written. The contract (a `Rail`
 * export taking no props) is documented in `worker-a-brief.md`.
 */
const { usePage, router } = vi.hoisted(() => ({
    usePage: vi.fn(),
    router: { visit: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('@inertiajs/react', () => ({
    usePage,
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

vi.mock('@/components/feed/rail', () => ({
    /* Echoes how many threads it was handed, so a test can check the rail is
       given every page that has loaded and not just the first. */
    Rail: ({ threads }: { threads: unknown[] }) => (
        <div data-testid="rail-stub" data-threads={threads.length} />
    ),
}));

vi.mock('@/components/clover/paged-list', async () => ({
    PagedList: (await import('@/test/paged-list-stub')).PagedListStub,
}));

const SIGNED_IN_USER: User = {
    id: 1,
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

function mockPage({ signedIn = false }: { signedIn?: boolean } = {}) {
    usePage.mockReturnValue({
        url: '/dashboard',
        props: { auth: { user: signedIn ? SIGNED_IN_USER : null } },
    });
}

beforeEach(() => {
    mockPage();
    router.visit.mockClear();
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

/* Exactly what the controller sends: threads already ordered for the sort,
   plus the two lists the rail renders. Nothing here is filtered client-side. */
const LIBRARY = {
    boards: '77',
    threads: '11,301',
    posts: '52,884',
    lastSyncedAt: '2 hr ago',
    /* Signed out in these cases, so the counts are this reader's slice and
       the rail says "Visible to you" rather than "Clover holds". */
    complete: false,
};

const THREADS = [
    makeThread({
        title: 'Anons are still arguing about init systems',
    }),
    makeThread({
        title: 'Mainline kernel support or vendor tree',
    }),
    makeThread({ title: 'Battery life under sustained load' }),
];

describe('Feed', () => {
    /**
     * The column is capped at the same measure the attachment box is.
     *
     * At `--measure-column` it ran to 760px while an image stopped at 560, so
     * every card ended in 200px of empty paper down the right-hand side. One
     * token for both is what stops them drifting again.
     */
    it('caps the column at the same measure as the media it holds', () => {
        const { container } = render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(
            container.querySelector('[data-slot="feed-column"]'),
        ).toHaveClass('max-w-(--measure-media)');
    });

    /**
     * A feed mixes boards, and a post number does not identify a thread
     * across them.
     *
     * `Thread`'s own docblock says why it carries an `id` at all: post
     * numbering is a per-board sequence, so `/g/1234` and `/b/1234` can both
     * exist. Every cross-board list here was keyed on `no` regardless, which
     * hands React two children with the same key and lets it duplicate or
     * drop either. The account screen was already logging that to
     * `browser.log`, on the replies list, where local numbering makes the
     * collision certain rather than merely possible.
     */
    it('keys rows so two boards can share a post number', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});

        const collided = [
            makeThread({
                id: 1,
                no: 1234,
                board: '/g/',
                title: 'The /g/ one',
            }),
            makeThread({
                id: 2,
                no: 1234,
                board: '/b/',
                title: 'The /b/ one',
            }),
        ];

        render(
            <Feed
                sort="bumped"
                threads={makePaged(collided)}
                library={LIBRARY}
            />,
        );

        const warnings = error.mock.calls
            .flat()
            .filter(
                (argument): argument is string => typeof argument === 'string',
            )
            .join(' ');

        expect(warnings).not.toContain('same key');
    });

    it('renders "Home" for the bumped sort', () => {
        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Home' }),
        ).toBeInTheDocument();
    });

    it('renders "Popular" for the popular sort', () => {
        render(
            <Feed
                sort="popular"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Popular' }),
        ).toBeInTheDocument();
    });

    it('renders "Latest" for the latest sort', () => {
        render(
            <Feed
                sort="latest"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(
            screen.getByRole('heading', { level: 1, name: 'Latest' }),
        ).toBeInTheDocument();
    });

    it("does not render a second <main>: that is AppLayout's job", () => {
        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(screen.queryByRole('main')).not.toBeInTheDocument();
    });

    it('shows the anon banner when signed out', () => {
        mockPage({ signedIn: false });

        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(screen.getByText(/reading anonymously/i)).toBeInTheDocument();
    });

    it('hides the anon banner when signed in', () => {
        mockPage({ signedIn: true });

        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(
            screen.queryByText(/reading anonymously/i),
        ).not.toBeInTheDocument();
    });

    it('renders every fixture thread', () => {
        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        for (const thread of THREADS) {
            expect(
                screen.getByRole('heading', { level: 3, name: thread.title }),
            ).toBeInTheDocument();
        }
    });

    it('does not override the thread link: it resolves to the board and post number', () => {
        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        const first = THREADS[0];
        expect(screen.getByRole('link', { name: first.title })).toHaveAttribute(
            'href',
            `${first.board}${first.no}`,
        );
    });

    /**
     * Blessings, curses and the auth gate they opened are all gone from this
     * page. The gate went with them: it had one caller, and a gate left
     * mounted with nothing able to open it is the kind of dead control this
     * codebase has shipped before.
     *
     * Asserted as an absence, because every other test here would pass with a
     * vote control quietly restored.
     */
    it('offers no way to vote and opens no gate', async () => {
        const user = userEvent.setup();
        mockPage({ signedIn: false });
        const thread = THREADS[0];

        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        const card = screen
            .getByRole('heading', { level: 3, name: thread.title })
            .closest('[data-slot="thread-card"]') as HTMLElement;

        for (const name of [/bless/i, /curse/i, /upvote/i]) {
            expect(
                within(card).queryByRole('button', { name }),
            ).not.toBeInTheDocument();
        }

        await user.click(within(card).getByRole('button', { name: /share/i }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(router.post).not.toHaveBeenCalled();
    });

    /**
     * The feed pages itself as the reader scrolls, and says so with no button.
     *
     * "Load more" went because it did nothing: it showed two skeletons and put
     * itself back, with no second page behind it. The list is now a
     * `<PagedList>` over the `threads` prop, so reaching the end of it asks the
     * server for the next cursor. What a real `<InfiniteScroll>` then does with
     * the response is `paged-list.test.tsx`'s concern; this pins that the feed
     * hands it the right prop, draws every page that has loaded, and has not
     * grown a control to press.
     */
    it('pages the threads prop and draws every page that has loaded', () => {
        const firstPage = [makeThread({ title: 'Page one thread' })];
        const secondPage = [makeThread({ title: 'Page two thread' })];

        const { rerender } = render(
            <Feed
                sort="bumped"
                threads={makePaged(firstPage)}
                library={LIBRARY}
            />,
        );

        expect(screen.getByTestId('paged-list')).toHaveAttribute(
            'data-prop',
            'threads',
        );
        expect(screen.queryByText('Page two thread')).not.toBeInTheDocument();

        /* What Inertia hands the page once the second page has merged in. */
        rerender(
            <Feed
                sort="bumped"
                threads={makePaged([...firstPage, ...secondPage])}
                library={LIBRARY}
            />,
        );

        expect(screen.getByText('Page one thread')).toBeInTheDocument();
        expect(screen.getByText('Page two thread')).toBeInTheDocument();
        expect(screen.getAllByTestId('rail-stub')[0]).toHaveAttribute(
            'data-threads',
            '2',
        );
        expect(
            screen.queryByRole('button', { name: 'Load more threads' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('navigation', { name: 'Pagination' }),
        ).not.toBeInTheDocument();
    });

    it('hides the rail below lg and never squeezes the centre column', () => {
        const { container } = render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        const railWrapper = screen.getByTestId('rail-stub').parentElement;
        expect(railWrapper?.className).toMatch(/hidden/);
        expect(railWrapper?.className).toMatch(/lg:block/);
        expect(
            container.querySelector('[data-slot="feed-column"]'),
        ).toBeInTheDocument();
    });

    /**
     * The sort tabs were removed as visual overload: the sidebar already lists
     * Home, Popular and Latest as separate destinations, so the tab row was a
     * second control for navigation the chrome already provides.
     */
    it('does not repeat the sidebar destinations as a tab row', () => {
        render(
            <Feed
                sort="bumped"
                threads={makePaged(THREADS)}
                library={LIBRARY}
            />,
        );

        expect(
            screen.queryByRole('navigation', { name: /sort threads/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Recently bumped' }),
        ).not.toBeInTheDocument();
    });
});
