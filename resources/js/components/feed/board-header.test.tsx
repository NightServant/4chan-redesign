import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardHeader } from '@/components/feed/board-header';
import type { User } from '@/types/auth';
import type { Board } from '@/types/clover';

/**
 * The router double carries a receiver, for the reason
 * `use-bookmark.test.tsx` sets out at length: a double of three plain
 * functions cannot reproduce the detached-method failure that left every
 * bookmark button in this app dead while the suite stayed green.
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
        url: '/g/',
        props: { auth: { user: signedIn ? USER : null } },
    });
}

const TECH_BOARD: Board = {
    id: 9,
    slug: '/g/',
    name: 'Technology',
    threads: '41,208',
    nsfw: false,
    subscribed: false,
};

/**
 * The board from Gabe's 320px screenshot: a two-word title and a
 * three-sentence description, which is the pairing that collapsed the text
 * column when all three of avatar, title and Join shared one row.
 */
const GAMES_BOARD: Board & { description: string } = {
    id: 4,
    slug: '/v/',
    name: 'Video Games',
    threads: '1,224',
    nsfw: false,
    subscribed: false,
    description:
        'Video Games - This is a board for the discussion of video games. Console wars belong elsewhere. Spoilers get spoiler tags.',
};

beforeEach(() => {
    router.visit.mockClear();
    mockPage(true);
});

describe('BoardHeader', () => {
    it("renders the board's name as a heading", () => {
        render(<BoardHeader board={TECH_BOARD} />);

        expect(
            screen.getByRole('heading', { level: 1, name: 'Technology' }),
        ).toBeInTheDocument();
    });

    it("labels the board avatar with the board's token", () => {
        render(<BoardHeader board={TECH_BOARD} />);

        expect(
            screen.getByRole('img', { name: 'g board' }),
        ).toBeInTheDocument();
    });

    it('does not wrap itself in a card, so it cannot stack as a second card on the thread list', () => {
        const { container } = render(<BoardHeader board={TECH_BOARD} />);

        expect(
            container.querySelector('[data-slot="card"]'),
        ).not.toBeInTheDocument();
    });

    /**
     * The guard that keeps the deleted `online` field from coming back under a
     * new name. 4chan publishes no online count at any scope, so any copy here
     * reading "online" is describing a number nothing produced.
     */
    it('never claims to report anons online, since nothing upstream counts them', () => {
        const { container } = render(<BoardHeader board={TECH_BOARD} />);

        expect(container.textContent).not.toMatch(/online/i);
    });

    /**
     * Reddit's community header carries a visitors-and-contributions line, a
     * row of Wiki / Top 50 / Top Members links, and Community highlights.
     * Clover counts none of that and curates nothing, so none of it is here.
     * Same rule that deleted `Board.online`.
     */
    it('renders no figure or section this application has no source for', () => {
        const { container } = render(<BoardHeader board={GAMES_BOARD} />);

        expect(container.textContent).not.toMatch(
            /visitor|contribution|wiki|top 50|top members|moderator|highlight/i,
        );
    });

    describe('the identity row', () => {
        /**
         * The measured defect at ~320px: avatar, title and Join shared one
         * row, Join is `shrink-0`, and nothing let the text column shrink
         * below its own min-content width. The column collapsed to the width
         * of the longest word in the description, so "Video Games" broke onto
         * two lines and the description set at about ten characters a line.
         *
         * jsdom has no layout engine and cannot measure that. What it can hold
         * is the contract that produces it: the text column takes the leftover
         * space and is allowed to shrink, and the control beside it is not.
         */
        it('lets the text column shrink and take the leftover space', () => {
            const { container } = render(<BoardHeader board={GAMES_BOARD} />);

            const identity = container.querySelector(
                '[data-slot="board-identity"]',
            );

            expect(identity).toBeInTheDocument();
            expect(identity).toHaveClass('min-w-0', 'flex-1');
        });

        /**
         * The other half of the same row: whatever space the text column takes,
         * Join must not be squeezed into a two-line button.
         *
         * This asserts the outcome rather than a line in this file. The
         * guarantee lives in `Button`'s own base classes, so a restatement here
         * would be a second spelling of one rule and would make this
         * unfalsifiable — the negative control removing it from the header
         * passed, and only removing it from `Button` failed.
         */
        it('keeps the Join control from shrinking', () => {
            render(<BoardHeader board={GAMES_BOARD} />);

            expect(screen.getByRole('button', { name: 'Join' })).toHaveClass(
                'shrink-0',
            );
        });

        it('holds the title and the slug, and nothing else', () => {
            const { container } = render(<BoardHeader board={GAMES_BOARD} />);

            const identity = container.querySelector(
                '[data-slot="board-identity"]',
            );

            expect(identity).toHaveTextContent('Video Games');
            expect(identity).toHaveTextContent('/v/');
            expect(identity?.textContent).not.toMatch(/console wars/i);
            expect(identity?.textContent).not.toMatch(/1,224/);
        });

        /**
         * The description needs the whole measure, which it only has once it
         * is out of a column sharing a row with a fixed-width button.
         */
        it('sets the description on its own row beneath, not inside the column', () => {
            const { container } = render(<BoardHeader board={GAMES_BOARD} />);

            const identity = container.querySelector(
                '[data-slot="board-identity"]',
            );
            const description = screen.getByText(/Console wars belong/);

            expect(identity).not.toContainElement(description);
        });
    });

    describe('the thread count', () => {
        it('is a MachineValue on its own line, separate from the slug', () => {
            const { container } = render(<BoardHeader board={GAMES_BOARD} />);

            const figures = [
                ...container.querySelectorAll('[data-slot="machine-value"]'),
            ].map((node) => node.textContent);

            expect(figures).toContain('/v/');
            expect(figures).toContain('1,224 threads');
        });

        it('says "thread", not "threads", for a board carrying exactly one', () => {
            const { container } = render(
                <BoardHeader board={{ ...TECH_BOARD, threads: '1' }} />,
            );

            const figures = [
                ...container.querySelectorAll('[data-slot="machine-value"]'),
            ].map((node) => node.textContent);

            expect(figures).toContain('1 thread');
        });
    });

    describe('the Join control', () => {
        /**
         * This was `useState(false)` while the server was already sending
         * `subscribed` and `BoardSubscriptionController` was already writing
         * to a table: a control that looked right, reported `aria-pressed`,
         * and forgot itself on reload.
         */
        it('reports what the server says, not local state', () => {
            const { unmount } = render(<BoardHeader board={TECH_BOARD} />);

            expect(
                screen.getByRole('button', { name: 'Join' }),
            ).toHaveAttribute('aria-pressed', 'false');
            unmount();

            render(<BoardHeader board={{ ...TECH_BOARD, subscribed: true }} />);

            expect(
                screen.getByRole('button', { name: 'Joined' }),
            ).toHaveAttribute('aria-pressed', 'true');
        });

        it('asks the server to follow the board', async () => {
            const user = userEvent.setup();
            render(<BoardHeader board={TECH_BOARD} />);

            await user.click(screen.getByRole('button', { name: 'Join' }));

            expect(router.visit).toHaveBeenCalledWith(
                '/boards/9/subscribe',
                expect.objectContaining({
                    method: 'post',
                    preserveScroll: true,
                }),
            );
        });

        it('asks the server to unfollow a board it is already following', async () => {
            const user = userEvent.setup();
            render(<BoardHeader board={{ ...TECH_BOARD, subscribed: true }} />);

            await user.click(screen.getByRole('button', { name: 'Joined' }));

            expect(router.visit).toHaveBeenCalledWith(
                '/boards/9/subscribe',
                expect.objectContaining({ method: 'delete' }),
            );
        });

        it('meets a signed-out anon with the gate rather than a redirect', async () => {
            const user = userEvent.setup();
            mockPage(false);

            render(<BoardHeader board={TECH_BOARD} />);

            await user.click(screen.getByRole('button', { name: 'Join' }));

            expect(await screen.findByRole('dialog')).toBeInTheDocument();
            expect(router.visit).not.toHaveBeenCalled();
        });
    });

    /**
     * The board page now receives 4chan's own `meta_description`, so the line
     * under the identity row can be about this board rather than about the
     * product. Two different boards must therefore read differently.
     */
    it("shows the board's own description when it has one", () => {
        const { unmount } = render(
            <BoardHeader
                board={{
                    ...TECH_BOARD,
                    description:
                        'Technology - Computers, phones, and everything with a chip in it.',
                }}
            />,
        );
        expect(
            screen.getByText(/Computers, phones, and everything/),
        ).toBeInTheDocument();
        unmount();

        render(
            <BoardHeader
                board={{
                    id: 2,
                    slug: '/x/',
                    name: 'Paranormal',
                    threads: '7,442',
                    nsfw: false,
                    subscribed: false,
                    description: 'Paranormal - Ghosts, cryptids, and dreams.',
                }}
            />,
        );
        expect(
            screen.getByText(/Ghosts, cryptids, and dreams/),
        ).toBeInTheDocument();
    });

    /**
     * Boards reached without a description fall back to a line that is true of
     * every board rather than to a plausible-sounding summary of this one.
     * Rendering two different boards and comparing the text is what proves the
     * fallback is genuinely board-agnostic.
     */
    it('falls back to one board-agnostic line rather than inventing per-board copy', () => {
        const { unmount } = render(<BoardHeader board={TECH_BOARD} />);
        const techDescription = screen.getByText(/^Anonymous/).textContent;
        unmount();

        render(
            <BoardHeader
                board={{
                    id: 1,
                    slug: '/x/',
                    name: 'Paranormal',
                    threads: '7,442',
                    nsfw: false,
                    subscribed: false,
                }}
            />,
        );
        const paranormalDescription =
            screen.getByText(/^Anonymous/).textContent;

        expect(paranormalDescription).toBe(techDescription);
    });

    it('falls back rather than rendering an empty line for a board whose description is blank', () => {
        render(<BoardHeader board={{ ...TECH_BOARD, description: '' }} />);

        expect(screen.getByText(/^Anonymous/)).toBeInTheDocument();
    });
});
