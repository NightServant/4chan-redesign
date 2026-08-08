import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MediaPlaceholder } from '@/components/clover/media-placeholder';

describe('MediaPlaceholder', () => {
    it('shows the filename, dimensions and size as given, unformatted', () => {
        render(<MediaPlaceholder label="ridge-4k.png · 3840×2160 · 4.1 MB" />);

        expect(
            screen.getByText('ridge-4k.png · 3840×2160 · 4.1 MB'),
        ).toBeInTheDocument();
    });

    it('exposes itself to assistive tech as an attachment, not a description of the surface', () => {
        render(
            <MediaPlaceholder label="progress-2y.jpg · 1440×1800 · 812 KB" />,
        );

        expect(
            screen.getByRole('img', {
                name: 'Attachment: progress-2y.jpg · 1440×1800 · 812 KB',
            }),
        ).toBeInTheDocument();
    });

    it('never renders a real image element, because media is never invented', () => {
        const { container } = render(
            <MediaPlaceholder label="ridge-4k.png · 3840×2160 · 4.1 MB" />,
        );

        expect(container.querySelector('img')).not.toBeInTheDocument();
    });

    it('hides its leading icon from assistive tech since the label already carries the meaning', () => {
        const { container } = render(
            <MediaPlaceholder label="ridge-4k.png · 3840×2160 · 4.1 MB" />,
        );

        const icon = container.querySelector('svg');

        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('defaults to a sensible height and lets a caller override it', () => {
        const { rerender } = render(
            <MediaPlaceholder
                label="ridge-4k.png · 3840×2160 · 4.1 MB"
                data-testid="media"
            />,
        );

        const defaultBox = screen.getByTestId('media');
        expect(defaultBox.style.height).not.toBe('');

        rerender(
            <MediaPlaceholder
                label="ridge-4k.png · 3840×2160 · 4.1 MB"
                height={400}
                data-testid="media"
            />,
        );

        expect(screen.getByTestId('media').style.height).toBe('400px');
    });

    it('is a flat bordered surface, not a repeating pattern or texture', () => {
        render(
            <MediaPlaceholder
                label="ridge-4k.png · 3840×2160 · 4.1 MB"
                data-testid="media"
            />,
        );

        const box = screen.getByTestId('media');

        expect(box).toHaveClass('border', 'border-border');
        expect(box.querySelectorAll('svg').length).toBeLessThanOrEqual(1);
        expect(box.querySelector('pattern')).not.toBeInTheDocument();
    });

    it('merges a caller className over its defaults', () => {
        render(
            <MediaPlaceholder
                label="ridge-4k.png · 3840×2160 · 4.1 MB"
                className="rounded-none"
                data-testid="media"
            />,
        );

        expect(screen.getByTestId('media')).toHaveClass('rounded-none');
    });
});
