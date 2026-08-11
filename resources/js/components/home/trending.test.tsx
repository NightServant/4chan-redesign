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
    it('renders exactly the expected three-thread slice of the fixture', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        expectedThreads.forEach((thread) => {
            expect(
                screen.getByRole('link', { name: thread.title }),
            ).toBeInTheDocument();
        });

        expect(screen.queryByText(THREADS[0].title)).not.toBeInTheDocument();
        expect(screen.queryByText(THREADS[4].title)).not.toBeInTheDocument();
    });

    it('points every thread card at its own thread', () => {
        render(<Trending threads={expectedThreads} trending={TRENDING} />);

        expectedThreads.forEach((thread) => {
            expect(
                screen.getByRole('link', { name: thread.title }),
            ).toHaveAttribute(
                'href',
                `/${thread.board.replaceAll('/', '')}/${thread.no}`,
            );
        });
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
