import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardDirectory } from '@/components/communities/board-directory';
import { makeDirectoryEntry } from '@/fixtures/factories';
import type { User } from '@/types/auth';

/**
 * The router double carries a receiver, for the reason `use-bookmark.test.tsx`
 * sets out at length: a double of plain functions cannot reproduce the
 * detached-method failure that left every bookmark button in this app dead
 * while the suite stayed green.
 */
const { usePage, router } = vi.hoisted(() => ({
    usePage: vi.fn(),
    router: {
        visit: vi.fn(),
        post(url: string, data?: unknown, options?: unknown) {
            return this.visit(url, {
                ...(options ?? {}),
                method: 'post',
                data,
            });
        },
        delete(url: string, options?: unknown) {
            return this.visit(url, { ...(options ?? {}), method: 'delete' });
        },
    },
}));

vi.mock('@inertiajs/react', () => ({
    usePage,
    router,
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

const USER: User = {
    id: 1,
    email: 'anon@example.com',
    email_verified_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

function mockPage(signedIn: boolean): void {
    usePage.mockReturnValue({
        url: '/communities',
        props: {
            auth: { user: signedIn ? USER : null },
            recentActivity: [],
            sidebarBoards: [],
        },
    });
}

/* The list the server would have sent: every board here is one this anon may
   see. Filtering moved into the query, so a not-worksafe board never reaches
   the component at all — which is why there is no /b/ in this list, and why
   the counts below are of visible boards rather than of a filtered subset. */
const BOARD_DIRECTORY = [
    makeDirectoryEntry({
        id: 1,
        slug: '/g/',
        name: 'Technology',
        category: 'Interests',
        subscribed: true,
    }),
    makeDirectoryEntry({
        id: 2,
        slug: '/wg/',
        name: 'Wallpapers',
        category: 'Creative',
        subscribed: true,
        description: 'Wallpaper dumps at native resolution.',
    }),
    makeDirectoryEntry({
        id: 3,
        slug: '/biz/',
        name: 'Business',
        category: 'Work',
    }),
    makeDirectoryEntry({
        id: 4,
        slug: '/x/',
        name: 'Paranormal',
        category: 'Interests',
        subscribed: true,
    }),
    makeDirectoryEntry({
        id: 5,
        slug: '/fit/',
        name: 'Fitness',
        category: 'Life',
    }),
    makeDirectoryEntry({
        id: 6,
        slug: '/co/',
        name: 'Comics',
        category: 'Creative',
        description: 'Cartoons, comics and storyboards.',
    }),
];

function renderDirectory(boards = BOARD_DIRECTORY, hiddenCount?: number) {
    return render(
        <BoardDirectory boards={boards} hiddenCount={hiddenCount ?? 0} />,
    );
}

beforeEach(() => {
    router.visit.mockClear();
    mockPage(true);
});

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
     * The kicker is real grouping, not decoration: it is the only thing saying
     * which boards belong together once the cards are gone.
     */
    it('keeps the category kicker above each group', () => {
        const { container } = renderDirectory();

        const kickers = [
            ...container.querySelectorAll('[data-slot="section-label"]'),
        ].map((node) => node.textContent);

        expect(kickers).toEqual(['Interests', 'Creative', 'Work', 'Life']);
    });

    it('counts what the server says is followed', () => {
        renderDirectory();

        expect(screen.getByText('6 boards · 3 subscribed')).toBeInTheDocument();
    });

    it('says nothing to list rather than rendering an empty group', () => {
        renderDirectory([]);

        expect(
            screen.getByRole('heading', { name: 'No boards to show' }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('region')).toBeNull();
    });
});

/**
 * Search is the header's job. It has its own page, its own results tabs and a
 * Communities tab among them (task 7), so a second box filtering a list the
 * browser already holds is a second search that behaves differently from the
 * one every other screen offers.
 */
describe('BoardDirectory without its own search', () => {
    it('offers no field of its own, at any width', () => {
        const { container } = renderDirectory();

        expect(screen.queryByLabelText('Search boards')).toBeNull();
        expect(screen.queryByRole('searchbox')).toBeNull();
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(container.querySelector('input')).toBeNull();
    });

    it('shows every board it is given, with nothing to type into to reduce them', () => {
        renderDirectory();

        for (const entry of BOARD_DIRECTORY) {
            expect(
                screen.getByRole('link', { name: entry.name }),
            ).toBeInTheDocument();
        }
    });
});

/**
 * Below `md` the directory is a ruled list, not a deck of 53 cards. jsdom has
 * no layout engine, so these are class contracts: the hairline between rows
 * exists unconditionally and the grid only starts at `md`.
 */
describe('BoardDirectory layout', () => {
    function boardList(container: HTMLElement): HTMLElement {
        const list = container.querySelector<HTMLElement>(
            '[data-slot="board-list"]',
        );

        if (list === null) {
            throw new Error('No element carries data-slot="board-list".');
        }

        return list;
    }

    it('rules between rows below md', () => {
        const { container } = renderDirectory();

        expect(boardList(container)).toHaveClass('divide-y', 'divide-border');
    });

    it('lays the rows out one per line below md and in a grid at md', () => {
        const { container } = renderDirectory();

        const list = boardList(container);

        expect(list).not.toHaveClass('grid');
        expect(list).toHaveClass('flex', 'flex-col');
        expect(
            [...list.classList].some((name) => name.startsWith('md:grid')),
        ).toBe(true);
        expect(list).toHaveClass('md:divide-y-0');
    });
});

/**
 * Following a board is stored, and the control writes through the shared hook
 * rather than through a second copy of the same call. The copy this component
 * carried had no `AuthGate`, and the subscribe routes sit behind `auth`: a
 * signed-out anon pressing Join on a page that is open to read was bounced to
 * the login form.
 */
describe('BoardDirectory Join control', () => {
    it('asks the server to follow a board', async () => {
        const user = userEvent.setup();
        renderDirectory();

        await user.click(screen.getByRole('button', { name: 'Join /biz/' }));

        expect(router.visit).toHaveBeenCalledWith(
            '/boards/3/subscribe',
            expect.objectContaining({ method: 'post', preserveScroll: true }),
        );
    });

    it('asks the server to unfollow a board it is already following', async () => {
        const user = userEvent.setup();
        renderDirectory();

        await user.click(screen.getByRole('button', { name: 'Joined /g/' }));

        expect(router.visit).toHaveBeenCalledWith(
            '/boards/1/subscribe',
            expect.objectContaining({ method: 'delete' }),
        );
    });

    it('reports what the server says, not local state', () => {
        renderDirectory();

        expect(
            screen.getByRole('button', { name: 'Joined /g/' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('button', { name: 'Join /biz/' }),
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('meets a signed-out anon with the gate rather than a redirect', async () => {
        const user = userEvent.setup();
        mockPage(false);

        renderDirectory();

        await user.click(screen.getByRole('button', { name: 'Join /biz/' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(router.visit).not.toHaveBeenCalled();
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
        renderDirectory();

        for (const entry of BOARD_DIRECTORY) {
            expect(screen.getByText(entry.name)).toBeInTheDocument();
        }
    });

    it('counts what it is showing', () => {
        renderDirectory();

        expect(
            screen.getByText(new RegExp(`^${BOARD_DIRECTORY.length} boards`)),
        ).toBeInTheDocument();
    });

    /**
     * Hiding boards without saying so leaves the directory quietly incomplete,
     * and leaves the setting undiscoverable for anyone who never goes looking.
     */
    it('says how many it is hiding, and where to change that', () => {
        renderDirectory(BOARD_DIRECTORY, 24);

        expect(
            screen.getByText(/24 boards hidden by your content settings/i),
        ).toBeInTheDocument();
    });

    /**
     * The link is the only route to that setting from this page, so the notice
     * saying a board is missing and the way to get it back travel together.
     */
    it('links the setting that hid them', () => {
        const { container } = renderDirectory(BOARD_DIRECTORY, 24);

        const notice = container.querySelector('[data-slot="mature-notice"]');

        expect(notice).not.toBeNull();
        expect(within(notice as HTMLElement).getByRole('link')).toHaveAttribute(
            'href',
            '/settings',
        );
    });

    it('says nothing about hidden boards when none are hidden', () => {
        renderDirectory(BOARD_DIRECTORY, 0);

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
});
