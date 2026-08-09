import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { activityIconFor, Rail } from '@/components/feed/rail';
import { ACTIVITY, BOARDS, TRENDING } from '@/fixtures/clover';

/**
 * The real `Link` requires an Inertia page context that only exists inside
 * `createInertiaApp`. This mirrors the double `thread-card.test.tsx` and
 * `app-sidebar.test.tsx` already use: a plain anchor, still queryable by role
 * and accessible name.
 */
vi.mock('@inertiajs/react', () => ({
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

describe('Rail', () => {
    it('is a complementary landmark with its own accessible name, not a second nav', () => {
        render(<Rail />);

        const rail = screen.getByRole('complementary');

        expect(rail).toHaveAccessibleName();
        expect(rail.tagName).toBe('ASIDE');
    });

    it('renders all six panels as named regions', () => {
        render(<Rail />);

        expect(
            screen.getByRole('region', { name: 'Trending topics' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Popular boards' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Community rules' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Moderation notices' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Who is online' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Recent activity' }),
        ).toBeInTheDocument();
    });

    /**
     * Trending rows: a rank number and post count are supplementary, not the
     * identity of the row. A row named "1" or "1 4,182 posts" is a defect
     * per the brief, so the accessible name must resolve to exactly the tag.
     */
    it('names every trending row after its tag alone, not the rank number', () => {
        render(<Rail />);

        const trendingRegion = screen.getByRole('region', {
            name: 'Trending topics',
        });

        for (const item of TRENDING) {
            const link = within(trendingRegion).getByRole('link', {
                name: item.tag,
            });
            expect(link).toBeInTheDocument();
        }

        expect(
            within(trendingRegion).queryByRole('link', { name: '1' }),
        ).not.toBeInTheDocument();
    });

    it('links trending rows to search', () => {
        render(<Rail />);

        const link = screen.getByRole('link', { name: TRENDING[0].tag });

        expect(link.getAttribute('href')).toContain('/search');
    });

    it('renders the popular-boards action link to communities', () => {
        render(<Rail />);

        expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute(
            'href',
            '/communities',
        );
    });

    it('renders every popular board row with its slug and online count', () => {
        render(<Rail />);

        const boardsRegion = screen.getByRole('region', {
            name: 'Popular boards',
        });

        for (const board of BOARDS.slice(0, 4)) {
            expect(
                within(boardsRegion).getByText(
                    `${board.slug} · ${board.online} online`,
                ),
            ).toBeInTheDocument();
        }
    });

    it('does not render boards beyond the first four', () => {
        render(<Rail />);

        const fifthBoard = BOARDS[4];

        expect(screen.queryByText(fifthBoard.name)).not.toBeInTheDocument();
    });

    it('toggles Join per row and exposes the pressed state non-visually', async () => {
        const user = userEvent.setup();
        render(<Rail />);

        const firstBoard = BOARDS[0];
        const boardsRegion = screen.getByRole('region', {
            name: 'Popular boards',
        });
        const row = within(boardsRegion)
            .getByText(firstBoard.name)
            .closest('li') as HTMLElement;

        const joinButton = within(row).getByRole('button', {
            name: /join/i,
        });
        expect(joinButton).toHaveAttribute('aria-pressed', 'false');

        await user.click(joinButton);

        const joinedButton = within(row).getByRole('button', {
            name: /joined/i,
        });
        expect(joinedButton).toHaveAttribute('aria-pressed', 'true');
        expect(joinedButton).toHaveAccessibleName(
            expect.stringMatching(/joined/i),
        );
    });

    it('only toggles the board row that was clicked', async () => {
        const user = userEvent.setup();
        render(<Rail />);

        const [firstBoard, secondBoard] = BOARDS;
        const boardsRegion = screen.getByRole('region', {
            name: 'Popular boards',
        });
        const firstRow = within(boardsRegion)
            .getByText(firstBoard.name)
            .closest('li') as HTMLElement;
        const secondRow = within(boardsRegion)
            .getByText(secondBoard.name)
            .closest('li') as HTMLElement;

        await user.click(
            within(firstRow).getByRole('button', { name: /join/i }),
        );

        expect(
            within(firstRow).getByRole('button', { name: /joined/i }),
        ).toBeInTheDocument();
        expect(
            within(secondRow).getByRole('button', { name: /^join$/i }),
        ).toHaveAttribute('aria-pressed', 'false');
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
     * A coloured box is colour-carrying state on its own. The notice must
     * reach assistive technology as a notice, not merely as a differently
     * tinted paragraph.
     */
    it('exposes the moderation notice to assistive technology as a note, not decoration', () => {
        render(<Rail />);

        const note = screen.getByRole('note');

        expect(note).toHaveTextContent(
            '/biz/ is under slow mode until 18:00 UTC. One post per anon every 5 minutes.',
        );
    });

    /**
     * Five overlapping avatars are one visual unit standing in for a count
     * that is already spelled out in text. Announcing five separate images
     * would be noise, not information.
     */
    it('does not announce the online avatar stack as five separate images', () => {
        render(<Rail />);

        const onlineRegion = screen.getByRole('region', {
            name: 'Who is online',
        });

        expect(within(onlineRegion).queryAllByRole('img')).toHaveLength(0);
        expect(
            within(onlineRegion).getByText('228,025 anons online'),
        ).toBeInTheDocument();
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
});
