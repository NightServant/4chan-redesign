import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSidebar } from '@/components/clover/app-sidebar';
import { makeBoard } from '@/fixtures/factories';
import { FOOTER_LINKS, PRIMARY_NAV } from '@/lib/navigation';
import type { User } from '@/types/auth';
import type { Board } from '@/types/clover';

/**
 * The real `Link`/`usePage` require an Inertia page context that only exists
 * inside `createInertiaApp`. The sidebar's own tests stand in a minimal
 * double instead: `Link` renders a plain anchor (still queryable by role and
 * accessible name) and `usePage` reads a mutable fixture reset in
 * `beforeEach`, so each test controls auth state and the current URL without
 * a real Inertia runtime.
 */
const BOARDS = [
    makeBoard({ slug: '/g/', name: 'Technology' }),
    makeBoard({ slug: '/biz/', name: 'Business' }),
];

const mockPage: {
    props: {
        auth: { user: User | null };
        sidebarOpen: boolean;
        /* Shared from `HandleInertiaRequests`: the sidebar is app chrome and
           renders on every screen, so its board list is not a page prop. */
        sidebarBoards: Board[];
        sidebarTrending: Board[];
    };
    url: string;
} = {
    props: {
        auth: { user: null },
        sidebarOpen: true,
        sidebarBoards: BOARDS,
        sidebarTrending: BOARDS,
    },
    url: '/',
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => mockPage,
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

const SIGNED_IN_USER: User = {
    id: 1,
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const PUBLIC_TITLES = PRIMARY_NAV.filter((item) => !item.requiresAuth).map(
    (item) => item.title,
);
const AUTH_ONLY_TITLES = PRIMARY_NAV.filter((item) => item.requiresAuth).map(
    (item) => item.title,
);

beforeEach(() => {
    mockPage.props = {
        auth: { user: null },
        sidebarOpen: true,
        sidebarBoards: BOARDS,
        sidebarTrending: BOARDS,
    };
    mockPage.url = '/';
    document.cookie = 'sidebar_state=; path=/; max-age=0';
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('AppSidebar', () => {
    /**
     * No collapse toggle below `lg`, where this sidebar is a drawer.
     *
     * Collapsing to an icon rail trades width for a strip of glyphs, which is
     * a desktop trade. In a drawer there is nothing to trade: the panel is
     * over the page, the hamburger already closes it, and collapsing left an
     * icon-only rail no route could reach.
     */
    it('offers its collapse toggle only at `lg` and up', () => {
        render(<AppSidebar />);

        const toggle = screen.getByRole('button', {
            name: /collapse sidebar/i,
        });

        expect(toggle).toHaveClass('hidden');
        expect(toggle).toHaveClass('lg:flex');
    });

    it('renders every PRIMARY_NAV row for a signed-in anon', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppSidebar />);

        for (const item of PRIMARY_NAV) {
            expect(
                screen.getByRole('link', { name: item.title }),
            ).toBeInTheDocument();
        }
    });

    it('hides requiresAuth rows and shows only the public rows for a signed-out anon', () => {
        mockPage.props.auth.user = null;

        render(<AppSidebar />);

        for (const title of PUBLIC_TITLES) {
            expect(
                screen.getByRole('link', { name: title }),
            ).toBeInTheDocument();
        }

        for (const title of AUTH_ONLY_TITLES) {
            expect(
                screen.queryByRole('link', { name: title }),
            ).not.toBeInTheDocument();
        }
    });

    it('marks the row matching the current URL with aria-current="page"', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;
        const active = PRIMARY_NAV[2];
        const activeUrl =
            typeof active.href === 'string' ? active.href : active.href.url;
        mockPage.url = activeUrl;

        render(<AppSidebar />);

        const activeLink = screen.getByRole('link', { name: active.title });
        expect(activeLink).toHaveAttribute('aria-current', 'page');

        const inactiveLink = screen.getByRole('link', {
            name: PRIMARY_NAV[0].title,
        });
        expect(inactiveLink).not.toHaveAttribute('aria-current');
    });

    /**
     * The section was labelled "Boards you use" and ordered by thread count,
     * which is not a thing any particular anon uses: it was the busiest boards
     * under a name that claimed otherwise. It is two honest lists now, moved
     * down from the feed's right rail so they reach every screen rather than
     * the three that mount a rail.
     */
    it('renders the footer links and both board lists when expanded', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppSidebar />);

        const lists = document.querySelectorAll(
            '[data-slot="sidebar-board-list"]',
        );

        expect(lists).toHaveLength(2);
        expect(lists[0].textContent).toContain('Popular');
        expect(lists[1].textContent).toContain('Trending');

        for (const link of FOOTER_LINKS) {
            expect(
                screen.getByRole('link', { name: link.title }),
            ).toBeInTheDocument();
        }
    });

    it('names the collapse toggle by the direction it collapses', () => {
        mockPage.props.sidebarOpen = true;

        render(<AppSidebar />);

        expect(
            screen.getByRole('button', { name: /collapse sidebar/i }),
        ).toBeInTheDocument();
    });

    it('names the expand toggle by the direction it expands when collapsed', () => {
        mockPage.props.sidebarOpen = false;

        render(<AppSidebar />);

        expect(
            screen.getByRole('button', { name: /expand sidebar/i }),
        ).toBeInTheDocument();
    });

    it('hides the board lists and footer links when collapsed', () => {
        mockPage.props.auth.user = SIGNED_IN_USER;
        mockPage.props.sidebarOpen = false;

        render(<AppSidebar />);

        expect(
            document.querySelectorAll('[data-slot="sidebar-board-list"]'),
        ).toHaveLength(0);

        for (const link of FOOTER_LINKS) {
            expect(
                screen.queryByRole('link', { name: link.title }),
            ).not.toBeInTheDocument();
        }
    });

    it('collapses on toggle, hiding visible row labels while every row keeps its accessible name', async () => {
        const user = userEvent.setup();
        mockPage.props.auth.user = SIGNED_IN_USER;

        render(<AppSidebar />);

        await user.click(
            screen.getByRole('button', { name: /collapse sidebar/i }),
        );

        for (const item of PRIMARY_NAV) {
            const link = screen.getByRole('link', { name: item.title });
            expect(link).toBeInTheDocument();

            const label = within(link).getByText(item.title);
            expect(label).toHaveClass('sr-only');
        }

        expect(
            screen.getByRole('button', { name: /expand sidebar/i }),
        ).toBeInTheDocument();
    });

    it('writes the sidebar_state cookie when the collapse toggle is used', async () => {
        const user = userEvent.setup();
        mockPage.props.sidebarOpen = true;

        render(<AppSidebar />);

        await user.click(
            screen.getByRole('button', { name: /collapse sidebar/i }),
        );

        expect(document.cookie).toContain('sidebar_state=false');
    });

    /**
     * The sidebar sits beside the header, not above it, so its first row has
     * to be exactly as tall as the header (64px) or the wordmark and the
     * header content sit on different baselines. Reported from a screenshot:
     * the collapsed rail did not line up with the header or its own toggle.
     */
    it('matches the header height on its brand row so the two align', () => {
        mockPage.props.sidebarOpen = true;
        const { container } = render(<AppSidebar />);

        expect(
            container.querySelector('[data-slot="sidebar-brand"]'),
        ).toHaveClass('h-16');
    });

    /**
     * Collapsed, every icon must share one vertical axis. Rows keeping their
     * expanded horizontal padding push the glyph left of the toggle above it.
     */
    it('centres every row icon on one axis when collapsed', () => {
        mockPage.props.sidebarOpen = false;
        const { container } = render(<AppSidebar />);

        const rows = container.querySelectorAll('[data-slot="sidebar-row"]');

        expect(rows.length).toBeGreaterThan(0);

        for (const row of rows) {
            expect(row.className).toContain('justify-center');
            expect(row.className).not.toMatch(/px-\[11px\]/);
        }
    });

    it('keeps the collapsed rail exactly one icon wide', () => {
        mockPage.props.sidebarOpen = false;
        const { container } = render(<AppSidebar />);

        expect(
            container.querySelector('[data-slot="app-sidebar"]'),
        ).toHaveClass('w-[76px]');
    });

    /**
     * The rail used to persist from `md`, which at an 805px tablet width left
     * the feed only 489px wide against a 268px sidebar. Below `lg` it is a
     * drawer's job now, built from this same component, so the rail itself
     * only needs to stay out of `lg`'s way.
     */
    it('stays visible from `lg` up rather than `md`, now that a drawer covers everything below it', () => {
        const { container } = render(<AppSidebar />);

        const aside = container.querySelector('[data-slot="app-sidebar"]');
        expect(aside).toHaveClass('lg:block');
        expect(aside).not.toHaveClass('md:block');
    });

    /** The paper runs through the chrome as well as the content. */
    it('is drawn on the same patterned paper as the page', () => {
        const { container } = render(<AppSidebar />);

        expect(
            container.querySelector('[data-slot="pattern-field-paper"]')
                ?.className,
        ).toMatch(/bg-dots/);
    });
});
