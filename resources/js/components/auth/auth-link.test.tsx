import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthLink } from '@/components/auth/auth-link';

vi.mock('@inertiajs/react', () => ({
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
}));

describe('AuthLink', () => {
    it('renders a real link to the destination it is given', () => {
        render(<AuthLink href="/register">Create account</AuthLink>);

        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toHaveAttribute('href', '/register');
    });

    /**
     * Wayfinder helpers return `{ url, method }` objects rather than strings,
     * and every auth destination is imported that way.
     */
    it('accepts a Wayfinder route object', () => {
        render(
            <AuthLink href={{ url: '/logout', method: 'post' }}>
                Sign out
            </AuthLink>,
        );

        expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute(
            'href',
            '/logout',
        );
    });
});
