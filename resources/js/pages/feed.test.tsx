import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THREADS } from '@/fixtures/clover';
import Feed from '@/pages/feed';
import type { User } from '@/types/auth';

/**
 * `usePage`/`Link`/`Head` need a real Inertia app context this test does not
 * have. Mirrors the mock in `app-sidebar.test.tsx` and `mobile-nav.test.tsx`:
 * `Link` renders a plain anchor so the DOM stays queryable by role, `usePage`
 * reads a mutable fixture, `router.visit` is a spy so the "signed-out anon
 * pressing bless" behaviour is observable without a real navigation.
 *
 * `feed/rail` is mocked too: it is owned by a different Task 7 worker and may
 * not exist yet at the moment this file is written. The contract (a `Rail`
 * export taking no props) is documented in `worker-a-brief.md`.
 */
const { usePage, router } = vi.hoisted(() => ({
    usePage: vi.fn(),
    router: { visit: vi.fn() },
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

describe('Feed', () => {
    it('renders "Home" for the bumped sort', () => {
        render(<Feed sort="bumped" />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Home' }),
        ).toBeInTheDocument();
    });

    it('renders "Popular" for the popular sort', () => {
        render(<Feed sort="popular" />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Popular' }),
        ).toBeInTheDocument();
    });

    it('renders "Latest" for the latest sort', () => {
        render(<Feed sort="latest" />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Latest' }),
        ).toBeInTheDocument();
    });

    it("does not render a second <main>: that is AppLayout's job", () => {
        render(<Feed sort="bumped" />);

        expect(screen.queryByRole('main')).not.toBeInTheDocument();
    });

    it('shows the anon banner when signed out', () => {
        mockPage({ signedIn: false });

        render(<Feed sort="bumped" />);

        expect(screen.getByText(/browsing anonymously/i)).toBeInTheDocument();
    });

    it('hides the anon banner when signed in', () => {
        mockPage({ signedIn: true });

        render(<Feed sort="bumped" />);

        expect(
            screen.queryByText(/browsing anonymously/i),
        ).not.toBeInTheDocument();
    });

    it('renders every fixture thread', () => {
        render(<Feed sort="bumped" />);

        for (const thread of THREADS) {
            expect(
                screen.getByRole('heading', { level: 3, name: thread.title }),
            ).toBeInTheDocument();
        }
    });

    it('does not override the thread link: it resolves to the board and post number', () => {
        render(<Feed sort="bumped" />);

        const first = THREADS[0];
        expect(screen.getByRole('link', { name: first.title })).toHaveAttribute(
            'href',
            `${first.board}${first.no}`,
        );
    });

    it('increments the blessing count when a signed-in anon presses bless, and undoes it on a second press', async () => {
        const user = userEvent.setup();
        mockPage({ signedIn: true });
        const thread = THREADS[0];

        render(<Feed sort="bumped" />);

        const card = screen
            .getByRole('heading', { level: 3, name: thread.title })
            .closest('[data-slot="thread-card"]') as HTMLElement;

        expect(
            within(card).getByText(String(thread.blessings)),
        ).toBeInTheDocument();

        await user.click(
            within(card).getByRole('button', { name: 'Bless this post' }),
        );

        expect(
            within(card).getByText(String(thread.blessings + 1)),
        ).toBeInTheDocument();

        await user.click(
            within(card).getByRole('button', { name: 'Bless this post' }),
        );

        expect(
            within(card).getByText(String(thread.blessings)),
        ).toBeInTheDocument();
    });

    /**
     * The design's own pattern for a gated action is a dialog, not a redirect.
     * Sending an anon to /login throws away their place in the feed to answer
     * a question they may not want to answer yet, and the thread page already
     * uses the gate, so the two pages agreed on nothing.
     */
    it('opens the auth gate instead of voting when a signed-out anon blesses', async () => {
        const user = userEvent.setup();
        mockPage({ signedIn: false });
        const thread = THREADS[0];

        render(<Feed sort="bumped" />);

        const card = screen
            .getByRole('heading', { level: 3, name: thread.title })
            .closest('[data-slot="thread-card"]') as HTMLElement;

        await user.click(
            within(card).getByRole('button', { name: 'Bless this post' }),
        );

        expect(
            await screen.findByRole('dialog', {
                name: /create an account to continue/i,
            }),
        ).toBeInTheDocument();
        expect(screen.getByText(/bless a thread/i)).toBeInTheDocument();
        expect(router.visit).not.toHaveBeenCalled();
        expect(
            within(card).getByText(String(thread.blessings)),
        ).toBeInTheDocument();
    });

    it('shows two thread skeletons and a disabled "Loading" button while loading more, then stops', async () => {
        const user = userEvent.setup();

        render(<Feed sort="bumped" />);

        expect(
            document.querySelectorAll('[data-slot="thread-skeleton"]'),
        ).toHaveLength(0);

        const loadMore = screen.getByRole('button', {
            name: 'Load more threads',
        });
        await user.click(loadMore);

        expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled();
        expect(
            document.querySelectorAll('[data-slot="thread-skeleton"]'),
        ).toHaveLength(2);

        await screen.findByRole(
            'button',
            { name: 'Load more threads' },
            { timeout: 2000 },
        );

        expect(
            document.querySelectorAll('[data-slot="thread-skeleton"]'),
        ).toHaveLength(0);
    });

    it('renders pagination as a landmark', () => {
        render(<Feed sort="bumped" />);

        expect(
            screen.getByRole('navigation', { name: 'Pagination' }),
        ).toBeInTheDocument();
    });

    it('hides the rail below lg and never squeezes the centre column', () => {
        const { container } = render(<Feed sort="bumped" />);

        const railWrapper = screen.getByTestId('rail-stub').parentElement;
        expect(railWrapper?.className).toMatch(/hidden/);
        expect(railWrapper?.className).toMatch(/lg:block/);
        expect(
            container.querySelector('[data-slot="feed-column"]'),
        ).toBeInTheDocument();
    });

    /**
     * The count moving is not enough on its own: a blessing that shows only as
     * a number changing is state carried by nothing an assistive technology
     * can report. This is the half that could not be built until `ThreadCard`
     * gained a `voteState` prop.
     */
    it('marks a blessed thread as pressed, not only as one count higher', async () => {
        const user = userEvent.setup();
        mockPage({ signedIn: true });
        render(<Feed sort="bumped" />);

        const bless = screen.getAllByRole('button', { name: /bless/i })[0];

        expect(bless).toHaveAttribute('aria-pressed', 'false');

        await user.click(bless);

        expect(
            screen.getAllByRole('button', { name: /bless/i })[0],
        ).toHaveAttribute('aria-pressed', 'true');
    });

    /**
     * The sort tabs were removed as visual overload: the sidebar already lists
     * Home, Popular and Latest as separate destinations, so the tab row was a
     * second control for navigation the chrome already provides.
     */
    it('does not repeat the sidebar destinations as a tab row', () => {
        render(<Feed sort="bumped" />);

        expect(
            screen.queryByRole('navigation', { name: /sort threads/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Recently bumped' }),
        ).not.toBeInTheDocument();
    });
});
