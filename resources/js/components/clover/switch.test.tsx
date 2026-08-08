import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '@/components/clover/switch';

describe('Switch', () => {
    it('exposes role="switch" with aria-checked false when unchecked', () => {
        render(<Switch checked={false} aria-label="Auto-refresh" />);

        const toggle = screen.getByRole('switch', { name: 'Auto-refresh' });

        expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('exposes aria-checked true when checked', () => {
        render(<Switch checked aria-label="Auto-refresh" />);

        const toggle = screen.getByRole('switch', { name: 'Auto-refresh' });

        expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles by keyboard and reports the next value', async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <Switch
                checked={false}
                onCheckedChange={onCheckedChange}
                aria-label="Auto-refresh"
            />,
        );

        await user.tab();
        expect(
            screen.getByRole('switch', { name: 'Auto-refresh' }),
        ).toHaveFocus();

        await user.keyboard(' ');

        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('associates a supplied label with the control rather than leaving it adjacent', () => {
        render(<Switch checked={false} label="Auto-refresh" />);

        expect(
            screen.getByRole('switch', { name: 'Auto-refresh' }),
        ).toBeInTheDocument();
    });

    it('moves the thumb with a transform, never justify-content or another layout property', () => {
        const { rerender } = render(
            <Switch checked={false} label="Auto-refresh" />,
        );

        let thumb = document.querySelector('[data-slot="switch-thumb"]');
        expect(thumb).not.toBeNull();
        expect(thumb?.className).toContain('translate-x-0.5');
        expect(thumb?.className).not.toMatch(/justify-content|justify-/);

        rerender(<Switch checked label="Auto-refresh" />);

        thumb = document.querySelector('[data-slot="switch-thumb"]');
        expect(thumb?.className).toContain('translate-x-[20px]');
    });

    it('does not toggle and reports disabled state when disabled', async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <Switch
                checked={false}
                disabled
                onCheckedChange={onCheckedChange}
                label="Auto-refresh"
            />,
        );

        const toggle = screen.getByRole('switch', { name: 'Auto-refresh' });
        await user.click(toggle);

        expect(toggle).toBeDisabled();
        expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it('keeps a visible focus ring, never removing the outline', () => {
        render(<Switch checked={false} label="Auto-refresh" />);

        const track = document.querySelector('[data-slot="switch-track"]');

        expect(track?.className).toMatch(/peer-focus-visible:outline/);
        expect(track?.className).not.toContain('outline-none');
        expect(track?.className).not.toContain('outline-hidden');
    });
});
