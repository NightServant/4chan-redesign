import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Trending } from '@/components/home/trending';
import { THREADS } from '@/fixtures/clover';

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

const expectedThreads = THREADS.slice(1, 4);

describe('Trending', () => {
    it('renders exactly the expected three-thread slice of the fixture', () => {
        render(<Trending />);

        expectedThreads.forEach((thread) => {
            expect(
                screen.getByRole('link', { name: thread.title }),
            ).toBeInTheDocument();
        });

        expect(screen.queryByText(THREADS[0].title)).not.toBeInTheDocument();
        expect(screen.queryByText(THREADS[4].title)).not.toBeInTheDocument();
    });

    it('points every thread card at popular, since thread routes do not exist yet', () => {
        render(<Trending />);

        expectedThreads.forEach((thread) => {
            expect(
                screen.getByRole('link', { name: thread.title }),
            ).toHaveAttribute('href', '/popular');
        });
    });

    it('renders the "Open the feed" action linking to popular', () => {
        render(<Trending />);

        expect(
            screen.getByRole('link', { name: 'Open the feed' }),
        ).toHaveAttribute('href', '/popular');
    });

    it('renders under the "What is being bumped today" heading', () => {
        render(<Trending />);

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'What is being bumped today',
            }),
        ).toBeInTheDocument();
    });
});
