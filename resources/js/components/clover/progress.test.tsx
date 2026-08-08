import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from '@/components/clover/progress';

describe('Progress', () => {
    it('exposes its value to assistive technology via role=progressbar', () => {
        render(<Progress value={42} label="Read progress" />);

        const bar = screen.getByRole('progressbar', { name: 'Read progress' });

        expect(bar).toHaveAttribute('aria-valuenow', '42');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
    });

    it('clamps a value above 100 rather than emitting a wider bar', () => {
        render(<Progress value={150} label="Read progress" />);

        const bar = screen.getByRole('progressbar', { name: 'Read progress' });

        expect(bar).toHaveAttribute('aria-valuenow', '100');
    });

    it('clamps a value below 0', () => {
        render(<Progress value={-20} label="Read progress" />);

        const bar = screen.getByRole('progressbar', { name: 'Read progress' });

        expect(bar).toHaveAttribute('aria-valuenow', '0');
    });

    it('colours the fill faint below 100 and primary only once finished', () => {
        const { rerender } = render(
            <Progress value={60} label="Read progress" />,
        );

        let fill = document.querySelector('[data-slot="progress-fill"]');
        expect(fill).toHaveClass('bg-faint');
        expect(fill?.className).not.toMatch(/bg-primary\b/);

        rerender(<Progress value={100} label="Read progress" />);

        fill = document.querySelector('[data-slot="progress-fill"]');
        expect(fill).toHaveClass('bg-primary');
    });

    it('represents fill with a transform, never an animated width', () => {
        render(<Progress value={30} label="Read progress" />);

        const fill = document.querySelector(
            '[data-slot="progress-fill"]',
        ) as HTMLElement;

        expect(fill.style.transform).toBe('scaleX(0.3)');
        expect(fill.style.width).toBe('');
    });

    it('lets a caller render the numeric value visibly next to the bar', () => {
        render(
            <div>
                <Progress value={42} label="Read progress" />
                <span>42%</span>
            </div>,
        );

        expect(screen.getByText('42%')).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', { name: 'Read progress' }),
        ).toHaveAttribute('aria-valuenow', '42');
    });
});
