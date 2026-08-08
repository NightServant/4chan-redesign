import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThreadSkeleton } from '@/components/clover/thread-skeleton';

function blocks() {
    return Array.from(
        document.querySelectorAll('[data-slot="skeleton"]'),
    ) as HTMLElement[];
}

describe('ThreadSkeleton', () => {
    it('is hidden from assistive technology as a decorative placeholder', () => {
        const { container } = render(<ThreadSkeleton />);

        expect(container.firstElementChild).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });

    it('renders exactly seven skeleton blocks', () => {
        render(<ThreadSkeleton />);

        expect(blocks()).toHaveLength(7);
    });

    it('renders a 24px avatar block beside a 140x11 line', () => {
        render(<ThreadSkeleton />);
        const [avatar, byline] = blocks();

        expect(avatar).toHaveClass('size-6');
        expect(byline).toHaveClass('w-[140px]', 'h-[11px]');
    });

    it('renders the three body lines at 82%, 96% and 64% width', () => {
        render(<ThreadSkeleton />);
        const [, , line1, line2, line3] = blocks();

        expect(line1).toHaveClass('w-[82%]', 'h-[18px]');
        expect(line2).toHaveClass('w-[96%]', 'h-3');
        expect(line3).toHaveClass('w-[64%]', 'h-3');
    });

    it('renders two pill blocks at 92x30 and 68x30', () => {
        render(<ThreadSkeleton />);
        const [, , , , , pillA, pillB] = blocks();

        expect(pillA).toHaveClass('w-[92px]', 'h-[30px]');
        expect(pillB).toHaveClass('w-[68px]', 'h-[30px]');
    });
});
