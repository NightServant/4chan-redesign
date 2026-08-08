import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BoardGrid } from '@/components/home/board-grid';
import { BOARDS } from '@/fixtures/clover';

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

describe('BoardGrid', () => {
    it('renders one cell for every board in the fixture', () => {
        render(<BoardGrid />);

        expect(screen.getAllByRole('link')).toHaveLength(BOARDS.length);
    });

    it('names each cell so it identifies the board, not just the chevron', () => {
        render(<BoardGrid />);

        BOARDS.forEach((board) => {
            expect(
                screen.getByRole('link', {
                    name: `${board.name}, ${board.slug}`,
                }),
            ).toBeInTheDocument();
        });
    });

    it('points every board cell at popular, since board routes do not exist yet', () => {
        render(<BoardGrid />);

        screen.getAllByRole('link').forEach((link) => {
            expect(link).toHaveAttribute('href', '/popular');
        });
    });

    it('shows the slug and online count once, without doubling the word "online"', () => {
        render(<BoardGrid />);

        const board = BOARDS[0];
        const text = screen.getByText(`${board.slug} · ${board.online} online`);

        expect(text.textContent).not.toMatch(/online.*online/);
    });

    it('lays each cell out as a row, not a stack, overriding the Card default', () => {
        const { container } = render(<BoardGrid />);

        const card = container.querySelector('[data-slot="card"]');

        expect(card).toHaveClass('flex-row');
        expect(card?.className).not.toMatch(/(^|\s)flex-col(\s|$)/);
    });

    it('renders under the "74 boards, one interface" heading', () => {
        render(<BoardGrid />);

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: '74 boards, one interface',
            }),
        ).toBeInTheDocument();
    });
});
