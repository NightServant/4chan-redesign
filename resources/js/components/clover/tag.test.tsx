import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tag } from '@/components/clover/tag';

describe('Tag', () => {
    it('renders a static topic chip as a span', () => {
        render(<Tag>risc-v</Tag>);

        const tag = screen.getByText('risc-v');

        expect(tag.tagName).toBe('SPAN');
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('reads as a muted chip on the small radius', () => {
        render(<Tag>risc-v</Tag>);

        const tag = screen.getByText('risc-v');

        expect(tag).toHaveClass(
            'rounded-sm',
            'text-caption',
            'text-muted-foreground',
        );
        expect(tag).not.toHaveClass('rounded-full');
    });

    it('renders as a button with a hover state when a click handler is given', () => {
        render(<Tag onClick={() => {}}>risc-v</Tag>);

        const tag = screen.getByRole('button', { name: 'risc-v' });

        expect(tag).toHaveAttribute('type', 'button');
        expect(tag.className).toMatch(/hover:[\w:-]*bg-surface-hover/);
    });

    it('calls the click handler when the interactive tag is pressed', async () => {
        const onClick = vi.fn();

        render(<Tag onClick={onClick}>risc-v</Tag>);

        await userEvent.click(screen.getByRole('button', { name: 'risc-v' }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('marks the selected tag with aria-pressed and the primary tint', () => {
        render(
            <Tag onClick={() => {}} selected>
                risc-v
            </Tag>,
        );

        const tag = screen.getByRole('button', { name: 'risc-v' });

        expect(tag).toHaveAttribute('aria-pressed', 'true');
        expect(tag).toHaveClass('bg-primary-soft', 'text-accent-text');
    });

    it('does not claim pressed state when it is not interactive', () => {
        render(<Tag selected>risc-v</Tag>);

        expect(screen.getByText('risc-v')).not.toHaveAttribute('aria-pressed');
    });

    it('disables the interactive tag at 60% opacity', async () => {
        const onClick = vi.fn();

        render(
            <Tag onClick={onClick} disabled>
                risc-v
            </Tag>,
        );

        const tag = screen.getByRole('button', { name: 'risc-v' });

        expect(tag).toBeDisabled();
        expect(tag).toHaveClass(
            'disabled:opacity-60',
            'disabled:cursor-not-allowed',
        );

        await userEvent.click(tag);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('merges consumer classes over the defaults', () => {
        render(<Tag className="px-3">risc-v</Tag>);

        const tag = screen.getByText('risc-v');

        expect(tag).toHaveClass('px-3');
        expect(tag).not.toHaveClass('px-2');
    });
});
