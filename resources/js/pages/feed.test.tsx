import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBoard, makeThread, makeTrendingTag } from '@/fixtures/factories';
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
    Rail: () => <div data-testid="rail-stub" />,
}));

const SIGNED_IN_USER: User = {
    id: 1,
    name: 'Anon',
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
const THREADS = [
    makeThread({
        title: 'Anons are still arguing about init systems',
    }),
    makeThread({
        title: 'Mainline kernel support or vendor tree',
    }),
    makeThread({ title: 'Battery life under sustained load' }),
];

const BOARDS = [
    makeBoard({ slug: '/g/', name: 'Technology' }),
    makeBoard({ slug: '/biz/', name: 'Business' }),
];

const TRENDING = [makeTrendingTag({ tag: '/g/', posts: '4,182 posts' })];

describe('Feed', () => {
    it('renders "Home" for the bumped sort', () => {
        render(
            <Feed
                sort="bumped"
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
            />,
        );

        expect(screen.queryByRole('main')).not.toBeInTheDocument();
    });

    it('shows the anon banner when signed out', () => {
        mockPage({ signedIn: false });

        render(
            <Feed
                sort="bumped"
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
            />,
        );

        expect(screen.getByText(/browsing anonymously/i)).toBeInTheDocument();
    });

    it('hides the anon banner when signed in', () => {
        mockPage({ signedIn: true });

        render(
            <Feed
                sort="bumped"
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
            />,
        );

        expect(
            screen.queryByText(/browsing anonymously/i),
        ).not.toBeInTheDocument();
    });

    it('renders every fixture thread', () => {
        render(
            <Feed
                sort="bumped"
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
     * The feed's "Load more" and its pagination landmark are both gone.
     *
     * Neither did anything. "Load more" showed two skeletons, waited, and put
     * itself back — there was no second page to fetch, because every thread
     * the page had was already in the fixture it imported. The pagination
     * landmark navigated between pages that did not exist.
     *
     * With a real server the feed is one query with a limit, and paging it is
     * a server concern: it needs a cursor on the prop, not a control that
     * animates. Rather than keep two affordances that lie about what pressing
     * them does, they are removed until the thing they describe exists. This
     * comment is here so the next person knows it was deliberate.
     */
    it('offers no paging control it cannot honour', () => {
        render(
            <Feed
                sort="bumped"
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
            />,
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
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
                threads={THREADS}
                boards={BOARDS}
                trending={TRENDING}
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
