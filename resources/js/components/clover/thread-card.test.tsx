import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ThreadCard } from '@/components/clover/thread-card';
import { makeAttachment } from '@/fixtures/factories';
import type { Thread } from '@/types/clover';

/**
 * `Link` is replaced with a plain anchor: it keeps the DOM queryable by role
 * without pulling in the real router, and avoids jsdom's "not implemented:
 * navigation" noise if a click were ever to reach it. See
 * `mobile-nav.test.tsx` for the same pattern.
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

const baseThread: Thread = {
    id: 1,
    no: 58210441,
    board: '/g/',
    boardName: 'Technology',
    time: '4 min ago',
    title: 'RISC-V laptops are finally usable as daily drivers',
    excerpt: 'Compiling LLVM takes 40 minutes but everything else is fine.',
    replies: 318,
    images: '48',
    media: null,
    pinned: false,
    bookmarked: false,
};

describe('ThreadCard', () => {
    it('makes the title the one link, named for the thread', () => {
        render(<ThreadCard thread={baseThread} />);

        const links = screen.getAllByRole('link');

        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAccessibleName(baseThread.title);
    });

    it('points the title link at the board and post number', () => {
        render(<ThreadCard thread={baseThread} />);

        expect(
            screen.getByRole('link', { name: baseThread.title }),
        ).toHaveAttribute('href', '/g/58210441');
    });

    /**
     * Blessings and curses were removed outright rather than renamed, so the
     * absence of a score is the thing worth asserting: a card that quietly
     * regained a vote control would otherwise pass every test below.
     */
    it('offers no way to vote and shows no score', () => {
        render(<ThreadCard thread={baseThread} />);

        for (const name of [/bless/i, /curse/i, /upvote/i, /downvote/i]) {
            expect(
                screen.queryByRole('button', { name }),
            ).not.toBeInTheDocument();
        }

        expect(document.querySelector('[data-slot="vote-control"]')).toBeNull();
    });

    it('keeps the share button out of the title link so nesting stays valid', () => {
        render(<ThreadCard thread={baseThread} />);

        const link = screen.getByRole('link', { name: baseThread.title });
        const share = screen.getByRole('button', { name: /share/i });

        expect(link.contains(share)).toBe(false);
    });

    it('never dispatches a click at the title link when share is pressed', async () => {
        const linkClick = vi.fn();

        render(<ThreadCard thread={baseThread} />);

        const link = screen.getByRole('link', { name: baseThread.title });
        link.addEventListener('click', linkClick);

        await userEvent.click(screen.getByRole('button', { name: /share/i }));

        expect(linkClick).not.toHaveBeenCalled();
    });

    it('keeps the footer buttons independently focusable in an order that matches the visual layout', async () => {
        const user = userEvent.setup();

        render(<ThreadCard thread={baseThread} />);

        await user.tab();
        expect(
            screen.getByRole('link', { name: baseThread.title }),
        ).toHaveFocus();

        await user.tab();
        expect(screen.getByRole('button', { name: /share/i })).toHaveFocus();

        await user.tab();
        expect(
            screen.getByRole('button', { name: 'Bookmark thread' }),
        ).toHaveFocus();
    });

    it('shows the pinned badge only when the thread is pinned', () => {
        const { rerender } = render(
            <ThreadCard thread={{ ...baseThread, pinned: true }} />,
        );

        expect(screen.getByText('Pinned')).toBeInTheDocument();

        rerender(<ThreadCard thread={{ ...baseThread, pinned: false }} />);

        expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
    });

    it('renders media only when the thread carries an attachment', () => {
        const media = makeAttachment({
            label: 'ridge-4k.png · 3840x2160 · 4.1 MB',
            filename: 'ridge-4k.png',
        });

        const { rerender } = render(
            <ThreadCard thread={{ ...baseThread, media }} />,
        );

        expect(
            screen.getByRole('img', { name: media.filename }),
        ).toBeInTheDocument();

        rerender(<ThreadCard thread={{ ...baseThread, media: null }} />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    /**
     * This used to assert the opposite — that a card never renders a real
     * `<img>` — because media was metadata and there was no file to point at.
     * There is one now, so the rule it was protecting moved rather than went
     * away: attachments are still never invented, and the card still shows
     * only what 4chan reported.
     *
     * The card keeps the image's own shape rather than cropping it into a
     * fixed band. Thread lists are a single vertical column, so cards of
     * differing heights sit together fine and there is no row to line up.
     */
    it('shows the attachment filling the card, with no margin down one side', () => {
        const media = makeAttachment();

        render(<ThreadCard thread={{ ...baseThread, media }} />);

        const image = screen.getByRole('img', { name: media.filename });

        expect(image).toHaveAttribute('src', media.fullUrl);
        expect(image).toHaveClass('w-full');
        expect(image).not.toHaveClass('w-auto');
    });

    it('renders the excerpt when present and omits it otherwise', () => {
        const { rerender } = render(<ThreadCard thread={baseThread} />);

        expect(
            screen.getByText(baseThread.excerpt as string),
        ).toBeInTheDocument();

        rerender(<ThreadCard thread={{ ...baseThread, excerpt: undefined }} />);

        expect(
            screen.queryByText(baseThread.excerpt as string),
        ).not.toBeInTheDocument();
    });

    it('renders the reply and view counts through MachineValue with tabular figures', () => {
        render(<ThreadCard thread={baseThread} />);

        expect(screen.getByText('318')).toHaveClass('tabular-nums');
        expect(screen.getByText('48')).toHaveClass('tabular-nums');
    });

    it('gives the bookmark control an accessible name since it carries no visible text', () => {
        render(<ThreadCard thread={baseThread} />);

        expect(
            screen.getByRole('button', { name: /bookmark/i }),
        ).toBeInTheDocument();
    });

    it('lifts on hover and rests without a shadow', () => {
        render(<ThreadCard thread={baseThread} data-testid="thread-card" />);

        const card = screen.getByTestId('thread-card');

        expect(card.className).not.toMatch(/(^|\s)shadow-/);
        expect(card).toHaveClass('hover:shadow-lift');
    });

    /**
     * Thread routes do not exist yet, so any surface showing a card before
     * they do needs to point it somewhere real. Without this the homepage
     * hero and trending strip would link a first-time visitor into a 404.
     */
    it('lets a caller override where the title links', () => {
        render(<ThreadCard thread={baseThread} href="/popular" />);

        expect(
            screen.getByRole('link', { name: baseThread.title }),
        ).toHaveAttribute('href', '/popular');
    });

    it('falls back to the board and post number when no href is given', () => {
        render(<ThreadCard thread={baseThread} />);

        expect(
            screen.getByRole('link', { name: baseThread.title }),
        ).toHaveAttribute('href', `${baseThread.board}${baseThread.no}`);
    });

    /**
     * Share is stateless in a way the vote control was not: it holds no
     * per-viewer value the server has to send down, so there is nothing for a
     * caller to push back and nothing to render pressed.
     */
    it('shares the thread at its own address', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        /* `navigator.clipboard` is getter-only in jsdom, so it has to be
           redefined rather than assigned. */
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        Object.defineProperty(navigator, 'share', {
            value: undefined,
            configurable: true,
        });

        render(<ThreadCard thread={baseThread} />);

        await userEvent.click(screen.getByRole('button', { name: /share/i }));

        expect(writeText).toHaveBeenCalledWith(
            `${window.location.origin}/g/58210441`,
        );
    });
});
