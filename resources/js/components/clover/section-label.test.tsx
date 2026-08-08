import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionLabel } from '@/components/clover/section-label';

describe('SectionLabel', () => {
    it('renders its text', () => {
        render(<SectionLabel>Boards you use</SectionLabel>);

        expect(screen.getByText('Boards you use')).toBeInTheDocument();
    });

    /**
     * The one place Clover departs from sentence case: 11px tracked uppercase.
     * Uppercasing in CSS rather than in the string keeps the accessible name
     * readable, since screen readers may spell out capitalised words.
     */
    it('uppercases through CSS, not by shouting in the markup', () => {
        render(<SectionLabel>Trending</SectionLabel>);

        const label = screen.getByText('Trending');

        expect(label).toHaveClass('uppercase');
        expect(label.textContent).toBe('Trending');
    });

    it('applies the tracked label type scale', () => {
        render(<SectionLabel>Activity</SectionLabel>);

        expect(screen.getByText('Activity')).toHaveClass('text-label');
    });

    it('renders an action alongside the label when given one', () => {
        render(
            <SectionLabel action={<button type="button">See all</button>}>
                Notifications
            </SectionLabel>,
        );

        expect(
            screen.getByRole('button', { name: 'See all' }),
        ).toBeInTheDocument();
    });
});
