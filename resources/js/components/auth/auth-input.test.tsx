import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtSign } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { AuthInput, AuthPasswordInput } from '@/components/auth/auth-input';
import { FormField } from '@/components/clover/form-field';

describe('AuthInput', () => {
    it('takes the label, id and error wiring FormField hands it', () => {
        render(
            <FormField
                label="Email address"
                error="Enter an email address."
                id="email"
            >
                <AuthInput icon={AtSign} type="email" name="email" />
            </FormField>,
        );

        const control = screen.getByLabelText('Email address');

        expect(control).toHaveAttribute('id', 'email');
        expect(control).toHaveAttribute('name', 'email');
        expect(control).toHaveAttribute('aria-invalid', 'true');
        expect(control.getAttribute('aria-describedby')).toContain(
            'email-error',
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Enter an email address.',
        );
    });

    /**
     * The leading glyph repeats what the label already says. Exposing it would
     * make a screen reader announce the field twice.
     */
    it('hides its leading glyph from assistive technology', () => {
        const { container } = render(
            <AuthInput icon={AtSign} aria-label="Email address" />,
        );

        const glyph = container.querySelector('[data-slot="auth-input-icon"]');

        expect(glyph).not.toBeNull();
        expect(glyph).toHaveAttribute('aria-hidden', 'true');
    });

    it('accepts a typed value', async () => {
        const user = userEvent.setup();

        render(<AuthInput icon={AtSign} aria-label="Email address" />);

        await user.type(screen.getByLabelText('Email address'), 'anon@clover');

        expect(screen.getByLabelText('Email address')).toHaveValue(
            'anon@clover',
        );
    });
});

describe('AuthPasswordInput', () => {
    it('masks its value until the reveal control is pressed', async () => {
        const user = userEvent.setup();

        render(
            <FormField label="Password" id="password">
                <AuthPasswordInput name="password" />
            </FormField>,
        );

        const control = screen.getByLabelText('Password');

        expect(control).toHaveAttribute('type', 'password');

        await user.click(screen.getByRole('button', { name: 'Show password' }));

        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'type',
            'text',
        );
        expect(
            screen.getByRole('button', { name: 'Hide password' }),
        ).toBeInTheDocument();
    });

    it('carries the FormField wiring through to the real input', () => {
        render(
            <FormField label="Password" error="Password is required.">
                <AuthPasswordInput name="password" />
            </FormField>,
        );

        const control = screen.getByLabelText('Password');

        expect(control).toHaveAttribute('name', 'password');
        expect(control).toHaveAttribute('aria-invalid', 'true');
    });
});
