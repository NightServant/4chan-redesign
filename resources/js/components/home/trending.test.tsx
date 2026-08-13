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
