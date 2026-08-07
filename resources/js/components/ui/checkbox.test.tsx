import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '@/components/ui/checkbox';

describe('Checkbox', () => {
    it('renders an unchecked checkbox with an accessible name', () => {
        render(<Checkbox aria-label="Remember me" />);

        const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });

        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
    });

    it('toggles on click and reports the new state', async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <Checkbox
                aria-label="Remember me"
                onCheckedChange={onCheckedChange}
            />,
        );

        const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });
        await user.click(checkbox);

        expect(onCheckedChange).toHaveBeenCalledWith(true);
        expect(checkbox).toBeChecked();
    });

    it('is a 20px box with an 8px radius and a strong hairline when unchecked', () => {
        render(<Checkbox aria-label="Remember me" />);

        const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });

        expect(checkbox).toHaveClass(
            'size-5',
            'rounded-sm',
            'border-[1.5px]',
            'border-border-strong',
        );
    });

    it('fills with the primary token and shows a check mark when checked', () => {
        render(<Checkbox aria-label="Remember me" defaultChecked />);

        const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });

        expect(checkbox).toBeChecked();
        expect(checkbox).toHaveClass(
            'data-[state=checked]:bg-primary',
            'data-[state=checked]:border-primary',
        );

        const indicator = checkbox.querySelector(
            '[data-slot="checkbox-indicator"]',
        );

        expect(indicator).not.toBeNull();
        expect(indicator).toHaveClass('text-primary-foreground');
        expect(indicator?.querySelector('svg')).not.toBeNull();
    });

    it('keeps a visible focus ring and never removes the outline', () => {
        render(<Checkbox aria-label="Remember me" />);

        const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });

        expect(checkbox).toHaveClass(
            'focus-visible:outline-2',
            'focus-visible:outline-offset-2',
            'focus-visible:outline-ring',
        );
        expect(checkbox.className).not.toContain('outline-none');
        expect(checkbox.className).not.toContain('outline-hidden');
    });

    it('renders disabled at 60% opacity and does not toggle', async () => {
        const user = userEvent.setup();
        const onCheckedChange = vi.fn();
        render(
            <Checkbox
                aria-label="Remember me"
                disabled
                onCheckedChange={onCheckedChange}
            />,
        );

        const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });
        await user.click(checkbox);

        expect(checkbox).toBeDisabled();
        expect(onCheckedChange).not.toHaveBeenCalled();
        expect(checkbox).toHaveClass(
            'disabled:opacity-60',
            'disabled:cursor-not-allowed',
        );
    });

    it('marks the invalid state with the danger token', () => {
        render(<Checkbox aria-label="Remember me" aria-invalid />);

        const checkbox = screen.getByRole('checkbox', { name: 'Remember me' });

        expect(checkbox).toHaveClass('aria-invalid:border-danger');
    });
});
