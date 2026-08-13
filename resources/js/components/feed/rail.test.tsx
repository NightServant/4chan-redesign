import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Rail } from '@/components/feed/rail';
import { makeThread } from '@/fixtures/factories';

/**
 * The real `Link` requires an Inertia page context that only exists inside
 * `createInertiaApp`. This mirrors the double `thread-card.test.tsx` and
 * `app-sidebar.test.tsx` already use: a plain anchor, still queryable by role
 * and accessible name.
 */
/* Hoisted so the mock factory can close over it: `vi.mock` is lifted above
   every other statement in the file. */
const { ACTIVITY } = vi.hoisted(() => ({
    ACTIVITY: [
        {
            icon: 'message-square',
            text: 'You replied in /g/',
            time: '2 min ago',
        },
        {
            icon: 'bookmark',
            text: 'You saved a thread in /x/',
            time: '1 hr ago',
        },
    ],
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: { recentActivity: ACTIVITY, sidebarBoards: [] },
    }),
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

const LIBRARY = {
    boards: '77',
    threads: '11,301',
    posts: '52,884',
    lastSyncedAt: '2 hr ago',
};

const THREADS = [
    makeThread({ board: '/g/', replies: 12, media: null }),
    makeThread({ board: '/x/', replies: 8, media: null }),
];

describe('Rail', () => {
    it('is a complementary landmark with its own accessible name, not a second nav', () => {
        render(<Rail library={LIBRARY} threads={THREADS} />);

        const rail = screen.getByRole('complementary');

        expect(rail).toHaveAccessibleName();
        expect(rail.tagName).toBe('ASIDE');
    });

    it('renders the community rules verbatim as an ordered list', () => {
        render(<Rail library={LIBRARY} threads={THREADS} />);

        const rulesRegion = screen.getByRole('region', {
            name: 'Community rules',
        });
        const list = within(rulesRegion).getByRole('list');

        expect(list.tagName).toBe('OL');
        expect(
            within(rulesRegion).getByText(
                'Post on topic for the board you are on.',
            ),
        ).toBeInTheDocument();
        expect(
            within(rulesRegion).getByText(
                'No doxxing, no raids, no illegal content.',
            ),
        ).toBeInTheDocument();
        expect(
            within(rulesRegion).getByText('Spoiler anything that needs it.'),
        ).toBeInTheDocument();
        expect(
            within(rulesRegion).getByText(
                'Reports are read by janitors, not bots.',
            ),
        ).toBeInTheDocument();
    });

    it('is hidden below lg and only appears as a flex column at lg and up', () => {
        render(<Rail library={LIBRARY} threads={THREADS} />);

        const rail = screen.getByRole('complementary');

        expect(rail).toHaveClass('hidden');
        expect(rail).toHaveClass('lg:flex');
    });

    /**
     * The two panels this replaced were permanently blank: "Moderation
     * notices" said "No notices right now" on every render because nothing has
     * ever written one, and "Recent activity" was empty for every signed-out
     * visitor. Asserted as an absence so neither comes back.
     */
    it('shows no panel that can only ever be empty', () => {
        render(<Rail library={LIBRARY} threads={THREADS} />);

        expect(
            screen.queryByRole('region', { name: /moderation/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: /recent activity/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/no notices right now/i),
        ).not.toBeInTheDocument();
    });

    it('reports what Clover holds, counted rather than awaited', () => {
        render(<Rail library={LIBRARY} threads={THREADS} />);

        const panel = screen.getByRole('region', { name: /clover holds/i });

        expect(panel).toHaveTextContent('11,301');
        expect(panel).toHaveTextContent('77');
        expect(panel).toHaveTextContent('2 hr ago');
    });

    /** Derived from the threads on screen, so it cannot be empty when they are not. */
    it('describes the threads actually on the page', () => {
        render(<Rail library={LIBRARY} threads={THREADS} />);

        const panel = screen.getByRole('region', { name: /on this page/i });

        expect(panel).toHaveTextContent('Threads shown');
        expect(panel).toHaveTextContent('2');
        expect(panel).toHaveTextContent('Boards represented');
    });

    /** A rule a reader must interpret is one they will read differently to a janitor. */
    it('explains each rule rather than stating it bare', () => {
        render(<Rail library={LIBRARY} threads={THREADS} />);

        expect(
            screen.getByText(/belongs on none of them/i),
        ).toBeInTheDocument();
    });
});
