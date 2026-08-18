import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Trending } from '@/components/home/trending';
import { makeThread, makeTrendingTag } from '@/fixtures/factories';

/**
 * `Link` is replaced with a plain anchor: it keeps the DOM queryable by role
 * without pulling in the real router. Same pattern as `thread-card.test.tsx`.
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

const THREADS = [
    makeThread({ title: 'Anons are still arguing about init systems' }),
    makeThread({ title: 'Mainline kernel support or vendor tree' }),
    makeThread({ title: 'Battery life under sustained load' }),
    makeThread({ title: 'Cross compiling on an x86 box' }),
    makeThread({ title: 'A thread the strip was not given' }),
];

const TRENDING = [
    makeTrendingTag({ tag: '/g/', posts: '4,182 posts' }),
    makeTrendingTag({ tag: '/biz/', posts: '2,904 posts' }),
];

const expectedThreads = THREADS.slice(1, 4);

describe('Trending', () => {
    /**
     * The threads were a grid of `ThreadCard`s and are now a ticker, so they
     * are no longer links: a marquee renders its list twice to loop seamlessly,
     * and the whole thing is `aria-hidden` and `inert` because reading every
     * title twice is worse than not reading it at all. The band's own link is
     * the action in its header.
     */
    it('renders exactly the threads it was given, and no others', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        expectedThreads.forEach((thread) => {
            expect(screen.getAllByText(thread.title)).toHaveLength(2);
        });

        expect(screen.queryByText(THREADS[0].title)).not.toBeInTheDocument();
        expect(screen.queryByText(THREADS[4].title)).not.toBeInTheDocument();
    });

    it('runs the threads as a horizontal ticker', () => {
        const { container } = render(
            <Trending threads={expectedThreads} trending={TRENDING} />,
        );

        const track = container.querySelector<HTMLElement>(
            '[data-slot="thread-marquee-track"]',
        );

        expect(track?.className).toMatch(/animate-thread-marquee-x/);
        expect(
            container.querySelector('[data-slot="thread-marquee"]'),
        ).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Three cards carried a share button and a bookmark button each. In a band
     * whose real call to action is the button in its header, that was six
     * controls competing with one.
     */
    it('renders no thread cards or their controls', () => {
        const { container } = render(
            <Trending threads={expectedThreads} trending={TRENDING} />,
        );

        expect(container.querySelector('[data-slot="thread-card"]')).toBeNull();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('renders the "Open the feed" action linking to popular', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        expect(
            screen.getByRole('link', { name: 'Open the feed' }),
        ).toHaveAttribute('href', '/popular');
    });

    /**
     * Task 13. It was `<Button variant="outline">`, which made the loudest
     * control on the band the one that merely goes to the feed the ticker
     * beneath it is already showing.
     *
     * Task 7 established this codebase's affordance for "this section
     * continues elsewhere": a heading-row link with a trailing chevron, as in
     * `Posts ` on the search page. This is that.
     */
    it('draws that action as a heading-row link with a chevron, not a button', () => {
        const { container } = render(
            <Trending threads={expectedThreads} trending={TRENDING} />,
        );

        const action = screen.getByRole('link', { name: 'Open the feed' });

        expect(action.className).not.toMatch(/border/);
        expect(action.className).not.toMatch(/rounded-md/);
        expect(action.querySelector('svg')).not.toBeNull();
        expect(container.querySelector('[data-slot="button"]')).toBeNull();
    });

    /**
     * Task 13, and decision 1 of the responsive plan: Reddit's information
     * architecture, Clover's visual language — ruled hairlines, no cards, no
     * pill chips. These were the last pill chips in the application and they
     * were on the first screen anyone sees.
     *
     * They did not fit either. Each carries a slug and a formatted count, so at
     * ~340px the six of them stacked one per row and the band spent roughly
     * 250px listing six boards.
     *
     * The pattern is `communities/board-row.tsx` (task 9), which solved the
     * same problem: `divide-y` on the list, no border and no radius per item.
     */
    it('lists the boards as ruled rows rather than pill chips', () => {
        const { container } = render(
            <Trending threads={expectedThreads} trending={TRENDING} />,
        );

        const list = screen.getByRole('list', {
            name: 'Boards by post volume',
        });

        for (const item of Array.from(list.querySelectorAll('li'))) {
            expect(item.className).not.toMatch(/rounded-/);
            /* Grid rules only: no box of its own around any board. */
            expect(item.className).not.toMatch(/(^|\s)border(\s|$)/);
        }

        for (const link of Array.from(list.querySelectorAll('a'))) {
            expect(link.className).not.toMatch(/rounded-full/);
            expect(link.className).not.toMatch(/(^|\s)border(\s|$)/);
        }

        expect(container.innerHTML).not.toMatch(/rounded-full/);
    });

    /**
     * One row per board across the full page put `/vg/` at the left edge and
     * `317,268 posts` at the right with roughly 1,300px of empty rule between
     * them at 1420px, and six boards then ran the height of the band. A slug
     * and its count are a pair and should read as one line.
     *
     * The same grid and the same breakpoints as the features band, because two
     * bands on one page reaching opposite conclusions about the same problem is
     * worse than either answer.
     */
    it('sets the boards in two columns at `md` and three at `lg`', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        const list = screen.getByRole('list', {
            name: 'Boards by post volume',
        });

        expect(list.className).toMatch(/(^|\s)grid(\s|$)/);
        expect(list.className).toMatch(/(^|\s)md:grid-cols-2(\s|$)/);
        expect(list.className).toMatch(/(^|\s)lg:grid-cols-3(\s|$)/);
    });

    /**
     * The hairline answer, decided the same way as the features band and drawn
     * by the same two class sets: the container carries the top and left edges,
     * every cell carries its right and bottom, and each interior line is drawn
     * exactly once. `divide-y` is explicitly not it — it draws in DOM order and
     * would run a line through the middle of a row of three rather than between
     * rows.
     */
    it('rules the cells on both axes, without divide-y', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        const list = screen.getByRole('list', {
            name: 'Boards by post volume',
        });

        expect(list.className).not.toMatch(/divide-y/);
        expect(list.className).toMatch(/(^|\s)border-t(\s|$)/);
        expect(list.className).not.toMatch(/(^|\s)border-l(\s|$)/);
        expect(list.className).not.toMatch(/(^|\s)border-r(\s|$)/);
        expect(list.className).not.toMatch(/(^|\s)border-b(\s|$)/);

        /* Flush with `Section`'s `border-x`, which draws the two vertical
           edges. See the component for what draws which line. */
        expect(list.className).toMatch(/(^|\s)-ml-6(\s|$)/);
        expect(list.className).toMatch(/(^|\s)-mr-\[25px\](\s|$)/);

        for (const item of Array.from(list.querySelectorAll('li'))) {
            expect(item.className).toMatch(/(^|\s)border-r(\s|$)/);
            expect(item.className).toMatch(/(^|\s)border-b(\s|$)/);
            expect(item.className).not.toMatch(/(^|\s)border-l(\s|$)/);
            expect(item.className).not.toMatch(/(^|\s)border-t(\s|$)/);
        }
    });

    /**
     * A short last row would otherwise stop the bottom rule partway across the
     * page, and an odd count is the normal case here: the list is however many
     * boards the server sent.
     *
     * Two boards is even, so `md`'s two columns need nothing and `lg`'s three
     * need one filler — which is why the one cell rendered is `hidden lg:block`
     * rather than visible at `md`. Decorative and hidden from assistive
     * technology, since it carries a rule and nothing else.
     */
    it('closes a short last row with cells that only appear where a row is short', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        const fillers = Array.from(
            document.querySelectorAll<HTMLElement>(
                '[data-slot="trending-filler"]',
            ),
        );

        expect(fillers).toHaveLength(1);
        expect(fillers[0].className).toMatch(/(^|\s)hidden(\s|$)/);
        expect(fillers[0].className).toMatch(/(^|\s)lg:block(\s|$)/);
        expect(fillers[0].className).not.toMatch(/(^|\s)md:block(\s|$)/);
        expect(fillers[0]).toHaveAttribute('aria-hidden', 'true');
        expect(fillers[0].textContent).toBe('');
    });

    /**
     * Three boards divides evenly by three and not by two, which is the mirror
     * case: one filler, needed at `md` and not at `lg`.
     */
    it('needs no filler where the count already divides evenly', () => {
        render(
            <Trending
                threads={expectedThreads}
                trending={[
                    ...TRENDING,
                    makeTrendingTag({ tag: '/v/', posts: '1,000 posts' }),
                ]}
            />,
        );

        const fillers = Array.from(
            document.querySelectorAll<HTMLElement>(
                '[data-slot="trending-filler"]',
            ),
        );

        expect(fillers).toHaveLength(1);
        expect(fillers[0].className).toMatch(/(^|\s)md:block(\s|$)/);
        expect(fillers[0].className).toMatch(/(^|\s)lg:hidden(\s|$)/);
    });

    /** Six divides by one, two and three alike, so no row is ever short. */
    it('renders no fillers when every row is full at every width', () => {
        render(
            <Trending
                threads={expectedThreads}
                trending={Array.from({ length: 6 }, (_unused, index) =>
                    makeTrendingTag({
                        tag: `/b${index}/`,
                        posts: `${index} posts`,
                    }),
                )}
            />,
        );

        expect(
            document.querySelectorAll('[data-slot="trending-filler"]'),
        ).toHaveLength(0);
    });

    /** The rows are still links to their boards, still in the order given. */
    it('keeps every board a link, in the order it was given', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        const list = screen.getByRole('list', {
            name: 'Boards by post volume',
        });
        const links = Array.from(list.querySelectorAll('a'));

        expect(links.map((link) => link.getAttribute('href'))).toEqual([
            '/g',
            '/biz',
        ]);
        expect(links.map((link) => link.textContent)).toEqual([
            '/g/4,182 posts',
            '/biz/2,904 posts',
        ]);
    });

    it('renders under the "What is being bumped today" heading', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'What is being bumped today',
            }),
        ).toBeInTheDocument();
    });
});
