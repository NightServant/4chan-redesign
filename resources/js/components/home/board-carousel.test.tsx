import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardCarousel } from '@/components/home/board-carousel';
import { makeBoard } from '@/fixtures/factories';

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

const BOARDS = [
    makeBoard({ slug: '/v/', name: 'Video Games', threads: '379' }),
    makeBoard({ slug: '/int/', name: 'International', threads: '296' }),
    makeBoard({ slug: '/tv/', name: 'Television & Film', threads: '292' }),
    makeBoard({ slug: '/vg/', name: 'Video Game Generals', threads: '267' }),
    makeBoard({ slug: '/biz/', name: 'Business & Finance', threads: '252' }),
    makeBoard({ slug: '/mu/', name: 'Music', threads: '241' }),
];

/**
 * jsdom lays nothing out and implements no scrolling: every box is 0x0 and
 * `scrollTo` does not exist. The rail is given real geometry and a spy so the
 * paging arithmetic can be asserted, which is the part that has actually been
 * wrong.
 */
function measureRail({
    clientWidth = 1132,
    scrollWidth = 2164,
    scrollLeft = 0,
}: {
    clientWidth?: number;
    scrollWidth?: number;
    scrollLeft?: number;
} = {}) {
    const rail = document.querySelector<HTMLElement>(
        '[data-slot="board-rail"]',
    );

    if (rail === null) {
        throw new Error('no rail');
    }

    Object.defineProperty(rail, 'clientWidth', {
        value: clientWidth,
        configurable: true,
    });
    Object.defineProperty(rail, 'scrollWidth', {
        value: scrollWidth,
        configurable: true,
    });

    let current = scrollLeft;

    Object.defineProperty(rail, 'scrollLeft', {
        get: () => current,
        set: (value: number) => {
            current = value;
        },
        configurable: true,
    });

    const scrollTo = vi.fn();
    rail.scrollTo = scrollTo as unknown as HTMLElement['scrollTo'];

    /* The component reads its geometry on mount, when jsdom reports every box
       as zero wide, and concludes the rail is already at its end: the forward
       arrow mounts disabled. One scroll event re-runs that read against the
       measurements just installed above. */
    fireEvent.scroll(rail);

    return { rail, scrollTo };
}

beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
});

describe('BoardCarousel', () => {
    /**
     * The heading counted the cells on screen and read "8 boards, one
     * interface". Clover carries seventy-seven, so the only number a visitor
     * took from the homepage was wrong by an order of magnitude. It now
     * describes the ordering, which is what is actually true of these eight.
     */
    it('does not claim the sample is the whole directory', () => {
        render(<BoardCarousel boards={BOARDS} />);

        expect(
            screen.getByRole('heading', {
                name: 'The boards carrying the most threads',
            }),
        ).toBeInTheDocument();
        expect(screen.queryByText(/one interface/i)).not.toBeInTheDocument();
        expect(
            screen.queryByText(new RegExp(`${BOARDS.length} boards`, 'i')),
        ).not.toBeInTheDocument();
    });

    it('links every board cell at its own board, without the slug delimiters', () => {
        render(<BoardCarousel boards={BOARDS} />);

        expect(
            screen.getByRole('link', { name: 'Video Games, /v/' }),
        ).toHaveAttribute('href', '/v');
    });

    /**
     * The bug this exists for: `scrollBy` was asked for a whole page even when
     * less than a page remained, and a smooth scroll that overshoots the last
     * snap point is cancelled outright under mandatory snapping. The rail
     * returned to zero, so the arrow did nothing, and it did nothing only at
     * the end of the rail where it was least likely to be noticed.
     */
    it('never asks to scroll past the end of the rail', async () => {
        render(<BoardCarousel boards={BOARDS} />);

        const { scrollTo } = measureRail({ scrollLeft: 0 });

        await userEvent.click(
            screen.getByRole('button', { name: 'More boards' }),
        );

        const furthest = 2164 - 1132;

        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(scrollTo.mock.calls[0][0].left).toBe(furthest);
        expect(scrollTo.mock.calls[0][0].left).toBeLessThanOrEqual(furthest);
    });

    it('never asks to scroll before the start of the rail', async () => {
        render(<BoardCarousel boards={BOARDS} />);

        const { scrollTo } = measureRail({ scrollLeft: 200 });

        await userEvent.click(
            screen.getByRole('button', { name: 'Previous boards' }),
        );

        expect(scrollTo.mock.calls[0][0].left).toBe(0);
    });

    /** Whole cells, so the rail never rests showing a sliced one. */
    it('pages by whole cells when there is room for a full page', async () => {
        render(<BoardCarousel boards={BOARDS} />);

        const { scrollTo } = measureRail({ scrollWidth: 8000, scrollLeft: 0 });

        await userEvent.click(
            screen.getByRole('button', { name: 'More boards' }),
        );

        /* 1132 / 272 is four whole cells. */
        expect(scrollTo.mock.calls[0][0].left).toBe(4 * 272);
        expect(scrollTo.mock.calls[0][0].left % 272).toBe(0);
    });

    it('scrolls without animation when the reader asked for less motion', async () => {
        window.matchMedia = vi.fn().mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }) as unknown as typeof window.matchMedia;

        render(<BoardCarousel boards={BOARDS} />);

        const { scrollTo } = measureRail();

        await userEvent.click(
            screen.getByRole('button', { name: 'More boards' }),
        );

        expect(scrollTo.mock.calls[0][0].behavior).toBe('auto');
    });

    it('disables the back arrow until the rail has moved', () => {
        render(<BoardCarousel boards={BOARDS} />);

        expect(
            screen.getByRole('button', { name: 'Previous boards' }),
        ).toBeDisabled();
    });

    it('offers no arrows and says so plainly when there are no boards', () => {
        render(<BoardCarousel boards={[]} />);

        expect(
            screen.getByText('Boards appear here once they have been synced.'),
        ).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    /**
     * The arrows are a convenience over a native scroll container. Every cell
     * is a link, so the rail is reachable by keyboard whether or not any of
     * this component's code runs.
     */
    it('keeps every cell reachable as a link', () => {
        render(<BoardCarousel boards={BOARDS} />);

        expect(screen.getAllByRole('link')).toHaveLength(BOARDS.length);
    });
});
