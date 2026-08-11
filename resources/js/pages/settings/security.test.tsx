import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Security from '@/pages/settings/security';

/**
 * The two security surfaces are stubbed: they own their own suites, and what
 * this page is responsible for is the panels around them and the gating that
 * decides whether they appear at all.
 */
const { formState } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
    },
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Form: ({
        children,
        action,
        method,
    }: {
        children: (state: typeof formState) => ReactNode;
        action?: string;
        method?: string;
    } & Record<string, unknown>) => (
        <form action={action} method={method}>
            {children(formState)}
        </form>
    ),
}));

vi.mock('@/components/manage-two-factor', () => ({
    default: () => <div data-testid="manage-two-factor" />,
}));

vi.mock('@/components/manage-passkeys', () => ({
    default: () => <div data-testid="manage-passkeys" />,
}));

const BASE_PROPS = {
    passwordRules: 'minlength: 8;',
    canManageTwoFactor: true,
    requiresConfirmation: true,
    twoFactorEnabled: false,
    canManagePasskeys: true,
    passkeys: [],
};

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
});

describe('Security settings', () => {
    it('never renders its own h1, because the layout supplies one', () => {
        render(<Security {...BASE_PROPS} />);

        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it('renders a landmark for each security region', () => {
        render(<Security {...BASE_PROPS} />);

        expect(
            screen.getByRole('region', { name: 'Password' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Two-factor authentication' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Passkeys' }),
        ).toBeInTheDocument();
    });

    it('labels all three password controls', () => {
        render(<Security {...BASE_PROPS} />);

        expect(screen.getByLabelText('Current password')).toBeInTheDocument();
        expect(screen.getByLabelText('New password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    });

    it('keeps the name attributes the password request is built from', () => {
        render(<Security {...BASE_PROPS} />);

        expect(screen.getByLabelText('Current password')).toHaveAttribute(
            'name',
            'current_password',
        );
        expect(screen.getByLabelText('New password')).toHaveAttribute(
            'name',
            'password',
        );
        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'name',
            'password_confirmation',
        );
    });

    it('passes the server password rules to both new-password controls', () => {
        render(<Security {...BASE_PROPS} />);

        expect(screen.getByLabelText('New password')).toHaveAttribute(
            'passwordrules',
            'minlength: 8;',
        );
        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'passwordrules',
            'minlength: 8;',
        );
    });

    it('announces a wrong current password against its control', () => {
        formState.errors = {
            current_password: 'The password is incorrect.',
        };

        render(<Security {...BASE_PROPS} />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'The password is incorrect.',
        );
        expect(screen.getByLabelText('Current password')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('keeps the save button hook and disables it while the form is in flight', () => {
        formState.processing = true;

        render(<Security {...BASE_PROPS} />);

        const save = screen.getByRole('button', { name: 'Save' });

        expect(save).toHaveAttribute('data-test', 'update-password-button');
        expect(save).toBeDisabled();
    });

    it('drops the two-factor panel when the feature is unavailable', () => {
        render(<Security {...BASE_PROPS} canManageTwoFactor={false} />);

        expect(
            screen.queryByRole('region', {
                name: 'Two-factor authentication',
            }),
        ).toBeNull();
        expect(screen.queryByTestId('manage-two-factor')).toBeNull();
    });

    it('drops the passkeys panel when the feature is unavailable', () => {
        render(<Security {...BASE_PROPS} canManagePasskeys={false} />);

        expect(screen.queryByRole('region', { name: 'Passkeys' })).toBeNull();
        expect(screen.queryByTestId('manage-passkeys')).toBeNull();
    });
});
