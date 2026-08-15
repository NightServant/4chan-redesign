import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPassword from '@/pages/auth/forgot-password';

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

beforeEach(() => {
    formState.processing = false;
    formState.errors = {};
});

describe('ForgotPassword page', () => {
    it('posts to the reset-link route', () => {
        const { container } = render(<ForgotPassword />);

        const form = container.querySelector('form');

        expect(form).toHaveAttribute('action', '/forgot-password');
        expect(form).toHaveAttribute('data-method', 'post');
    });

    it('asks for the email address under that name', () => {
        render(<ForgotPassword />);

        expect(screen.getByLabelText('Email address')).toHaveAttribute(
            'name',
            'email',
        );
    });

    it('keeps the submit hook the feature tests select on', () => {
        render(<ForgotPassword />);

        expect(
            screen.getByRole('button', { name: 'Email password reset link' }),
        ).toHaveAttribute('data-test', 'email-password-reset-link-button');
    });

    it('surfaces the flashed status message', () => {
        render(<ForgotPassword status="A reset link is on its way." />);

        expect(
            screen.getByText('A reset link is on its way.'),
        ).toBeInTheDocument();
    });

    it('reports a rejected address against the field', () => {
        formState.errors = { email: 'No account uses that address.' };

        render(<ForgotPassword />);

        expect(screen.getByRole('alert')).toHaveTextContent(
            'No account uses that address.',
        );
    });

    it('offers a way back to the sign-in screen', () => {
        render(<ForgotPassword />);

        expect(screen.getByRole('link', { name: 'sign in' })).toHaveAttribute(
            'href',
            '/login',
        );
    });
});
