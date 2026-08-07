import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnonAvatar } from '@/components/clover/anon-avatar';

function mark(container: HTMLElement): HTMLElement {
    const node = container.querySelector<HTMLElement>(
        '[data-slot="anon-avatar"]',
    );

    if (!node) {
        throw new Error('anon avatar did not render');
    }

    return node;
}

function markupFor(seed: string): string {
    const view = render(<AnonAvatar seed={seed} />);
    const html = mark(view.container).innerHTML;

    view.unmount();

    return html;
}

describe('AnonAvatar', () => {
    it('renders the same mark every time for the same seed', () => {
        expect(markupFor('you')).toBe(markupFor('you'));
    });

    it('renders a different mark for a different seed', () => {
        expect(markupFor('you')).not.toBe(markupFor('1837422'));
    });

    it('spreads distinct marks across a range of seeds', () => {
        const seeds = ['1', '2', '3', '4', '5', '6', '7', '8'];
        const marks = new Set(seeds.map(markupFor));

        expect(marks.size).toBeGreaterThanOrEqual(7);
    });

    it('never renders a blank mark', () => {
        const seeds = ['', 'you', 'anon', '0', '1837422', 'janitor'];

        for (const seed of seeds) {
            const view = render(<AnonAvatar seed={seed} />);

            expect(
                mark(view.container).querySelectorAll('rect').length,
            ).toBeGreaterThan(0);

            view.unmount();
        }
    });

    it('is decorative to assistive tech by default', () => {
        const { container } = render(<AnonAvatar seed="you" />);

        expect(mark(container)).toHaveAttribute('aria-hidden', 'true');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('takes an accessible label when it is the only identity shown', () => {
        render(<AnonAvatar seed="you" label="You" />);

        expect(screen.getByRole('img', { name: 'You' })).toBeInTheDocument();
    });

    it('is 32px square by default and honours an explicit size', () => {
        const { container: base } = render(<AnonAvatar seed="you" />);

        expect(mark(base)).toHaveStyle({ width: '32px', height: '32px' });

        const { container: large } = render(
            <AnonAvatar seed="you" size={48} />,
        );

        expect(mark(large)).toHaveStyle({ width: '48px', height: '48px' });
    });

    it('stays flat for a regular anon', () => {
        const { container } = render(<AnonAvatar seed="you" />);

        expect(mark(container)).toHaveClass('bg-surface-elevated');
        expect(mark(container).className).not.toMatch(/bg-linear-to/);
    });

    it('spends the one permitted gradient on the OP', () => {
        const { container } = render(<AnonAvatar seed="you" variant="op" />);
        const node = mark(container);

        expect(node).toHaveClass('bg-linear-to-br', 'from-primary');
        expect(node).not.toHaveClass('bg-surface-elevated');
    });

    it('keeps the mark stable regardless of variant', () => {
        const anon = render(<AnonAvatar seed="you" />);
        const anonCells = anon.container.querySelectorAll('rect').length;

        anon.unmount();

        const op = render(<AnonAvatar seed="you" variant="op" />);

        expect(op.container.querySelectorAll('rect').length).toBe(anonCells);
    });

    it('merges consumer classes without dropping its own', () => {
        const { container } = render(
            <AnonAvatar seed="you" className="shadow-lift" />,
        );

        expect(mark(container)).toHaveClass(
            'shadow-lift',
            'bg-surface-elevated',
        );
    });
});
