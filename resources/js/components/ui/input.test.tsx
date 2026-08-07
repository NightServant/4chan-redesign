import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '@/components/ui/input';

describe('Input', () => {
    it('renders a textbox that accepts typed value', async () => {
        const user = userEvent.setup();
        render(<Input aria-label="Subject" />);

        const input = screen.getByRole('textbox', { name: 'Subject' });
        await user.type(input, 'anon');

        expect(input).toHaveValue('anon');
    });

    it('uses the Clover control metrics: 38px tall, 10px radius, surface fill', () => {
        render(<Input aria-label="Subject" />);

        const input = screen.getByRole('textbox', { name: 'Subject' });

        expect(input).toHaveClass(
            'h-9.5',
            'rounded-md',
            'bg-surface',
            'border',
            'border-border',
        );
    });

    it('keeps a visible focus ring and never removes the outline', () => {
        render(<Input aria-label="Subject" />);

        const input = screen.getByRole('textbox', { name: 'Subject' });

        expect(input).toHaveClass(
            'focus-visible:outline-2',
            'focus-visible:outline-offset-2',
            'focus-visible:outline-ring',
        );
        expect(input.className).not.toContain('outline-none');
        expect(input.className).not.toContain('outline-hidden');
    });

    it('marks the invalid state with the danger token', () => {
        render(<Input aria-label="Subject" aria-invalid />);

        const input = screen.getByRole('textbox', { name: 'Subject' });

        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveClass(
            'aria-invalid:border-danger',
            'aria-invalid:outline-danger',
        );
    });

    it('renders disabled at 60% opacity and refuses input', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<Input aria-label="Subject" disabled onChange={onChange} />);

        const input = screen.getByRole('textbox', { name: 'Subject' });
        await user.type(input, 'anon');

        expect(input).toBeDisabled();
        expect(onChange).not.toHaveBeenCalled();
        expect(input).toHaveClass(
            'disabled:opacity-60',
            'disabled:cursor-not-allowed',
        );
    });

    it('forwards type and merges consumer classes', () => {
        render(
            <Input aria-label="Password" type="password" className="pe-10" />,
        );

        const input = screen.getByLabelText('Password');

        expect(input).toHaveAttribute('type', 'password');
        expect(input).toHaveClass('pe-10');
    });
});
