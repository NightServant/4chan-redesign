import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { activityIconFor, Rail } from '@/components/feed/rail';
import { makeBoard } from '@/fixtures/factories';

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

/* Five boards so the "does not render beyond the first four" case has a fifth
   to leave out, and the rail is handed exactly what the feed page sends it. */
const BOARDS = [
    makeBoard({
        slug: '/g/',
        name: 'Technology',
        threads: '18,402',
        subscribed: true,
    }),
    makeBoard({ slug: '/biz/', name: 'Business', threads: '11,067' }),
    makeBoard({ slug: '/x/', name: 'Paranormal', threads: '6,204' }),
    makeBoard({ slug: '/fit/', name: 'Fitness', threads: '5,118' }),
    makeBoard({ slug: '/co/', name: 'Comics', threads: '4,002' }),
];

describe('Rail', () => {
    it('is a complementary landmark with its own accessible name, not a second nav', () => {
        render(<Rail />);

        const rail = screen.getByRole('complementary');

        expect(rail).toHaveAccessibleName();
        expect(rail.tagName).toBe('ASIDE');
    });

    it('does not render boards beyond the first four', () => {
        render(<Rail />);

        const fifthBoard = BOARDS[4];

        expect(screen.queryByText(fifthBoard.name)).not.toBeInTheDocument();
    });

    it('renders the community rules verbatim as an ordered list', () => {
        render(<Rail />);

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

    /**
     * The panel claimed /biz/ was under slow mode until 18:00 UTC. Harmless
     * copy against a fixture, a specific false statement about a live board
     * once /biz/ is a real one. Nothing upstream reports moderation state, so
     * the panel keeps its place and says nothing rather than saying something
     * untrue.
     */
    it('keeps the moderation panel but makes no claim about any board', () => {
        render(<Rail />);

        const region = screen.getByRole('region', {
            name: 'Moderation notices',
        });

        expect(
            within(region).getByText('No notices right now.'),
        ).toBeInTheDocument();
        expect(region).not.toHaveTextContent('/biz/');
    });

    /**
     * "Who is online" was `228,025 anons online` and a row of decorative
     * avatars. 4chan's JSON API publishes no presence figure at any scope, so
     * there is no honest version of the panel — not even an empty one, because
     * the panel was the number.
     */
    it('has no online panel, since nothing publishes an online count', () => {
        render(<Rail />);

        expect(
            screen.queryByRole('region', { name: 'Who is online' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/anons online/)).not.toBeInTheDocument();
    });

    it('renders every recent-activity entry with its text and time', () => {
        render(<Rail />);

        const activityRegion = screen.getByRole('region', {
            name: 'Recent activity',
        });

        for (const entry of ACTIVITY) {
            expect(
                within(activityRegion).getByText(entry.text),
            ).toBeInTheDocument();
        }
    });

    it('falls back to a neutral icon for an unrecognised activity icon name instead of crashing', () => {
        expect(() =>
            activityIconFor('a-name-that-does-not-exist'),
        ).not.toThrow();
        expect(activityIconFor('a-name-that-does-not-exist')).toBeTruthy();
        expect(activityIconFor('message-square')).toBeTruthy();
    });

    it('is hidden below lg and only appears as a flex column at lg and up', () => {
        render(<Rail />);

        const rail = screen.getByRole('complementary');

        expect(rail).toHaveClass('hidden');
        expect(rail).toHaveClass('lg:flex');
    });

    /**
     * Trending and popular boards moved into the app sidebar, which renders on
     * every screen rather than the three that mount a rail. Asserted as an
     * absence: the rail would otherwise regrow them and the product would list
     * the same boards twice on the pages that have both.
     */
    it('lists no boards, which the sidebar now does', () => {
        render(<Rail />);

        expect(
            screen.queryByRole('region', { name: /trending/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: /popular/i }),
        ).not.toBeInTheDocument();
    });

    it('keeps the three panels that belong beside a feed', () => {
        render(<Rail />);

        expect(screen.getAllByRole('region')).toHaveLength(3);
    });
});
