import { router } from '@inertiajs/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardDirectory } from '@/components/communities/board-directory';
import { makeDirectoryEntry } from '@/fixtures/factories';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: { recentActivity: [], sidebarBoards: [] },
    }),
    router: { post: vi.fn(), delete: vi.fn(), visit: vi.fn() },
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

/* The list the server would have sent: every board here is one this anon may
   see. Filtering moved into the query, so a not-worksafe board never reaches
   the component at all — which is why there is no /b/ in this list, and why
   the counts below are of visible boards rather than of a filtered subset. */
const BOARD_DIRECTORY = [
    makeDirectoryEntry({
        slug: '/g/',
        name: 'Technology',
        category: 'Interests',
        subscribed: true,
    }),
    makeDirectoryEntry({
        slug: '/wg/',
        name: 'Wallpapers',
        category: 'Creative',
        subscribed: true,
        description: 'Wallpaper dumps at native resolution.',
    }),
    makeDirectoryEntry({
        slug: '/biz/',
        name: 'Business',
        category: 'Work',
    }),
    makeDirectoryEntry({
        slug: '/x/',
        name: 'Paranormal',
        category: 'Interests',
        subscribed: true,
    }),
    makeDirectoryEntry({
        slug: '/fit/',
        name: 'Fitness',
        category: 'Life',
    }),
    makeDirectoryEntry({
        slug: '/co/',
        name: 'Comics',
        category: 'Creative',
        description: 'Cartoons, comics and storyboards.',
    }),
];

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

    /**
     * Following is stored now, so the count and the pressed state come back
     * from the server. This asserted a local flip — a button reporting
     * `aria-pressed` for something nothing recorded, which forgot itself on
     * reload.
     */
    it('asks the server to follow a board', async () => {
        const user = userEvent.setup();
        renderDirectory();

        await user.click(
            screen.getByRole('button', { name: 'Subscribe to /biz/' }),
        );

        expect(router.post).toHaveBeenCalledWith(
            expect.stringContaining('/subscribe'),
            {},
            expect.anything(),
        );
    });

    it('counts what the server says is followed', () => {
        renderDirectory();

        expect(screen.getByText('6 boards · 3 subscribed')).toBeInTheDocument();
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
 * Adult boards are hidden unless an anon opts in.
 *
 * The filtering used to happen in this component, against a list that already
 * held every board. That is not a boundary — data the browser holds is data
 * the anon has, whatever the interface draws — so it moved into the query and
 * this component lost its `showsMature` prop entirely.
 *
 * What is left here is the part that is still the component's job: saying that
 * the directory is incomplete, from a count the server supplies, without ever
 * receiving a hidden board. `BoardVisibilityTest` covers the filtering itself.
 */
describe('BoardDirectory hidden-board notice', () => {
    it('renders only what it is given, making no filtering decision', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} />);

        for (const entry of BOARD_DIRECTORY) {
            expect(screen.getByText(entry.name)).toBeInTheDocument();
        }
    });

    it('counts what it is showing', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} />);

        expect(
            screen.getByText(new RegExp(`^${BOARD_DIRECTORY.length} boards`)),
        ).toBeInTheDocument();
    });

    /**
     * Hiding boards without saying so leaves the directory quietly incomplete,
     * and leaves the setting undiscoverable for anyone who never goes looking.
     */
    it('says how many it is hiding, and where to change that', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} hiddenCount={24} />);

        expect(
            screen.getByText(/24 boards hidden by your content settings/i),
        ).toBeInTheDocument();
    });

    it('says nothing about hidden boards when none are hidden', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} hiddenCount={0} />);

        expect(
            screen.queryByText(/hidden by your content settings/i),
        ).toBeNull();
    });

    /**
     * The count has to come from the server. Deriving it from `boards` would
     * mean the browser holding the hidden boards in order to count them, which
     * is the arrangement this change exists to undo.
     */
    it('under-claims rather than inventing a count when none is given', () => {
        render(<BoardDirectory boards={BOARD_DIRECTORY} />);

        expect(
            screen.queryByText(/hidden by your content settings/i),
        ).toBeNull();
    });

    it('does not claim a fixed board count in the no-match copy', async () => {
        const user = userEvent.setup();
        render(<BoardDirectory boards={BOARD_DIRECTORY} />);

        await user.type(screen.getByLabelText('Search boards'), 'zzzznope');

        expect(
            screen.getByText(/Nothing matches "zzzznope"/),
        ).toBeInTheDocument();
        expect(screen.queryByText(/six boards/i)).toBeNull();
    });
});
