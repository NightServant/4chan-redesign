import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ToastTone } from '@/components/clover/toast';
import { Toast } from '@/components/clover/toast';

describe('Toast', () => {
    it('renders the title and message', () => {
        render(
            <Toast
                tone="success"
                title="Thread posted"
                message=">>58210441 is live in /g/."
            />,
        );

        expect(screen.getByText('Thread posted')).toBeInTheDocument();
        expect(
            screen.getByText('>>58210441 is live in /g/.'),
        ).toBeInTheDocument();
    });

    it('renders without a message when none is given', () => {
        render(<Toast tone="info" title="Draft saved" />);

        expect(screen.getByText('Draft saved')).toBeInTheDocument();
    });

    it.each([
        ['success', 'text-success'],
        ['danger', 'text-danger'],
        ['warning', 'text-warning'],
        ['info', 'text-accent-text'],
    ] as [ToastTone, string][])(
        'pairs the %s tone with its own icon colour',
        (tone, expectedClass) => {
            const { container } = render(<Toast tone={tone} title="Status" />);

            const icon = container.querySelector('svg');

            expect(icon).not.toBeNull();
            expect(icon).toHaveClass(expectedClass);
        },
    );

    it('renders a different icon shape for each tone, so colour never carries the meaning alone', () => {
        const shapes: string[] = [];

        (['success', 'danger', 'warning', 'info'] as const).forEach((tone) => {
            const { container, unmount } = render(
                <Toast tone={tone} title="Status" />,
            );
            const icon = container.querySelector('svg');
            shapes.push(icon?.innerHTML ?? '');
            unmount();
        });

        expect(new Set(shapes).size).toBe(shapes.length);
    });

    it('renders a dismiss button with an accessible name', () => {
        render(<Toast tone="success" title="Thread posted" />);

        expect(
            screen.getByRole('button', { name: 'Dismiss' }),
        ).toBeInTheDocument();
    });

    it('calls onDismiss when the dismiss button is pressed', async () => {
        const user = userEvent.setup();
        const onDismiss = vi.fn();
        render(
            <Toast
                tone="success"
                title="Thread posted"
                onDismiss={onDismiss}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Dismiss' }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('sits on the elevated surface with a hairline border, 14px radius and overlay shadow', () => {
        render(<Toast tone="danger" title="Upload failed" />);

        const row = screen
            .getByText('Upload failed')
            .closest('[data-slot="toast"]');

        expect(row).toHaveClass(
            'bg-surface-elevated',
            'border-border',
            'rounded-xl',
            'shadow-overlay',
        );
    });

    it('marks the danger tone as an assertive live region and other tones as polite', () => {
        const { rerender } = render(
            <Toast tone="danger" title="Upload failed" />,
        );

        expect(
            screen.getByText('Upload failed').closest('[data-slot="toast"]'),
        ).toHaveAttribute('aria-live', 'assertive');

        rerender(<Toast tone="success" title="Thread posted" />);

        expect(
            screen.getByText('Thread posted').closest('[data-slot="toast"]'),
        ).toHaveAttribute('aria-live', 'polite');
    });

    it('sets the title and message typography', () => {
        render(
            <Toast
                tone="success"
                title="Thread posted"
                message=">>58210441 is live in /g/."
            />,
        );

        expect(screen.getByText('Thread posted')).toHaveClass(
            'text-body-sm',
            'font-medium',
        );
        expect(screen.getByText('>>58210441 is live in /g/.')).toHaveClass(
            'text-caption',
            'text-muted-foreground',
        );
    });
});
