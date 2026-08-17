import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtSign } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthInput, AuthPasswordInput } from '@/components/auth/auth-input';
import { FormField } from '@/components/clover/form-field';

/**
 * `useIsMobile` reads a real `matchMedia`, which jsdom does not implement.
 * Same stub as `account/edit-profile-dialog.test.tsx`.
 */
function setViewport(isMobile: boolean): void {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: isMobile,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

beforeEach(() => {
    setViewport(false);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

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

/**
 * Task 13, fix 2. At 320px the auth card gave a password field about 112px of
 * room for its placeholder text, and the browser clips a placeholder with no
 * ellipsis: sign-in showed `email@example.con` with the last character cut,
 * register showed `email@example.cc` and, worse, `Confirm passw`. A control
 * that reads as broken rather than as truncated.
 *
 * Shortened at small widths rather than shrunk: every text control in this
 * application steps up to 16px below `md` precisely so iOS does not zoom the
 * viewport on focus (`ui/mobile-text-size.test.tsx`), so bringing the type size
 * down here would trade one bug for that one. An ellipsis was ruled out — it
 * disguises the clipping instead of removing it.
 *
 * Swapped in JavaScript on `useIsMobile`, not with a CSS ghost span: this
 * component's own history includes a `before:content-['Search']` overlay that
 * looked like a placeholder and was not one, and it was removed for that.
 */
describe('placeholders at small widths', () => {
    it('uses the short placeholder below `md`', () => {
        setViewport(true);

        render(
            <AuthInput
                icon={AtSign}
                aria-label="Email address"
                placeholder="email@example.com"
                shortPlaceholder="you@site.com"
            />,
        );

        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'placeholder',
            'you@site.com',
        );
    });

    it('uses the full placeholder at `md` and up', () => {
        render(
            <AuthInput
                icon={AtSign}
                aria-label="Email address"
                placeholder="email@example.com"
                shortPlaceholder="you@site.com"
            />,
        );

        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'placeholder',
            'email@example.com',
        );
    });

    /** A placeholder that already fits needs no second copy of itself. */
    it('keeps the only placeholder it was given when there is no short form', () => {
        setViewport(true);

        render(
            <AuthInput
                icon={AtSign}
                aria-label="Email address"
                placeholder="Password"
            />,
        );

        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'placeholder',
            'Password',
        );
    });

    /** The password field is where the longest of them all lives. */
    it('shortens the password field the same way', () => {
        setViewport(true);

        render(
            <FormField label="Confirm password" id="password_confirmation">
                <AuthPasswordInput
                    name="password_confirmation"
                    placeholder="Confirm password"
                    shortPlaceholder="Confirm"
                />
            </FormField>,
        );

        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'placeholder',
            'Confirm',
        );
    });

    it('leaves the password fields full placeholder alone at `md` and up', () => {
        render(
            <FormField label="Confirm password" id="password_confirmation">
                <AuthPasswordInput
                    name="password_confirmation"
                    placeholder="Confirm password"
                    shortPlaceholder="Confirm"
                />
            </FormField>,
        );

        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'placeholder',
            'Confirm password',
        );
    });
});
