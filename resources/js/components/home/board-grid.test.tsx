import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardGrid } from '@/components/home/board-grid';
import { makeBoard } from '@/fixtures/factories';

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

/* Built here rather than imported, so these tests state the board list they
   assert on instead of tracking whatever the design fixture happened to hold. */
const BOARDS = [
    makeBoard({ slug: '/g/', name: 'Technology', threads: '18,402' }),
    makeBoard({ slug: '/biz/', name: 'Business', threads: '11,067' }),
    makeBoard({ slug: '/x/', name: 'Paranormal', threads: '6,204' }),
];

describe('BoardGrid', () => {
    it('renders one cell for every board in the fixture', () => {
        render(<BoardGrid boards={BOARDS} />);

        expect(screen.getAllByRole('link')).toHaveLength(BOARDS.length);
    });

    it('names each cell so it identifies the board, not just the chevron', () => {
        render(<BoardGrid boards={BOARDS} />);

        BOARDS.forEach((board) => {
            expect(
                screen.getByRole('link', {
                    name: `${board.name}, ${board.slug}`,
                }),
            ).toBeInTheDocument();
        });
    });

    it('points every board cell at its own board', () => {
        render(<BoardGrid boards={BOARDS} />);

        screen.getAllByRole('link').forEach((link, index) => {
            expect(link).toHaveAttribute(
                'href',
                `/${BOARDS[index].slug.replaceAll('/', '')}`,
            );
        });
    });

    /* Was an "anons online" figure. The API publishes no online count at any
       scope, so the cell reports the thread count it can actually be told. */
    it('shows the slug and thread count once, without doubling the word "threads"', () => {
        render(<BoardGrid boards={BOARDS} />);

        const board = BOARDS[0];
        const text = screen.getByText(`${board.slug} · ${board.threads} threads`);

        expect(text.textContent).not.toMatch(/threads.*threads/);
    });

    it('lays each cell out as a row, not a stack, overriding the Card default', () => {
        const { container } = render(<BoardGrid boards={BOARDS} />);

        const card = container.querySelector('[data-slot="card"]');

        expect(card).toHaveClass('flex-row');
        expect(card?.className).not.toMatch(/(^|\s)flex-col(\s|$)/);
    });

    it('counts the cells it was given in the heading', () => {
        render(<BoardGrid boards={BOARDS} />);

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: `${BOARDS.length} boards, one interface`,
            }),
        ).toBeInTheDocument();
    });
});
