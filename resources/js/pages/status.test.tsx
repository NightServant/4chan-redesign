import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Status from '@/pages/status';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: { appUrl: 'https://clover.test' },
        url: '/status',
    }),
    Head: () => null,
}));

const FIGURES = {
    boards: 53,
    threads: 23018,
    posts: 111762,
    lastSyncedAt: '4 min ago',
    apiBaseUrl: 'https://a.4cdn.org',
    rateLimitSeconds: 1,
};

/**
 * This page exists to answer "what did the sync actually do", so it is the
 * last place that should overstate what is here.
 *
 * It introduced its three figures as "the rows it currently holds" while
 * counting only the boards the reader may see. Signed out that is 53 boards of
 * 77 and 23,018 threads of 32,409 -- and the reader most likely to open this
 * page is the one who just watched `clover:sync` report the larger number.
 * That is how it was found.
 */
describe('Status', () => {
    it('does not claim to hold rows it is not counting', () => {
        render(<Status {...FIGURES} complete={false} />);

        expect(screen.getByText(/rows you can see/i)).toBeInTheDocument();
        expect(
            screen.queryByText(/rows it currently holds/i),
        ).not.toBeInTheDocument();
    });

    it('says it holds them when the figures are the whole database', () => {
        render(<Status {...FIGURES} complete={true} />);

        expect(
            screen.getByText(/rows it currently holds/i),
        ).toBeInTheDocument();
        expect(screen.queryByText(/rows you can see/i)).not.toBeInTheDocument();
    });

    /** The figures themselves are unaffected by the wording either way. */
    it('reports the figures it was given', () => {
        render(<Status {...FIGURES} complete={false} />);

        expect(screen.getByText('23,018')).toBeInTheDocument();
        expect(screen.getByText('111,762')).toBeInTheDocument();
    });
});
