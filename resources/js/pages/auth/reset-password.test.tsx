import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPassword from '@/pages/auth/reset-password';

const { formState } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
    },
}));

vi.mock('@inertiajs/react', () => ({
    /* `PageMeta` reads the shared `appUrl` to build an absolute `og:url`, and
       renders its tags inside `Head`. Neither shows up in the DOM these tests
       query; the mock exists so the component can mount. */
    usePage: () => ({ props: { appUrl: 'https://clover.test' }, url: '/' }),
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
        <form action={action} data-method={method}>
            {children(formState)}
        </form>
    ),
}));

const props = {
    token: 'reset-token',
    email: 'anon@clover.test',
    passwordRules: 'minlength: 8;',
};

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
});

describe('ResetPassword page', () => {
    it('posts to the password update route', () => {
        const { container } = render(<ResetPassword {...props} />);

        const form = container.querySelector('form');

        expect(form).toHaveAttribute('action', '/reset-password');
        expect(form).toHaveAttribute('data-method', 'post');
    });

    /**
     * The address is fixed by the signed link. Showing it confirms which
     * account is being reset; leaving it editable would let it disagree with
     * the token and fail server-side for no visible reason.
     */
    it('shows the address from the reset link and will not let it be edited', () => {
        render(<ResetPassword {...props} />);

        const email = screen.getByLabelText('Email address');

        expect(email).toHaveValue('anon@clover.test');
        expect(email).toHaveAttribute('readonly');
    });

    it('asks for the new password twice under the names the backend expects', () => {
        render(<ResetPassword {...props} />);

        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'name',
            'password',
        );
        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'name',
            'password_confirmation',
        );
    });

    it('keeps the submit hook the feature tests select on', () => {
        render(<ResetPassword {...props} />);

        expect(
            screen.getByRole('button', { name: 'Reset password' }),
        ).toHaveAttribute('data-test', 'reset-password-button');
    });

    it('reports a rejected password against the control it belongs to', () => {
        formState.errors = { password: 'That password is too short.' };

        render(<ResetPassword {...props} />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That password is too short.',
        );
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });
});
