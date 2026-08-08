import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
    it('is hidden from assistive technology so it is never announced as content', () => {
        const { container } = render(<Skeleton />);

        expect(container.firstElementChild).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });

    it('uses a neutral surface fill, never the primary accent as a large tint', () => {
        const { container } = render(<Skeleton />);
        const el = container.firstElementChild;

        expect(el?.className).not.toMatch(/bg-primary/);
        expect(el).toHaveClass('bg-surface-hover');
    });

    it('loops a 1.4s animation as the documented shimmer exception', () => {
        const { container } = render(<Skeleton />);
        const el = container.firstElementChild;

        expect(el?.className).toMatch(/1\.4s/);
        expect(el?.className).toMatch(/infinite/);
    });

    it('keeps the data-slot and merges an incoming className', () => {
        render(<Skeleton className="h-4 w-24" data-testid="line" />);

        const el = document.querySelector('[data-testid="line"]');

        expect(el).toHaveAttribute('data-slot', 'skeleton');
        expect(el).toHaveClass('h-4', 'w-24');
    });
});
