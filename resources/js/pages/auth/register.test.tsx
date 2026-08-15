import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from '@/pages/auth/register';

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

const PASSWORD_RULES = 'minlength: 8;';

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
});

describe('Register page', () => {
    it('posts to the registration route', () => {
        const { container } = render(
            <Register passwordRules={PASSWORD_RULES} />,
        );

        const form = container.querySelector('form');

        expect(form).toHaveAttribute('action', '/register');
        expect(form).toHaveAttribute('data-method', 'post');
    });

    it('keeps every field name Fortify validates', () => {
        render(<Register passwordRules={PASSWORD_RULES} />);

        expect(screen.getByLabelText('Name')).toHaveAttribute('name', 'name');
        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'name',
            'email',
        );
        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'name',
            'password',
        );
        expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
            'name',
            'password_confirmation',
        );
    });

    it('passes the server password rules to the browser generator', () => {
        render(<Register passwordRules={PASSWORD_RULES} />);

        expect(screen.getByLabelText('Password')).toHaveAttribute(
            'passwordrules',
            PASSWORD_RULES,
        );
    });

    it('keeps the submit hook the feature tests select on', () => {
        render(<Register passwordRules={PASSWORD_RULES} />);

        expect(
            screen.getByRole('button', { name: 'Create account' }),
        ).toHaveAttribute('data-test', 'register-user-button');
    });

    it('says what it is doing while the request is in flight', () => {
        formState.processing = true;

        render(<Register passwordRules={PASSWORD_RULES} />);

        expect(
            screen.getByRole('button', { name: /Creating account/ }),
        ).toBeDisabled();
    });

    it('reports a rejected field against the control it belongs to', () => {
        formState.errors = { email: 'That email is already taken.' };

        render(<Register passwordRules={PASSWORD_RULES} />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That email is already taken.',
        );
        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('sends a returning anon to the sign-in screen', () => {
        render(<Register passwordRules={PASSWORD_RULES} />);

        expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
            'href',
            '/login',
        );
    });

    it('names the page for the layout', () => {
        expect(Register.layout).toEqual({
            title: 'Create your Clover account',
            description: 'Join the modern anonymous discussion platform.',
        });
    });
});
