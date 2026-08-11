import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VerifyEmail from '@/pages/auth/verify-email';

const { formState } = vi.hoisted(() => ({
    formState: {
        processing: false,
        errors: {} as Record<string, string>,
    },
}));

vi.mock('@inertiajs/react', () => ({
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
});

describe('VerifyEmail page', () => {
    it('posts to the verification notification route', () => {
        const { container } = render(<VerifyEmail />);

        const form = container.querySelector('form');

        expect(form).toHaveAttribute(
            'action',
            '/email/verification-notification',
        );
        expect(form).toHaveAttribute('data-method', 'post');
    });

    it('offers to send the link again', () => {
        render(<VerifyEmail />);

        expect(
            screen.getByRole('button', { name: 'Resend verification email' }),
        ).toBeInTheDocument();
    });

    it('confirms only once a link has actually been sent', () => {
        render(<VerifyEmail />);

        expect(screen.queryByRole('status')).toBe(null);

        render(<VerifyEmail status="verification-link-sent" />);

        expect(screen.getByRole('status')).toHaveTextContent(
            /new verification link/i,
        );
    });

    it('offers a way out for an anon signed in to the wrong account', () => {
        render(<VerifyEmail />);

        expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute(
            'href',
            '/logout',
        );
    });
});
