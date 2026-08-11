import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardDirectory } from '@/components/communities/board-directory';
import { BOARD_DIRECTORY } from '@/fixtures/clover';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

function renderDirectory(boards = BOARD_DIRECTORY) {
    render(<BoardDirectory boards={boards} />);

    return { search: screen.getByLabelText('Search boards') };
}

describe('BoardDirectory', () => {
    it('counts the boards and the subscriptions in the description', () => {
        renderDirectory();

        expect(screen.getByText('6 boards · 3 subscribed')).toBeInTheDocument();
    });

    it('lists exactly the routable boards, grouped by category', () => {
        renderDirectory();

        expect(screen.getAllByRole('link')).toHaveLength(
            BOARD_DIRECTORY.length,
        );

        const interests = screen.getByRole('region', { name: 'Interests' });

        expect(
            within(interests)
                .getAllByRole('link')
                .map((link) => link.textContent),
        ).toEqual(['Technology', 'Paranormal']);
    });

    it('recounts subscriptions as they are toggled', async () => {
        const user = userEvent.setup();
        renderDirectory();

        await user.click(
            screen.getByRole('button', { name: 'Subscribe to /biz/' }),
        );

        expect(screen.getByText('6 boards · 4 subscribed')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Subscribed to /biz/' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('filters on slug, name and description', async () => {
        const user = userEvent.setup();
        const { search } = renderDirectory();

        await user.type(search, 'wallpaper');

        /* Scoped to the grid: the mature-boards notice is a link too, and
           counting every link on the page would fold it into the total. */
        const grid = screen.getByRole('region', { name: 'Creative' });
        expect(within(grid).getAllByRole('link')).toHaveLength(1);
        expect(
            screen.getByRole('link', { name: 'Wallpapers' }),
        ).toBeInTheDocument();

        await user.clear(search);
        await user.type(search, '/fit/');

        expect(
            screen.getByRole('link', { name: 'Fitness' }),
        ).toBeInTheDocument();

        await user.clear(search);
        await user.type(search, 'storyboards');

        expect(
            screen.getByRole('link', { name: 'Comics' }),
        ).toBeInTheDocument();
    });

    it('drops a category group once nothing in it matches', async () => {
        const user = userEvent.setup();
        const { search } = renderDirectory();

        await user.type(search, 'wallpaper');

        expect(
            screen.getByRole('region', { name: 'Creative' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Interests' })).toBeNull();
    });

    it('says what matched nothing without apologising for it', async () => {
        const user = userEvent.setup();
        const { search } = renderDirectory();

        await user.type(search, 'anime');

        expect(
            screen.getByRole('heading', { name: 'No boards match' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Nothing matches "anime".'),
        ).toBeInTheDocument();
        /* No *board* is offered. The mature-boards notice links to settings
           and is not part of the result set, so the assertion names what it
           actually cares about instead of counting every anchor. */
        const boardLinks = screen
            .queryAllByRole('link')
            .filter((link) =>
                /^\/[a-z]+\/$/.test(link.getAttribute('href') ?? ''),
            );
        expect(boardLinks).toHaveLength(0);
    });
});

/**
 * Adult boards are hidden unless an anon opts in. The filter is only worth
 * having if something can fail it, so the fixture carries one board 4chan
 * marks `ws_board: 0`; these tests are what stop that from silently becoming
 * a control with nothing to act on.
 */
describe('BoardDirectory mature filter', () => {
    const mature = BOARD_DIRECTORY.filter((entry) => !entry.worksafe);

    it('has something to filter', () => {
        expect(mature.length).toBeGreaterThan(0);
    });

    it('hides adult boards by default', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} showsMature={false} />);

        for (const entry of mature) {
            expect(screen.queryByText(entry.name)).not.toBeInTheDocument();
        }
    });

    it('shows them once the anon has opted in', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} showsMature />);

        for (const entry of mature) {
            expect(screen.getByText(entry.name)).toBeInTheDocument();
        }
    });

    it('counts only what it is showing', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} showsMature={false} />);

        const shown = BOARD_DIRECTORY.length - mature.length;
        expect(
            screen.getByText(new RegExp(`^${shown} boards`)),
        ).toBeInTheDocument();
    });

    /**
     * Hiding boards without saying so leaves the directory quietly incomplete,
     * and leaves the setting undiscoverable for anyone who never goes looking.
     */
    it('says how many it is hiding, and where to change that', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} showsMature={false} />);

        expect(
            screen.getByText(/1 board hidden by your content settings/i),
        ).toBeInTheDocument();
    });

    it('says nothing about hidden boards when none are hidden', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} showsMature />);

        expect(
            screen.queryByText(/hidden by your content settings/i),
        ).toBeNull();
    });

    it('does not claim a fixed board count in the no-match copy', async () => {
        const user = userEvent.setup();
        render(<BoardDirectory boards={BOARD_DIRECTORY} showsMature={false} />);

        await user.type(screen.getByLabelText('Search boards'), 'zzzznope');

        expect(
            screen.getByText(/Nothing matches "zzzznope"/),
        ).toBeInTheDocument();
        expect(screen.queryByText(/six boards/i)).toBeNull();
    });
});
