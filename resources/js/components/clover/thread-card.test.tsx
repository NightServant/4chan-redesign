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
    no: 58210441,
    board: '/g/',
    boardName: 'Technology',
    time: '4 min ago',
    title: 'RISC-V laptops are finally usable as daily drivers',
    excerpt: 'Compiling LLVM takes 40 minutes but everything else is fine.',
    blessings: 2412,
    replies: 318,
    images: '48',
    media: null,
    pinned: false,
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

    it('exposes the vote buttons with aria-pressed and the blessing vocabulary', () => {
        render(<ThreadCard thread={baseThread} />);

        const bless = screen.getByRole('button', { name: 'Bless this post' });
        const curse = screen.getByRole('button', { name: 'Curse this post' });

        expect(bless).toHaveAttribute('aria-pressed', 'false');
        expect(curse).toHaveAttribute('aria-pressed', 'false');
        expect(
            screen.queryByRole('button', { name: /upvote/i }),
        ).not.toBeInTheDocument();
    });

    it('keeps the vote buttons out of the title link so nesting stays valid', () => {
        render(<ThreadCard thread={baseThread} />);

        const link = screen.getByRole('link', { name: baseThread.title });
        const bless = screen.getByRole('button', { name: 'Bless this post' });

        expect(link.contains(bless)).toBe(false);
    });

    it('calls onBless when the bless button is pressed and never dispatches a click at the title link', async () => {
        const onBless = vi.fn();
        const linkClick = vi.fn();

        render(<ThreadCard thread={baseThread} onBless={onBless} />);

        const link = screen.getByRole('link', { name: baseThread.title });
        link.addEventListener('click', linkClick);

        await userEvent.click(
            screen.getByRole('button', { name: 'Bless this post' }),
        );

        expect(onBless).toHaveBeenCalledTimes(1);
        expect(linkClick).not.toHaveBeenCalled();
    });

    it('calls onCurse when the curse button is pressed and never dispatches a click at the title link', async () => {
        const onCurse = vi.fn();
        const linkClick = vi.fn();

        render(<ThreadCard thread={baseThread} onCurse={onCurse} />);

        const link = screen.getByRole('link', { name: baseThread.title });
        link.addEventListener('click', linkClick);

        await userEvent.click(
            screen.getByRole('button', { name: 'Curse this post' }),
        );

        expect(onCurse).toHaveBeenCalledTimes(1);
        expect(linkClick).not.toHaveBeenCalled();
    });

    it('keeps the vote buttons independently focusable in an order that matches the visual layout', async () => {
        const user = userEvent.setup();

        render(<ThreadCard thread={baseThread} />);

        await user.tab();
        expect(
            screen.getByRole('link', { name: baseThread.title }),
        ).toHaveFocus();

        await user.tab();
        expect(
            screen.getByRole('button', { name: 'Bless this post' }),
        ).toHaveFocus();

        await user.tab();
        expect(
            screen.getByRole('button', { name: 'Curse this post' }),
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
     * only what 4chan reported. What changed is that the report includes an id
     * the file can be fetched by.
     *
     * The card loads the thumbnail and never the original: a feed of thirty
     * cards pulling four-megabyte images is the difference between a page that
     * loads and one that does not.
     */
    it('loads the thumbnail and never the full image', () => {
        const media = makeAttachment();

        render(<ThreadCard thread={{ ...baseThread, media }} />);

        const image = screen.getByRole('img', { name: media.filename });

        expect(image).toHaveAttribute('src', media.thumbnailUrl);
        expect(image).not.toHaveAttribute('src', media.fullUrl);
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
     * The card owns no vote state, so a caller holding it optimistically has
     * to be able to push it back down. Without this the bless button reports
     * `aria-pressed="false"` forever and the only signal that a bless landed
     * is the count, which is exactly the colour-and-number-only state the
     * accessibility rules forbid.
     */
    it('reflects a caller-held bless back onto the vote control', () => {
        render(<ThreadCard thread={baseThread} voteState="blessed" />);

        expect(screen.getByRole('button', { name: /bless/i })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: /curse/i })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    it('reflects a caller-held curse back onto the vote control', () => {
        render(<ThreadCard thread={baseThread} voteState="cursed" />);

        expect(screen.getByRole('button', { name: /curse/i })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    it('reports neither vote as pressed by default', () => {
        render(<ThreadCard thread={baseThread} />);

        expect(screen.getByRole('button', { name: /bless/i })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });
});
