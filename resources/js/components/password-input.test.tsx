import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PasswordInput from '@/components/password-input';

describe('PasswordInput', () => {
    it('masks the value until the anon asks to see it', () => {
        render(<PasswordInput aria-label="Password" />);

        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'type',
            'password',
        );
    });

    it('reveals and re-masks the value', async () => {
        const user = userEvent.setup();
        render(<PasswordInput aria-label="Password" />);

        await user.click(screen.getByRole('button', { name: 'Show password' }));
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'type',
            'text',
        );

        await user.click(screen.getByRole('button', { name: 'Hide password' }));
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'type',
            'password',
        );
    });

    /**
     * The toggle used to carry `tabIndex={-1}`, which put it outside the tab
     * order entirely: an anon on a keyboard could never reach it, and the
     * `focus-visible:ring` styling it carries could never fire. Anyone who
     * cannot use a mouse is exactly who needs to check what they typed.
     */
    it('is reachable by keyboard from the field it belongs to', async () => {
        const user = userEvent.setup();
        render(<PasswordInput aria-label="Password" />);

        screen.getByLabelText('Password').focus();
        await user.tab();

        expect(
            screen.getByRole('button', { name: 'Show password' }),
        ).toHaveFocus();
    });

    it('can be operated entirely by keyboard', async () => {
        const user = userEvent.setup();
        render(<PasswordInput aria-label="Password" />);

        screen.getByLabelText('Password').focus();
        await user.tab();
        await user.keyboard('{Enter}');

        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'type',
            'text',
        );
    });

    /**
     * The button is a toggle, so it reports its state rather than relying on
     * the label swap alone.
     */
    it('reports its pressed state', async () => {
        const user = userEvent.setup();
        render(<PasswordInput aria-label="Password" />);

        const toggle = screen.getByRole('button', { name: 'Show password' });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');

        await user.click(toggle);
        expect(
            screen.getByRole('button', { name: 'Hide password' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });
});
