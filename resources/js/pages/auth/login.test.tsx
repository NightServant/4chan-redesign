import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '@/pages/auth/login';

const { formState } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
    },
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { visit: vi.fn() },
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
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

vi.mock('@laravel/passkeys/react', () => ({
    usePasskeyVerify: () => ({
        verify: vi.fn(),
        isLoading: false,
        error: null,
        isSupported: true,
    }),
}));

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
});

describe('Login page', () => {
    it('posts to the login route Fortify listens on', () => {
        const { container } = render(<Login canResetPassword />);

        const form = container.querySelector('form');

        expect(form).toHaveAttribute('action', '/login');
        expect(form).toHaveAttribute('data-method', 'post');
    });

    it('keeps the credential field names the backend expects', () => {
        render(<Login canResetPassword />);

        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'name',
            'email',
        );
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'name',
            'password',
        );
    });

    it('keeps the submit hook the feature tests select on', () => {
        render(<Login canResetPassword />);

        expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute(
            'data-test',
            'login-button',
        );
    });

    it('offers the passkey route alongside the password one', () => {
        render(<Login canResetPassword />);

        expect(
            screen.getByRole('button', { name: 'Sign in with a passkey' }),
        ).toBeInTheDocument();
    });

    it('offers remember me and the reset link together', () => {
        render(<Login canResetPassword />);

        expect(screen.getByLabelText('Remember me')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Forgot password?' }),
        ).toHaveAttribute('href', '/forgot-password');
    });

    it('drops the reset link when password reset is switched off', () => {
        render(<Login canResetPassword={false} />);

        expect(screen.queryByRole('link', { name: 'Forgot password?' })).toBe(
            null,
        );
    });

    it('reports a rejected credential against the field it belongs to', () => {
        formState.errors = { email: 'These credentials do not match.' };

        render(<Login canResetPassword />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'These credentials do not match.',
        );
        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('says what it is doing while the request is in flight', () => {
        formState.processing = true;

        render(<Login canResetPassword />);

        const submit = screen.getByRole('button', { name: /Signing in/ });

        expect(submit).toBeDisabled();
    });

    it('sends an anon without an account to registration', () => {
        render(<Login canResetPassword />);

        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toHaveAttribute('href', '/register');
    });

    it('surfaces the flashed status message', () => {
        render(
            <Login canResetPassword status="Your password has been reset." />,
        );

        expect(
            screen.getByText('Your password has been reset.'),
        ).toBeInTheDocument();
    });

    it('names the page for the layout', () => {
        expect(Login.layout).toEqual({
            title: 'Welcome back',
            description: 'Sign in to continue your Clover experience.',
        });
    });
});
