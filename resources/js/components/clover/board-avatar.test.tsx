import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BoardAvatar } from '@/components/clover/board-avatar';

function chip(container: HTMLElement): HTMLElement {
    const node = container.querySelector<HTMLElement>(
        '[data-slot="board-avatar"]',
    );

    if (!node) {
        throw new Error('board avatar did not render');
    }

    return node;
}

describe('BoardAvatar', () => {
    it('renders the board token with the slashes stripped', () => {
        render(<BoardAvatar slug="/g/" />);

        expect(screen.getByText('g')).toBeInTheDocument();
    });

    it('wears the identity swatch that belongs to the board', () => {
        const { container } = render(<BoardAvatar slug="/g/" />);

        expect(chip(container)).toHaveClass('bg-board-g', 'text-board-g-fg');
    });

    it('gives a different board a different identity swatch', () => {
        const { container } = render(<BoardAvatar slug="/wg/" />);

        expect(chip(container)).toHaveClass('bg-board-wg', 'text-board-wg-fg');
        expect(chip(container)).not.toHaveClass('bg-board-g');
    });

    it('normalises casing and stray whitespace before matching a swatch', () => {
        const { container } = render(<BoardAvatar slug="  /BIZ/ " />);

        expect(screen.getByText('biz')).toBeInTheDocument();
        expect(chip(container)).toHaveClass('bg-board-biz');
    });

    it('falls back to a neutral surface for a board with no swatch', () => {
        const { container } = render(<BoardAvatar slug="/pol/" />);
        const node = chip(container);

        expect(screen.getByText('pol')).toBeInTheDocument();
        expect(node).toHaveClass(
            'bg-surface-elevated',
            'text-muted-foreground',
        );
        expect(node.className).not.toMatch(/bg-board-/);
    });

    it('renders a glyph instead of an empty chip when the slug is blank', () => {
        const { container } = render(<BoardAvatar slug="//" />);
        const node = chip(container);

        expect(node).toHaveClass('bg-surface-elevated');
        expect(node.querySelector('svg')).toBeInTheDocument();
    });

    it('sets the slug in machine figures rather than a mono family', () => {
        const { container } = render(<BoardAvatar slug="/g/" />);
        const text = screen.getByText('g');

        expect(text).toHaveClass('tabular-nums');
        expect(chip(container).className).not.toMatch(/font-mono/);
    });

    it('is 34px square by default and honours an explicit size', () => {
        const { container: base } = render(<BoardAvatar slug="/g/" />);

        expect(chip(base)).toHaveStyle({ width: '34px', height: '34px' });

        const { container: large } = render(
            <BoardAvatar slug="/g/" size={56} />,
        );

        expect(chip(large)).toHaveStyle({ width: '56px', height: '56px' });
    });

    it('exposes the board to assistive tech by default', () => {
        render(<BoardAvatar slug="/g/" />);

        expect(
            screen.getByRole('img', { name: 'g board' }),
        ).toBeInTheDocument();
    });

    it('hides itself from assistive tech when marked decorative', () => {
        const { container } = render(<BoardAvatar slug="/g/" decorative />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(chip(container)).toHaveAttribute('aria-hidden', 'true');
    });

    it('merges consumer classes without dropping its own', () => {
        const { container } = render(
            <BoardAvatar slug="/g/" className="shadow-lift" />,
        );

        expect(chip(container)).toHaveClass('shadow-lift', 'bg-board-g');
    });
});
