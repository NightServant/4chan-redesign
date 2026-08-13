import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AnonBanner } from '@/components/feed/anon-banner';

/**
 * `Link` is replaced with a plain anchor so the DOM stays queryable by role
 * without a real Inertia router context. See `thread-card.test.tsx` for the
 * same pattern.
 */
vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    } & Record<string, unknown>) => {
        const url = typeof href === 'string' ? href : href.url;

        return (
            <a href={url} {...props}>
                {children}
            </a>
        );
    },
}));

describe('AnonBanner', () => {
    it('states the anonymous-browsing copy verbatim', () => {
        render(<AnonBanner />);

        expect(
            screen.getByText(
                'You are browsing anonymously. Reading is open to everyone, posting and commenting need an account.',
            ),
        ).toBeInTheDocument();
    });

    it('never uses an em dash or a double hyphen in its copy', () => {
        const { container } = render(<AnonBanner />);

        expect(container.textContent).not.toMatch(/—|--/);
    });

    it('points "Log in" at the login route', () => {
        render(<AnonBanner />);

        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
            'href',
            '/login',
        );
    });

    it('points "Create account" at the register route', () => {
        render(<AnonBanner />);

        expect(
            screen.getByRole('link', { name: 'Create account' }),
        ).toHaveAttribute('href', '/register');
    });
});
