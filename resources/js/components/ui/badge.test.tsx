import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
    it('renders its children', () => {
        render(<Badge>Sticky</Badge>);

        expect(screen.getByText('Sticky')).toBeInTheDocument();
    });

    it('is a small pill by default', () => {
        render(<Badge>Sticky</Badge>);

        const badge = screen.getByText('Sticky');

        expect(badge).toHaveClass('rounded-full', 'text-caption');
    });

    it('defaults to the neutral tone', () => {
        render(<Badge>Archived</Badge>);

        expect(screen.getByText('Archived')).toHaveClass(
            'bg-surface-elevated',
            'text-muted-foreground',
        );
    });

    it.each([
        ['primary', ['bg-primary-soft', 'text-accent-text']],
        ['danger', ['bg-danger-soft', 'text-danger']],
        ['warning', ['bg-warning-soft', 'text-warning']],
        ['success', ['bg-primary-soft-strong', 'text-accent-text']],
    ] as const)('renders the %s tone as a soft tint', (tone, expected) => {
        render(<Badge tone={tone}>Status</Badge>);

        expect(screen.getByText('Status')).toHaveClass(...expected);
    });

    it('never fills a semantic tone with a saturated background', () => {
        render(
            <>
                <Badge tone="danger">Curse</Badge>
                <Badge tone="warning">Warned</Badge>
                <Badge tone="success">Blessed</Badge>
            </>,
        );

        expect(screen.getByText('Curse')).not.toHaveClass('bg-danger');
        expect(screen.getByText('Warned')).not.toHaveClass('bg-warning');
        expect(screen.getByText('Blessed')).not.toHaveClass('bg-success');
    });

    it('renders as the child element when asChild is set', () => {
        render(
            <Badge asChild tone="danger">
                <a href="/reports">2 reports</a>
            </Badge>,
        );

        const link = screen.getByRole('link', { name: '2 reports' });

        expect(link).toHaveClass('bg-danger-soft');
    });

    it('merges consumer classes over the defaults', () => {
        render(<Badge className="px-4">Label</Badge>);

        const badge = screen.getByText('Label');

        expect(badge).toHaveClass('px-4');
        expect(badge).not.toHaveClass('px-2');
    });

    it('keeps its type scale alongside a tone colour', () => {
        render(<Badge tone="danger">Locked</Badge>);

        expect(screen.getByText('Locked')).toHaveClass(
            'text-caption',
            'text-danger',
        );
    });
});
